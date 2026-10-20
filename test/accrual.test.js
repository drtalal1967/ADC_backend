const { test, beforeEach, after } = require('node:test');
const assert = require('node:assert/strict');
const { execFile } = require('node:child_process');
const { promisify } = require('node:util');
const path = require('node:path');
const db = require('./synthetic-db')();
const { createMonthlyAccrual, monthOf } = require('../src/services/monthlyAccrual.service');
const november = '2026-10-31T21:00:00.000Z';
const runAt = (date, client = db) => createMonthlyAccrual(client, { clock: async () => new Date(date) })();
let serial = 0;
async function employee(status = 'ACTIVE', employmentType = 'FULL_TIME') {
  return db.employee.create({ data: {
    firstName: 'Synthetic', lastName: 'Test', status, employmentType,
    joiningDate: new Date('2020-01-01T00:00:00Z'),
    user: { create: { email: `synthetic-${++serial}@example.invalid`, passwordHash: 'not-a-real-password' } },
  } });
}
async function balance(employeeId, remaining = -8, year = 2026, leaveType = 'ANNUAL') {
  return db.leaveBalance.create({ data: {
    employeeId, year, leaveType, totalAllotted: 12, totalUsed: 20, totalRemaining: remaining,
  } });
}
beforeEach(async () => {
  await db.annualLeaveCredit.deleteMany();
  await db.leaveBalance.deleteMany();
  await db.employee.deleteMany();
  await db.user.deleteMany();
});
after(() => db.$disconnect());

test('Bahrain boundary is independent of host timezone; early calls preserve all balances', async () => {
  const emp = await employee();
  const original = await balance(emp.id);
  for (const date of ['2025-11-01T00:00:00Z', '2026-10-01T00:00:00Z', '2026-10-31T20:59:59.999Z']) {
    assert.equal((await runAt(date)).skipped, 'before-start');
  }
  assert.deepEqual(await db.leaveBalance.findUnique({ where: { id: original.id } }), original);
  assert.equal(await db.annualLeaveCredit.count(), 0);
  assert.equal(monthOf(new Date(november)), '2026-11');
  assert.equal((await runAt(november)).credited, 1);
  const actual = await db.leaveBalance.findUnique({ where: { id: original.id } });
  assert.equal(actual.totalAllotted, 14.5);
  assert.equal(actual.totalUsed, 20);
  assert.equal(actual.totalRemaining, -5.5);
});

test('eight independent processes and timezones credit existing and missing balances exactly once', async () => {
  const a = await employee(); const b = await employee(); await balance(a.id);
  const results = await Promise.all(Array.from({ length: 8 }, (_, i) => promisify(execFile)(
    process.execPath, [path.join(__dirname, 'accrual-worker.js'), november],
    { env: { ...process.env, TZ: ['UTC', 'Asia/Bahrain', 'America/Los_Angeles', 'Pacific/Auckland'][i % 4] } },
  )));
  assert.equal(results.reduce((n, r) => n + JSON.parse(r.stdout).credited, 0), 2);
  assert.equal(await db.annualLeaveCredit.count(), 2);
  const rows = await db.leaveBalance.findMany({ orderBy: { employeeId: 'asc' } });
  assert.equal(rows.find(r => r.employeeId === a.id).totalRemaining, -5.5);
  assert.equal(rows.find(r => r.employeeId === b.id).totalRemaining, 2.5);
  assert.equal((await runAt('2026-11-29T00:00:00Z')).alreadyCredited, 2);
});

test('only active full-time employees receive credits; unrelated balances remain byte-for-byte equal', async () => {
  const a = await employee(); await employee('INACTIVE'); await employee('ACTIVE', 'PART_TIME');
  const sick = await balance(a.id, 7, 2026, 'SICK');
  const prior = await balance(a.id, -10, 2025);
  assert.equal((await runAt(november)).credited, 1);
  assert.deepEqual(await db.leaveBalance.findUnique({ where: { id: sick.id } }), sick);
  assert.deepEqual(await db.leaveBalance.findUnique({ where: { id: prior.id } }), prior);
});

test('a failure after inserting ledger rolls back ledger and balance; retry succeeds once', async () => {
  const emp = await employee(); const original = await balance(emp.id);
  const broken = { employee: db.employee };
  broken.$transaction = (fn, options) => db.$transaction(tx => fn(new Proxy(tx, {
    get(target, prop) {
      if (prop === 'leaveBalance') return { upsert: async () => { throw new Error('synthetic failure'); } };
      return target[prop];
    },
  })), options);
  await assert.rejects(runAt(november, broken), /synthetic failure/);
  assert.equal(await db.annualLeaveCredit.count(), 0);
  assert.deepEqual(await db.leaveBalance.findUnique({ where: { id: original.id } }), original);
  assert.equal((await runAt(november)).credited, 1);
  assert.equal((await runAt(november)).alreadyCredited, 1);
});

test('transient transaction conflicts retry, and retries are bounded', async () => {
  await employee(); let attempts = 0;
  const flaky = { employee: db.employee };
  flaky.$transaction = (...args) => {
    if (++attempts < 3) return Promise.reject(Object.assign(new Error('synthetic deadlock'), { code: 'P2034' }));
    return db.$transaction(...args);
  };
  assert.equal((await runAt(november, flaky)).credited, 1); assert.equal(attempts, 3);
  attempts = 0;
  flaky.$transaction = () => { attempts++; return Promise.reject(Object.assign(new Error('persistent'), { code: 'P2034' })); };
  await assert.rejects(runAt(november, flaky), /persistent/); assert.equal(attempts, 5);
});

test('database unique constraint rejects a duplicate employee/month', async () => {
  const emp = await employee(); await runAt(november);
  await assert.rejects(db.annualLeaveCredit.create({ data: { employeeId: emp.id, month: '2026-11', days: 2.5 } }), { code: 'P2002' });
  assert.equal(await db.annualLeaveCredit.count(), 1);
});

test('December and January only credit their current month; missed November is never backfilled', async () => {
  const emp = await employee(); const original = await balance(emp.id);
  assert.equal((await runAt('2026-11-30T21:00:00Z')).credited, 1);
  assert.equal((await runAt('2026-12-31T21:00:00Z')).credited, 1);
  assert.deepEqual((await db.annualLeaveCredit.findMany({ orderBy: { month: 'asc' } })).map(r => r.month), ['2026-12', '2027-01']);
  assert.equal((await db.leaveBalance.findUnique({ where: { id: original.id } })).totalRemaining, -5.5);
  assert.equal((await db.leaveBalance.findFirst({ where: { employeeId: emp.id, year: 2027 } })).totalRemaining, 2.5);
});

test('a worker delayed into a new month does not credit the old month', async () => {
  await employee(); let calls = 0;
  const result = await createMonthlyAccrual(db, { clock: async () => new Date(++calls === 1 ? november : '2026-11-30T21:00:00Z') })();
  assert.equal(result.expired, 1); assert.equal(await db.annualLeaveCredit.count(), 0);
});

test('eligibility is rechecked inside the employee transaction', async () => {
  const emp = await employee(); let calls = 0;
  const changed = { employee: db.employee };
  changed.$transaction = async (...args) => {
    if (++calls === 1) await db.employee.update({ where: { id: emp.id }, data: { employmentType: 'PART_TIME' } });
    return db.$transaction(...args);
  };
  assert.equal((await runAt(november, changed)).ineligible, 1);
  assert.equal(await db.annualLeaveCredit.count(), 0);
});

test('production clock path uses database UTC time and refuses early credits', async () => {
  await employee();
  const [row] = await db.$queryRaw`SELECT UTC_TIMESTAMP(3) AS nowUtc`;
  if (monthOf(row.nowUtc) < '2026-11') {
    assert.equal((await createMonthlyAccrual(db)()).skipped, 'before-start');
    assert.equal(await db.annualLeaveCredit.count(), 0);
  } else {
    assert.equal((await createMonthlyAccrual(db)()).month, monthOf(row.nowUtc));
  }
});

test('a failed batch preserves earlier commits and a later retry finishes only missing employees', async () => {
  await employee(); const second = await employee();
  const broken = { employee: db.employee, $transaction: (fn, options) => db.$transaction(tx => fn(new Proxy(tx, {
    get(target, prop) {
      if (prop === 'leaveBalance') return { upsert: async args => {
        if (args.create.employeeId === second.id) throw new Error('second employee failed');
        return target.leaveBalance.upsert(args);
      } };
      return target[prop];
    },
  })), options) };
  await assert.rejects(runAt(november, broken), /second employee failed/);
  assert.equal(await db.annualLeaveCredit.count(), 1);
  const retry = await runAt(november);
  assert.equal(retry.credited, 1); assert.equal(retry.alreadyCredited, 1);
});

test('lost acknowledgement after commit is safe on replay', async () => {
  await employee();
  const lostReply = { employee: db.employee, $transaction: async (...args) => {
    await db.$transaction(...args);
    throw new Error('synthetic connection lost after commit');
  } };
  await assert.rejects(runAt(november, lostReply), /connection lost/);
  assert.equal((await runAt(november)).alreadyCredited, 1);
  assert.equal((await db.leaveBalance.findFirst()).totalRemaining, 2.5);
});

test('concurrent atomic leave deductions and accrual do not lose either update', async () => {
  const emp = await employee(); const original = await balance(emp.id);
  await Promise.all([
    runAt(november),
    db.leaveBalance.update({ where: { id: original.id }, data: {
      totalUsed: { increment: 3 }, totalRemaining: { decrement: 3 },
    } }),
  ]);
  const actual = await db.leaveBalance.findUnique({ where: { id: original.id } });
  assert.equal(actual.totalAllotted, 14.5); assert.equal(actual.totalUsed, 23);
  assert.equal(actual.totalRemaining, -8.5);
});

test('application entry point defaults to disabled even when passed a future date', async () => {
  const service = path.join(__dirname, '../src/services/leave.service.js');
  const script = `require(${JSON.stringify(service)}).runMonthlyAutoUpdate(new Date('2099-01-01')).then(r => { console.log(JSON.stringify(r)); process.exit(0); })`;
  const { stdout } = await promisify(execFile)(process.execPath, ['-e', script], {
    env: { ...process.env, ANNUAL_ACCRUAL_ENABLED: '', DATABASE_URL: process.env.ACCRUAL_TEST_DATABASE_URL },
  });
  assert.ok(stdout.includes('"skipped":"disabled"'));
  assert.equal(await db.annualLeaveCredit.count(), 0);
});

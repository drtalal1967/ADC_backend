const test = require('node:test');
const assert = require('node:assert/strict');
const { getScheduleAbsences } = require('../src/services/scheduleAvailability.service');

test('returns approved absences for all employees with only safe fields', async () => {
  let query;
  const prisma = { leaveRequest: { findMany: async args => {
    query = args;
    return [10, 20].map(id => ({
      id, employeeId: id, startDate: new Date('2026-10-30'), endDate: new Date('2026-11-05'),
      reason: 'PRIVATE', leaveType: 'SICK', documents: ['PRIVATE'],
      employee: { id, firstName: 'Test', lastName: String(id), branch: 'Test', scheduleColor: 'sky', basicSalary: 'PRIVATE' },
    }));
  } } };
  const result = await getScheduleAbsences(prisma, { start: '2026-11-01', end: '2026-11-03', employeeId: 10 });
  assert.equal(result.length, 2);
  assert.equal(query.where.status, 'APPROVED');
  assert.equal(query.where.employeeId, undefined);
  assert.equal(query.where.startDate.lte.toISOString(), '2026-11-03T00:00:00.000Z');
  assert.equal(query.where.endDate.gte.toISOString(), '2026-11-01T00:00:00.000Z');
  assert.deepEqual(Object.keys(query.select).sort(), ['employee', 'employeeId', 'endDate', 'id', 'startDate']);
  assert.equal(result[0].startDate, '2026-11-01');
  assert.equal(result[0].endDate, '2026-11-03');
  assert.ok(!JSON.stringify(result).includes('PRIVATE'));
  assert.equal(result[0].leaveType, undefined);
});

test('invalid or unbounded ranges fail before any database query', async () => {
  const prisma = { leaveRequest: { findMany: () => assert.fail('must not query') } };
  for (const range of [{}, { start: '2026-02-30', end: '2026-03-01' },
    { start: '2026-11-02', end: '2026-11-01' }, { start: '2025-01-01', end: '2026-11-01' }]) {
    await assert.rejects(getScheduleAbsences(prisma, range), { statusCode: 400 });
  }
});

test('date-only response is stable across timezone settings and includes a single day', async () => {
  const prisma = { leaveRequest: { findMany: async () => [{ id: 1, employeeId: 1,
    startDate: new Date('2026-11-01'), endDate: new Date('2026-11-01'), employee: null }] } };
  for (const tz of ['UTC', 'Asia/Bahrain', 'America/Los_Angeles']) {
    const previous = process.env.TZ;
    try {
      process.env.TZ = tz;
      const [result] = await getScheduleAbsences(prisma, { start: '2026-11-01', end: '2026-11-01' });
      assert.equal(result.startDate, '2026-11-01');
      assert.equal(result.endDate, '2026-11-01');
    } finally {
      if (previous === undefined) delete process.env.TZ; else process.env.TZ = previous;
    }
  }
});

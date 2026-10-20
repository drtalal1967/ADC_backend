'use strict';

const FIRST_MONTH = '2026-11';
const DAYS = 2.5;
const formatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Bahrain', year: 'numeric', month: '2-digit',
});

function monthOf(date) {
  const parts = formatter.formatToParts(date);
  return `${parts.find(p => p.type === 'year').value}-${parts.find(p => p.type === 'month').value}`;
}

// Production uses the database clock, not an HTTP parameter or the host timezone.
async function databaseNow(db) {
  const [row] = await db.$queryRaw`SELECT UTC_TIMESTAMP(3) AS nowUtc`;
  return row.nowUtc;
}

// Clock injection is for isolated tests only. The application uses databaseNow.
function createMonthlyAccrual(db, { clock = databaseNow } = {}) {
  return async function run() {
    const month = monthOf(await clock(db));
    const result = { month, credited: 0, alreadyCredited: 0, ineligible: 0, expired: 0 };
    if (month < FIRST_MONTH) return { ...result, skipped: 'before-start' };

    const employees = await db.employee.findMany({
      where: { status: 'ACTIVE', employmentType: 'FULL_TIME' },
      select: { id: true }, orderBy: { id: 'asc' },
    });
    for (const { id: employeeId } of employees) {
      for (let attempt = 0; ; attempt++) {
        try {
          const outcome = await db.$transaction(async tx => {
            // Serialize all accrual workers for this employee, including a missing balance.
            const [employee] = await tx.$queryRaw`
              SELECT id, status, employment_type AS employmentType
              FROM employees WHERE id = ${employeeId} FOR UPDATE`;
            if (!employee || employee.status !== 'ACTIVE' || employee.employmentType !== 'FULL_TIME') {
              return 'ineligible';
            }
            // A delayed retry must never backfill a month that has ended.
            if (monthOf(await clock(tx)) !== month) return 'expired';
            const key = { employeeId, month };
            if (await tx.annualLeaveCredit.findUnique({ where: { employeeId_month: key } })) {
              return 'alreadyCredited';
            }
            await tx.annualLeaveCredit.create({ data: { ...key, days: DAYS } });
            const year = Number(month.slice(0, 4));
            await tx.leaveBalance.upsert({
              where: { employeeId_leaveType_year: { employeeId, leaveType: 'ANNUAL', year } },
              create: { employeeId, leaveType: 'ANNUAL', year, totalAllotted: DAYS, totalRemaining: DAYS },
              update: { totalAllotted: { increment: DAYS }, totalRemaining: { increment: DAYS } },
            });
            return 'credited';
          }, { isolationLevel: 'ReadCommitted', maxWait: 10000, timeout: 10000 });
          result[outcome]++;
          break;
        } catch (error) {
          // Retry a rolled-back transaction, never just the balance write.
          if (!['P2034', 'P2002'].includes(error.code) || attempt >= 4) throw error;
          await new Promise(resolve => setTimeout(resolve, 25 * (2 ** attempt)));
        }
      }
    }
    return result;
  };
}

module.exports = { createMonthlyAccrual, monthOf };

// A separate projection keeps private leave-request fields out of the schedule API.
async function getScheduleAbsences(prisma, { start, end }) {
  const parseDate = value => {
    if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
    const date = new Date(value + 'T00:00:00.000Z');
    return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value ? date : null;
  };
  const first = parseDate(start);
  const last = parseDate(end);
  if (!first || !last || last < first || last - first > 366 * 86400000) {
    const error = new Error('A valid start and end date within one year are required');
    error.statusCode = 400;
    throw error;
  }
  const leaves = await prisma.leaveRequest.findMany({
    where: { status: 'APPROVED', startDate: { lte: last }, endDate: { gte: first } },
    select: {
      id: true, employeeId: true, startDate: true, endDate: true,
      employee: { select: { id: true, firstName: true, lastName: true, branch: true, scheduleColor: true } },
    },
    orderBy: [{ startDate: 'asc' }, { id: 'asc' }],
  });
  return leaves.map(leave => ({
    id: leave.id, employeeId: leave.employeeId,
    startDate: new Date(Math.max(first, leave.startDate)).toISOString().slice(0, 10),
    endDate: new Date(Math.min(last, leave.endDate)).toISOString().slice(0, 10),
    status: 'APPROVED',
    employee: leave.employee ? {
      id: leave.employee.id, firstName: leave.employee.firstName, lastName: leave.employee.lastName,
      branch: leave.employee.branch, scheduleColor: leave.employee.scheduleColor,
    } : null,
  }));
}
module.exports = { getScheduleAbsences };

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const createSchedule = async (scheduleData) => {
  const { employeeId, date, startTime, endTime, ...rest } = scheduleData;
  return await prisma.schedule.create({
    data: {
      ...rest,
      scheduleType: rest.scheduleType || "SHIFT",
      title: rest.title || "Work Shift",
      startTime: new Date(`${date}T${startTime}`),
      endTime: new Date(`${date}T${endTime}`),
      employee: { connect: { id: parseInt(employeeId) } },
    },
  });
};

const createManySchedules = async (batchData) => {
  let initialSchedules = [];

  if (Array.isArray(batchData)) {
    // Handling array of schedule objects (from current frontend)
    initialSchedules = batchData.map(s => ({
      employeeId: parseInt(s.employeeId),
      branch: s.branch,
      scheduleType: "SHIFT",
      title: "Work Shift",
      startTime: new Date(`${s.date}T${s.startTime}`),
      endTime: new Date(`${s.date}T${s.endTime}`),
    }));
  } else {
    // Handling range-based logic (as requested by user)
    const { employeeId, branch, startDate, endDate, selectedDays, startTime, endTime } = batchData;
    const current = new Date(startDate);
    const end = new Date(endDate);
    const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    while (current <= end) {
      const dayName = WEEKDAYS[current.getDay()];
      if (selectedDays.includes(dayName)) {
        const dateStr = current.toISOString().split('T')[0];
        initialSchedules.push({
          employeeId: parseInt(employeeId),
          branch,
          scheduleType: "SHIFT",
          title: "Work Shift",
          startTime: new Date(`${dateStr}T${startTime}`),
          endTime: new Date(`${dateStr}T${endTime}`),
        });
      }
      current.setDate(current.getDate() + 1);
    }
  }

  if (initialSchedules.length === 0) return { count: 0 };

  // PREVENT DUPLICATES: Check for existing schedules at the same time for the same employee
  const employeeIds = [...new Set(initialSchedules.map(s => s.employeeId))];
  const startTimes = initialSchedules.map(s => s.startTime);

  const existing = await prisma.schedule.findMany({
    where: {
      employeeId: { in: employeeIds },
      startTime: { in: startTimes }
    }
  });

  const existingKeys = new Set(existing.map(e => `${e.employeeId}-${e.startTime.getTime()}`));
  const finalToCreate = initialSchedules.filter(s => !existingKeys.has(`${s.employeeId}-${s.startTime.getTime()}`));

  if (finalToCreate.length === 0) return { count: 0 };

  const result = await prisma.schedule.createMany({
    data: finalToCreate
  });

  return { count: result.count };
};

const getSchedules = async (query) => {
  const { start, end, startDate, endDate, employeeId, month } = query;
  const where = {};

  const finalStart = start || startDate;
  const finalEnd = end || endDate;

  if (month) {
    const [year, m] = month.split('-').map(Number);
    const dateStart = new Date(year, m - 1, 1);
    const dateEnd = new Date(year, m, 0, 23, 59, 59); // Last day of month
    where.startTime = {
      gte: dateStart,
      lte: dateEnd,
    };
  } else if (finalStart && finalEnd) {
    where.startTime = {
      gte: new Date(finalStart),
      lte: new Date(finalEnd + 'T23:59:59'),
    };
  }

  if (employeeId) {
    where.employeeId = parseInt(employeeId);
  }

  return await prisma.schedule.findMany({
    where,
    include: { employee: true },
    orderBy: [
      { createdAt: 'desc' },
      { id: 'desc' }
    ]
  });
};

const updateSchedule = async (id, scheduleData) => {
  const { employeeId, date, startTime, endTime, ...rest } = scheduleData;
  const updateData = { ...rest };

  if (employeeId) updateData.employee = { connect: { id: parseInt(employeeId) } };

  // If date + startTime/endTime are provided, reconstruct them
  if (date && startTime) updateData.startTime = new Date(`${date}T${startTime}`);
  else if (startTime) updateData.startTime = new Date(startTime);

  if (date && endTime) updateData.endTime = new Date(`${date}T${endTime}`);
  else if (endTime) updateData.endTime = new Date(endTime);

  if (rest.branch) updateData.branch = rest.branch;

  return await prisma.schedule.update({
    where: { id: parseInt(id) },
    data: updateData,
  });
};

const deleteSchedule = async (id) => {
  return await prisma.schedule.delete({
    where: { id: parseInt(id) },
  });
};

module.exports = {
  createSchedule,
  createManySchedules,
  getSchedules,
  updateSchedule,
  deleteSchedule,
};

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { sendLeaveRequestSubmittedEmail, sendLeaveStatusEmail } = require('./email.service');

const LEAVE_TYPES = [
  'ANNUAL', 'SICK', 'RELATIVES_DEATH', 'HAJJ', 'MARRIAGE', 'OTHERS',
  'EMERGENCY', 'UNPAID', 'MATERNITY', 'PATERNITY', 'CASUAL'
];

const SICK_LEAVE_YEARLY_DAYS = 15;
const BAHRAIN_TIME_ZONE = 'Asia/Bahrain';

const getBahrainDateParts = (value = new Date()) => {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: BAHRAIN_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(value);

  return {
    year: Number(parts.find(part => part.type === 'year')?.value),
    month: Number(parts.find(part => part.type === 'month')?.value),
    day: Number(parts.find(part => part.type === 'day')?.value),
  };
};

const isLeapYear = (year) => year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);

const isEmploymentAnniversary = (joiningDate, todayParts) => {
  if (!joiningDate || !todayParts?.year) return false;
  const joined = getBahrainDateParts(joiningDate);

  if (joined.month === todayParts.month && joined.day === todayParts.day) return true;

  // Employees who joined on Feb 29 receive the yearly grant on Feb 28 in non-leap years.
  return joined.month === 2 && joined.day === 29 && todayParts.month === 2 && todayParts.day === 28 && !isLeapYear(todayParts.year);
};

const normalizeLeaveDate = (value) => {
  const datePart = String(value || '').slice(0, 10);
  const date = new Date(`${datePart}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime())) throw new Error('Invalid leave date');
  return date;
};

const toDateKey = (value) => value.toISOString().slice(0, 10);

const addUtcDays = (date, days) => {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
};

const countCalendarDaysInclusive = (startDate, endDate) => Math.floor((endDate - startDate) / (1000 * 60 * 60 * 24)) + 1;

const calculateChargeableLeaveDays = async (startDate, endDate, isHalfDay = false) => {
  if (endDate < startDate) throw new Error('End date cannot be before start date');

  const holidays = await prisma.publicHoliday.findMany({
    where: {
      date: {
        gte: startDate,
        lte: endDate,
      },
    },
    select: { date: true },
  });

  const holidayKeys = new Set(holidays.map(holiday => toDateKey(holiday.date)));
  let totalDays = 0;
  for (let cursor = new Date(startDate); cursor <= endDate; cursor = addUtcDays(cursor, 1)) {
    if (!holidayKeys.has(toDateKey(cursor))) totalDays += 1;
  }

  if (isHalfDay && totalDays > 0) {
    totalDays -= 0.5;
  }

  return Math.max(0, totalDays);
};
const pivotBalances = (balances, employee) => {
  const result = {
    employeeId: employee.id,
    employee: {
      id: employee.id,
      firstName: employee.firstName,
      lastName: employee.lastName,
      role: employee.user?.role?.name || 'SECRETARY',
    },
    // Default values
    annual: { total: 30, used: 0, remaining: 30 },
    sick: { total: 15, used: 0, remaining: 15 },
    relativesDeath: { total: 3, used: 0, remaining: 3 },
    hajj: { total: 10, used: 0, remaining: 10 },
    marriage: { total: 15, used: 0, remaining: 15 },
    others: { total: 5, used: 0, remaining: 5 },
    maternity: { total: 60, used: 0, remaining: 60 }
  };

  balances.forEach(b => {
    const type = b.leaveType.toLowerCase().replace(/_([a-z])/g, (g) => g[1].toUpperCase());
    if (result[type] !== undefined || ['emergency', 'unpaid', 'maternity', 'paternity', 'casual'].includes(type)) {
      if (!result[type]) result[type] = {};
      result[type] = {
        total: b.totalAllotted,
        used: b.totalUsed,
        remaining: b.totalRemaining
      };
    }
  });

  return result;
};

const getLeaveBalances = async (year) => {
  const currentYear = parseInt(year) || new Date().getFullYear();
  const employees = await prisma.employee.findMany({ 
    where: { status: 'ACTIVE' },
    include: { user: { include: { role: true } } }
  });
  
  const allBalances = await prisma.leaveBalance.findMany({
    where: { year: currentYear }
  });

  return employees.map(emp => {
    const empBalances = allBalances.filter(b => b.employeeId === emp.id);
    return pivotBalances(empBalances, emp);
  });
};

const getEmployeeBalance = async (employeeId, year) => {
  const currentYear = parseInt(year) || new Date().getFullYear();
  const employee = await prisma.employee.findUnique({ 
    where: { id: parseInt(employeeId) },
    include: { user: { include: { role: true } } }
  });
  if (!employee) throw new Error('Employee not found');

  const balances = await prisma.leaveBalance.findMany({
    where: { employeeId: parseInt(employeeId), year: currentYear }
  });

  return pivotBalances(balances, employee);
};

const updateEmployeeBalances = async (employeeId, editData, user) => {
  const year = new Date().getFullYear();
  const eid = parseInt(employeeId);
  const roleName = (user?.role?.name || '').toUpperCase();
  const annualKeys = ['annual'];
  const manualKeys = ['sick', 'relativesDeath', 'hajj', 'marriage', 'others', 'maternity'];

  const canEditAnnual = roleName === 'ADMIN';
  const canEditManualLeaves = ['ADMIN', 'SECRETARY'].includes(roleName);

  const entries = Object.entries(editData).filter(([key]) => {
    if (annualKeys.includes(key)) return canEditAnnual;
    if (manualKeys.includes(key)) return canEditManualLeaves;
    return false;
  });

  if (entries.length === 0) {
    throw new Error('You are not allowed to update these leave balances');
  }

  await prisma.$transaction(async (tx) => {
    for (const [key, val] of entries) {
      const dbType = key.replace(/([A-Z])/g, "_$1").toUpperCase();
      const total = parseFloat(val.total) || 0;
      const used = parseFloat(val.used) || 0;
      const existing = await tx.leaveBalance.findUnique({
        where: { employeeId_leaveType_year: { employeeId: eid, leaveType: dbType, year } }
      });

      if (existing) {
        await tx.leaveBalance.update({
          where: { id: existing.id },
          data: {
            totalAllotted: total,
            totalUsed: used,
            totalRemaining: total - used
          }
        });
      } else {
        await tx.leaveBalance.create({
          data: {
            employeeId: eid,
            leaveType: dbType,
            year,
            totalAllotted: total,
            totalUsed: used,
            totalRemaining: total - used
          }
        });
      }
    }
  });

  return getEmployeeBalance(eid, year);
};

const applyLeave = async (leaveData) => {
  const { employeeId, branch, isHalfDay, ...data } = leaveData;
  const startDate = normalizeLeaveDate(data.startDate);
  const endDate = normalizeLeaveDate(data.endDate);
  const totalDays = await calculateChargeableLeaveDays(startDate, endDate, isHalfDay);
  const year = startDate.getUTCFullYear();

  // Ensure balance record exists
  let balance = await prisma.leaveBalance.findUnique({
    where: {
      employeeId_leaveType_year: {
        employeeId: parseInt(employeeId),
        leaveType: data.leaveType,
        year,
      },
    },
  });

  if (!balance) {
    // If not exists, check if it's one of our standard types to create initial record
    const defaultAllotment = { ANNUAL: 30, SICK: 15, RELATIVES_DEATH: 3, HAJJ: 10, MARRIAGE: 15, MATERNITY: 60, OTHERS: 5 }[data.leaveType] || 0;
    balance = await prisma.leaveBalance.create({
      data: {
        employeeId: parseInt(employeeId),
        leaveType: data.leaveType,
        year,
        totalAllotted: defaultAllotment,
        totalRemaining: defaultAllotment
      }
    });
  }
  const leaveRequest = await prisma.leaveRequest.create({
    data: {
      leaveType: data.leaveType,
      startDate,
      endDate,
      reason: data.reason,
      totalDays,
      employee: { connect: { id: parseInt(employeeId) } },
    },
    include: { employee: { include: { user: true } }, documents: true },
  });

  sendLeaveRequestSubmittedEmail('drtalal@alawidental.com', leaveRequest).catch(err => {
    console.error('[Leave] Failed to send submitted notification:', err.message);
  });

  return leaveRequest;
};

const updateLeaveStatus = async (id, statusData) => {
  const { status, reviewedBy, reviewNotes } = statusData;
  const leaveRequestId = parseInt(id, 10);
  const reviewerId = Number.isFinite(Number(reviewedBy)) ? parseInt(reviewedBy, 10) : null;

  await prisma.$transaction(async (tx) => {
    const leaveRequest = await tx.leaveRequest.findUnique({
      where: { id: leaveRequestId },
    });

    if (!leaveRequest) throw new Error('Leave request not found');
    if (leaveRequest.status !== 'PENDING') throw new Error('Leave request already processed');

    if (status === 'APPROVED') {
      const year = leaveRequest.startDate.getFullYear();
      const balance = await tx.leaveBalance.findUnique({
        where: {
          employeeId_leaveType_year: {
            employeeId: leaveRequest.employeeId,
            leaveType: leaveRequest.leaveType,
            year,
          },
        },
      });

      if (balance) {
        const hasHalfDayAdjustment = Number(leaveRequest.totalDays) % 1 !== 0;
        const chargeableDays = await calculateChargeableLeaveDays(
          normalizeLeaveDate(leaveRequest.startDate),
          normalizeLeaveDate(leaveRequest.endDate),
          hasHalfDayAdjustment
        );

        if (balance.totalRemaining < chargeableDays) {
          throw new Error('Insufficient balance to approve this request');
        }
        await tx.leaveBalance.update({
          where: { id: balance.id },
          data: {
            totalUsed: balance.totalUsed + chargeableDays,
            totalRemaining: balance.totalRemaining - chargeableDays,
          },
        });

        if (Number(leaveRequest.totalDays) !== chargeableDays) {
          await tx.leaveRequest.update({
            where: { id: leaveRequestId },
            data: { totalDays: chargeableDays },
          });
        }
      }
    }

    await tx.leaveRequest.update({
      where: { id: leaveRequestId },
      data: {
        status,
        reviewedBy: reviewerId,
        reviewedAt: new Date(),
        reviewNotes,
      },
    });
  }, { timeout: 20000 });

  const updatedRequest = await prisma.leaveRequest.findUnique({
    where: { id: leaveRequestId },
    include: { employee: { include: { user: true } }, documents: true },
  });

  if (updatedRequest && ['APPROVED', 'REJECTED'].includes(updatedRequest.status)) {
    const employeeEmail = updatedRequest.employee?.user?.email;
    if (employeeEmail) {
      sendLeaveStatusEmail(employeeEmail, updatedRequest, 'info@alawidental.com').catch(err => {
        console.error('[Leave] Failed to send status notification:', err.message);
      });
    }
  }

  return updatedRequest;
};

const runMonthlyAutoUpdate = async (referenceDate = new Date()) => {
  const year = getBahrainDateParts(referenceDate).year;
  const employees = await prisma.employee.findMany({ where: { status: 'ACTIVE' } });

  console.log(`Running monthly annual leave increment for ${employees.length} employees...`);

  await prisma.$transaction(async (tx) => {
    for (const emp of employees) {
      const annual = await tx.leaveBalance.findUnique({
        where: { employeeId_leaveType_year: { employeeId: emp.id, leaveType: 'ANNUAL', year } }
      });

      if (annual) {
        await tx.leaveBalance.update({
          where: { id: annual.id },
          data: {
            totalAllotted: annual.totalAllotted + 2.5,
            totalRemaining: annual.totalRemaining + 2.5
          }
        });
      } else {
        await tx.leaveBalance.create({
          data: { employeeId: emp.id, leaveType: 'ANNUAL', year, totalAllotted: 2.5, totalRemaining: 2.5 }
        });
      }
    }
  });
};

const runYearlySickLeaveUpdate = async (referenceDate = new Date()) => {
  const todayParts = getBahrainDateParts(referenceDate);
  const year = todayParts.year;
  const employees = await prisma.employee.findMany({
    where: { status: 'ACTIVE', joiningDate: { not: null } },
    select: { id: true, firstName: true, lastName: true, joiningDate: true },
  });

  const eligibleEmployees = employees.filter(employee => isEmploymentAnniversary(employee.joiningDate, todayParts));
  console.log(`Running yearly sick leave update for ${eligibleEmployees.length} anniversary employee(s)...`);

  const result = { checked: employees.length, granted: 0, skipped: employees.length - eligibleEmployees.length };

  await prisma.$transaction(async (tx) => {
    for (const employee of eligibleEmployees) {
      const sick = await tx.leaveBalance.findUnique({
        where: { employeeId_leaveType_year: { employeeId: employee.id, leaveType: 'SICK', year } }
      });

      if (!sick) {
        await tx.leaveBalance.create({
          data: {
            employeeId: employee.id,
            leaveType: 'SICK',
            year,
            totalAllotted: SICK_LEAVE_YEARLY_DAYS,
            totalUsed: 0,
            totalRemaining: SICK_LEAVE_YEARLY_DAYS,
          }
        });
        result.granted += 1;
        continue;
      }

      const topUp = Math.max(0, SICK_LEAVE_YEARLY_DAYS - sick.totalAllotted);
      if (topUp > 0) {
        await tx.leaveBalance.update({
          where: { id: sick.id },
          data: {
            totalAllotted: sick.totalAllotted + topUp,
            totalRemaining: sick.totalRemaining + topUp,
          }
        });
        result.granted += 1;
      }
    }
  });

  return result;
};

const getAllLeaveRequests = async ({ canViewAll = false, employeeId, user } = {}) => {
  const ownEmployeeId = Number(employeeId) || 0;
  const roleName = String(user?.role?.name || '').toUpperCase();
  const isAdmin = roleName === 'ADMIN';
  const where = canViewAll ? {} : { employeeId: ownEmployeeId };

  const requests = await prisma.leaveRequest.findMany({
    where,
    include: { employee: true, documents: true },
    orderBy: [
      { createdAt: 'desc' },
      { id: 'desc' }
    ]
  });

  return requests.map(request => {
    const isOwner = Number(request.employeeId) === ownEmployeeId;
    const isSickLeave = String(request.leaveType || '').toUpperCase().includes('SICK');

    if (isSickLeave && !isAdmin && !isOwner) {
      return { ...request, documents: [] };
    }

    return request;
  });
};

const deleteLeaveRequest = async (id, user) => {
  const leaveRequestId = parseInt(id, 10);
  if (!Number.isFinite(leaveRequestId)) throw new Error('Invalid leave request id');

  const roleName = (user?.role?.name || '').toUpperCase();
  const isAdmin = roleName === 'ADMIN';
  const userEmployeeId = user?.employee?.id || user?.employeeId;

  return await prisma.$transaction(async (tx) => {
    const leaveRequest = await tx.leaveRequest.findUnique({
      where: { id: leaveRequestId },
    });

    if (!leaveRequest) throw new Error('Leave request not found');

    if (!isAdmin) {
      if (Number(leaveRequest.employeeId) !== Number(userEmployeeId)) {
        const err = new Error('You can only delete your own leave requests');
        err.status = 403;
        throw err;
      }

      if (leaveRequest.status !== 'PENDING') {
        const err = new Error('Only Admin can delete approved or processed leave requests');
        err.status = 403;
        throw err;
      }
    }

    if (leaveRequest.status === 'APPROVED') {
      const year = leaveRequest.startDate.getFullYear();
      const balance = await tx.leaveBalance.findUnique({
        where: {
          employeeId_leaveType_year: {
            employeeId: leaveRequest.employeeId,
            leaveType: leaveRequest.leaveType,
            year,
          },
        },
      });

      if (balance) {
        await tx.leaveBalance.update({
          where: { id: balance.id },
          data: {
            totalUsed: Math.max(0, balance.totalUsed - leaveRequest.totalDays),
            totalRemaining: balance.totalRemaining + leaveRequest.totalDays,
          },
        });
      }
    }

    return tx.leaveRequest.delete({
      where: { id: leaveRequestId },
    });
  });
};

const deleteLeaveBalance = async (employeeId) => {
  const eid = parseInt(employeeId);
  const year = new Date().getFullYear();
  return await prisma.leaveBalance.deleteMany({
    where: { employeeId: eid, year }
  });
};

module.exports = {
  applyLeave,
  updateLeaveStatus,
  getAllLeaveRequests,
  getLeaveBalances,
  getEmployeeBalance,
  updateEmployeeBalances,
  runMonthlyAutoUpdate,
  runYearlySickLeaveUpdate,
  deleteLeaveRequest,
  deleteLeaveBalance
};

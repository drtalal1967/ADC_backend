const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const LEAVE_TYPES = [
  'ANNUAL', 'SICK', 'RELATIVES_DEATH', 'HAJJ', 'MARRIAGE', 'OTHERS',
  'EMERGENCY', 'UNPAID', 'MATERNITY', 'PATERNITY', 'CASUAL'
];

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

const updateEmployeeBalances = async (employeeId, editData) => {
  const year = new Date().getFullYear();
  const eid = parseInt(employeeId);

  const entries = Object.entries(editData).filter(([key]) => 
    ['annual', 'sick', 'relativesDeath', 'hajj', 'marriage', 'others', 'maternity'].includes(key)
  );

  return await prisma.$transaction(async (tx) => {
    for (const [key, val] of entries) {
      const dbType = key.replace(/([A-Z])/g, "_$1").toUpperCase();
      const existing = await tx.leaveBalance.findUnique({
        where: { employeeId_leaveType_year: { employeeId: eid, leaveType: dbType, year } }
      });

      if (existing) {
        await tx.leaveBalance.update({
          where: { id: existing.id },
          data: {
            totalAllotted: val.total,
            totalUsed: val.used,
            totalRemaining: Math.max(0, val.total - val.used)
          }
        });
      } else {
        await tx.leaveBalance.create({
          data: {
            employeeId: eid,
            leaveType: dbType,
            year,
            totalAllotted: val.total,
            totalUsed: val.used,
            totalRemaining: Math.max(0, val.total - val.used)
          }
        });
      }
    }
    return getEmployeeBalance(eid, year);
  });
};

const applyLeave = async (leaveData) => {
  const { employeeId, branch, isHalfDay, ...data } = leaveData;
  const startDate = new Date(data.startDate);
  const endDate = new Date(data.endDate);
  let totalDays = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24)) + 1;
  
  if (isHalfDay) {
    totalDays -= 0.5;
  }
  
  const year = startDate.getFullYear();

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

  if (balance.totalRemaining < totalDays) {
    throw new Error('Insufficient leave balance');
  }

  return await prisma.leaveRequest.create({
    data: {
      leaveType: data.leaveType,
      startDate,
      endDate,
      reason: data.reason,
      totalDays,
      employee: { connect: { id: parseInt(employeeId) } },
    },
  });
};

const updateLeaveStatus = async (id, statusData) => {
  const { status, reviewedBy, reviewNotes } = statusData;
  
  return await prisma.$transaction(async (tx) => {
    const leaveRequest = await tx.leaveRequest.findUnique({
      where: { id: parseInt(id) },
    });

    if (!leaveRequest) throw new Error('Leave request not found');
    if (leaveRequest.status !== 'PENDING') throw new Error('Leave request already processed');

    const updatedRequest = await tx.leaveRequest.update({
      where: { id: parseInt(id) },
      data: {
        status,
        reviewedBy: parseInt(reviewedBy),
        reviewedAt: new Date(),
        reviewNotes,
      },
    });

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
        if (balance.totalRemaining < leaveRequest.totalDays) {
          throw new Error('Insufficient balance to approve this request');
        }
        await tx.leaveBalance.update({
          where: { id: balance.id },
          data: {
            totalUsed: balance.totalUsed + leaveRequest.totalDays,
            totalRemaining: balance.totalRemaining - leaveRequest.totalDays,
          },
        });
      }
    }

    return updatedRequest;
  });
};

const runMonthlyAutoUpdate = async () => {
  const year = new Date().getFullYear();
  const employees = await prisma.employee.findMany({ where: { status: 'ACTIVE' } });

  console.log(`Running monthly leave increment for ${employees.length} employees...`);

  return await prisma.$transaction(async (tx) => {
    for (const emp of employees) {
      // Annual Leave +2.5
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

      // Sick Leave +1.25
      const sick = await tx.leaveBalance.findUnique({
        where: { employeeId_leaveType_year: { employeeId: emp.id, leaveType: 'SICK', year } }
      });
      if (sick) {
        await tx.leaveBalance.update({
          where: { id: sick.id },
          data: {
            totalAllotted: sick.totalAllotted + 1.25,
            totalRemaining: sick.totalRemaining + 1.25
          }
        });
      } else {
        await tx.leaveBalance.create({
          data: { employeeId: emp.id, leaveType: 'SICK', year, totalAllotted: 1.25, totalRemaining: 1.25 }
        });
      }
    }
  });
};

const getAllLeaveRequests = async () => {
  return await prisma.leaveRequest.findMany({
    include: { employee: true },
    orderBy: { createdAt: 'desc' }
  });
};

const deleteLeaveRequest = async (id) => {
  return await prisma.leaveRequest.delete({
    where: { id: parseInt(id) }
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
  deleteLeaveRequest,
  deleteLeaveBalance
};

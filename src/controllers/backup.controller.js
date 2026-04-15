const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const downloadBackup = async (req, res, next) => {
  try {
    // Fetch all critical data tables in parallel
    const [
      employees,
      vendors,
      laboratories,
      labCases,
      expenses,
      payments,
      documents,
      reminders,
      leaveRequests,
      schedules,
    ] = await Promise.all([
      prisma.employee.findMany({ include: { user: { select: { email: true, isActive: true } } } }),
      prisma.vendor.findMany(),
      prisma.laboratory.findMany(),
      prisma.labCase.findMany(),
      prisma.expense.findMany(),
      prisma.payment.findMany(),
      prisma.document.findMany(),
      prisma.reminder.findMany(),
      prisma.leaveRequest.findMany(),
      prisma.schedule.findMany(),
    ]);

    const backup = {
      exportedAt: new Date().toISOString(),
      exportedBy: req.user?.email || 'admin',
      version: '1.0',
      data: {
        employees,
        vendors,
        laboratories,
        labCases,
        expenses,
        payments,
        documents,
        reminders,
        leaveRequests,
        schedules,
      },
      summary: {
        employees: employees.length,
        vendors: vendors.length,
        laboratories: laboratories.length,
        labCases: labCases.length,
        expenses: expenses.length,
        payments: payments.length,
        documents: documents.length,
        reminders: reminders.length,
        leaveRequests: leaveRequests.length,
        schedules: schedules.length,
      }
    };

    const filename = `dental_backup_${new Date().toISOString().split('T')[0]}.json`;

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.json(backup);
  } catch (error) {
    console.error('Download Backup Error:', error);
    next(error);
  }
};

module.exports = { downloadBackup };

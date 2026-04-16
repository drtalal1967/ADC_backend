const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const getFinancialAnalytics = async (branch) => {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const analytics = [];
  
  // Calculate date range (last 12 months)
  const now = new Date();
  const branchFilter = branch && branch !== 'all' ? { branch: { contains: branch } } : {};

  // 1. Fetch all required data in parallel
  const [labCases, expenses, employees, payments, manualEntries] = await Promise.all([
    prisma.labCase.findMany({ where: branchFilter }),
    prisma.expense.findMany({ where: branchFilter }),
    prisma.employee.findMany({ where: { status: 'ACTIVE' } }),
    prisma.payment.findMany({
      include: {
        expense: true,
        labCase: true
      }
    }),
    prisma.monthlyFinancial.findMany({ where: branchFilter })
  ]);

  const baseMonthlySalaries = employees.reduce((acc, emp) => acc + parseFloat(emp.basicSalary || 0), 0);

  // 2. Aggregate distributions
  const paymentMethods = [
    { name: 'Cash', value: payments.filter(p => p.paymentMethod === 'CASH').length, color: '#1E3A8A' },
    { name: 'Bank Transfer', value: payments.filter(p => p.paymentMethod === 'BANK_TRANSFER').length, color: '#F97316' },
    { name: 'Card', value: payments.filter(p => p.paymentMethod === 'CREDIT_CARD').length, color: '#10B981' },
    { name: 'Others', value: payments.filter(p => !['CASH', 'BANK_TRANSFER', 'CREDIT_CARD'].includes(p.paymentMethod)).length, color: '#F59E0B' }
  ];

  const paymentStatus = [
    { name: 'Paid', value: labCases.filter(c => c.paymentStatus === 'PAID').length + expenses.filter(e => e.paymentStatus === 'PAID').length, color: '#10B981' },
    { name: 'Pending', value: labCases.filter(c => c.paymentStatus === 'PENDING').length + expenses.filter(e => e.paymentStatus === 'PENDING').length, color: '#F97316' }
  ];

  const expenseCategories = Object.entries(
    expenses.reduce((acc, curr) => {
      const cat = curr.category || 'Others';
      acc[cat] = (acc[cat] || 0) + parseFloat(curr.amount || 0);
      return acc;
    }, {})
  ).map(([name, value]) => ({ name, value }));

  // 3. Generate 12-month trend
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const mName = months[d.getMonth()];
    const year = d.getFullYear();

    // Live Revenue (Previously included LabCases, now only computed using Manual Entries later)
    let monthRevenue = 0;

    // Live Expenses (Sum of all Expense records in this period)
    let directExpenses = expenses
      .filter(e => {
        const eDate = new Date(e.expenseDate);
        return eDate.getMonth() === d.getMonth() && eDate.getFullYear() === year;
      })
      .reduce((acc, e) => acc + parseFloat(e.amount || 0), 0);

    // LabCase Expenses (Payments made for LabCases to laboratories)
    let labcaseExpenses = payments
      .filter(p => {
        const pDate = new Date(p.paymentDate || p.createdAt);
        return p.paymentType === 'LABCASE_PAYMENT' && 
               pDate.getMonth() === d.getMonth() && 
               pDate.getFullYear() === year;
      })
      .reduce((acc, p) => acc + parseFloat(p.amount || 0), 0);

    let monthExpenses = directExpenses + labcaseExpenses;

    let monthSalaries = baseMonthlySalaries;

    // Manual Adjustments (User-entered records)
    const manualForMonth = manualEntries.filter(m => m.month === mName && m.year === year);
    manualForMonth.forEach(m => {
      if (m.type === 'REVENUE') monthRevenue += parseFloat(m.amount);
      if (m.type === 'SALARY') monthSalaries += parseFloat(m.amount);
    });

    const totalCosts = monthExpenses + monthSalaries;
    const profit = monthRevenue - totalCosts;
    const margin = monthRevenue > 0 ? ((profit / monthRevenue) * 100).toFixed(1) : '0.0';

    analytics.push({
      month: mName,
      revenue: monthRevenue,
      expenses: monthExpenses, // Direct expenses
      salaries: monthSalaries,
      costs: totalCosts, // Total costs (expenses + salaries)
      profit: profit,
      margin: margin
    });
  }

  return {
    trends: analytics,
    distributions: {
      paymentMethods,
      paymentStatus,
      expenseCategories
    }
  };
};

const createMonthlyFinancial = async (data) => {
  return await prisma.monthlyFinancial.create({
    data: {
      type: data.type.toUpperCase(),
      amount: parseFloat(data.amount),
      month: data.month,
      year: parseInt(data.year),
      branch: data.branch
    }
  });
};

const getMonthlyFinancials = async (branch) => {
  const where = branch && branch !== 'all' ? { branch: { contains: branch } } : {};
  return await prisma.monthlyFinancial.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: 50
  });
};

const deleteMonthlyFinancial = async (id) => {
  return await prisma.monthlyFinancial.delete({
    where: { id: parseInt(id) }
  });
};

const getAdminStats = async (user) => {
  const roleName = typeof user.role === 'object' ? user.role.name : user.role;
  const isAdmin = ['ADMIN', 'MANAGER', 'SECRETARY'].includes(roleName?.toUpperCase());
  const dentistFilter = isAdmin ? {} : { dentistId: user.employee?.id };

  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const [
    pendingCasesCount,
    unpaidCasesCount,
    completedThisMonthCount,
    unpaidExpensesAmount,
    recentCases,
    pendingLeaves,
    expenseDistribution,
    prosthesisDistribution
  ] = await Promise.all([
    // Active Cases
    prisma.labCase.count({ 
      where: { ...dentistFilter, status: { in: ['PENDING', 'PICKED_UP', 'IN_LAB'] } } 
    }),
    // Unpaid Cases
    prisma.labCase.count({ 
      where: { ...dentistFilter, paymentStatus: 'PENDING' } 
    }),
    // Completed This Month
    prisma.labCase.count({
      where: { 
        ...dentistFilter, 
        status: 'COMPLETED',
        updatedAt: { gte: startOfMonth }
      }
    }),
    // Unpaid Expenses (Admins only see this generally, but we'll fetch it)
    prisma.expense.aggregate({ 
      where: { paymentStatus: 'PENDING' },
      _sum: { amount: true }
    }),
    // Recent Cases
    prisma.labCase.findMany({
      where: dentistFilter,
      take: 5,
      orderBy: { createdAt: 'desc' },
      include: { laboratory: true }
    }),
    // Pending Leaves (Admin/Manager see all, Others see only theirs)
    prisma.leaveRequest.findMany({
      where: isAdmin ? { status: 'PENDING' } : { employeeId: user.employee?.id },
      include: { employee: true },
      take: 5
    }),
    // Charts (Admin only generally, but well keep them available)
    prisma.expense.groupBy({
      by: ['category'],
      _sum: { amount: true }
    }),
    prisma.labCase.groupBy({
      by: ['prosthesisType'], 
      _count: { id: true },
      where: dentistFilter
    })
  ]);

  // Handle revenue trends (last 6 months - now 12)
  const analytics = await getFinancialAnalytics();
  const revenueTrend = analytics.trends;
  
  return {
    pendingCases: pendingCasesCount,
    unpaidCases: unpaidCasesCount,
    completedThisMonth: completedThisMonthCount,
    unpaidExpenses: unpaidExpensesAmount._sum.amount || 0,
    recentCases,
    pendingLeaves,
    expenseDistribution,
    prosthesisDistribution,
    revenueTrend
  };
};

module.exports = {
  getAdminStats,
  getFinancialAnalytics,
  createMonthlyFinancial,
  getMonthlyFinancials,
  deleteMonthlyFinancial
};

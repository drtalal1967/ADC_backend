const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Helper to map frontend payment methods to Prisma enums
const mapPaymentMethod = (method) => {
  if (!method) return 'CASH';
  const m = method.toUpperCase();
  if (m === 'CARD') return 'CREDIT_CARD';
  if (m === 'CASH') return 'CASH';
  if (m === 'CHEQUE') return 'CHEQUE';
  if (m.includes('BANK') || m.includes('TRANSFER')) return 'BANK_TRANSFER';
  if (m === 'ONLINE') return 'ONLINE';
  return 'CASH';
};

const getAllExpenses = async () => {
  const expenses = await prisma.expense.findMany({
    include: { vendor: true, payments: true, documents: true },
    orderBy: [
      { expenseDate: 'desc' },
      { id: 'desc' }
    ]
  });

  // 🔥 format amounts to 3 decimal places
  return expenses.map(exp => ({
    ...exp,
    amount: exp.amount !== null ? Number(exp.amount).toFixed(3) : exp.amount
  }));
};

const getExpenseById = async (id) => {
  return await prisma.expense.findUnique({
    where: { id: parseInt(id) },
    include: { vendor: true, payments: true, documents: true },
  });
};

const createExpense = async (expenseData) => {
  const { vendorId, category, branch, paymentStatus, status, ...data } = expenseData;
  
  // Validate vendor belongs to category
  const vendor = await prisma.vendor.findUnique({ where: { id: parseInt(vendorId) } });
  if (!vendor || !vendor.categories || !vendor.categories.split(',').includes(category)) {
    throw new Error('Selected vendor does not belong to the selected category');
  }

  const isPaid = paymentStatus === 'PAID' || status === 'PAID';
  const amountPaid = isPaid ? (parseFloat(data.amount) || 0) : 0;

  return await prisma.expense.create({
    data: {
      ...data,
      category,
      branch,
      amountPaid,
      vendor: { connect: { id: parseInt(vendorId) } },
      status: isPaid ? 'PAID' : 'PENDING',
      paymentStatus: isPaid ? 'PAID' : 'PENDING'
    },
  });
};

const updateExpense = async (id, expenseData) => {
  const { vendorId, category, branch, ...data } = expenseData;
  const updateData = { ...data };
  
  if (category) updateData.category = category;
  if (branch) updateData.branch = branch;

  const currentExpense = await prisma.expense.findUnique({ where: { id: parseInt(id) } });

  // Update amountPaid automatically based on paymentStatus changes
  if (updateData.paymentStatus === 'PAID') {
    const amt = updateData.amount !== undefined ? parseFloat(updateData.amount) : parseFloat(currentExpense.amount || 0);
    updateData.amountPaid = amt;
    updateData.status = 'PAID';
  } else if (updateData.paymentStatus === 'PENDING' || updateData.paymentStatus === 'UNPAID') {
    // Reset to 0 if we assume it's fully unpaid now (optional, safe default)
    if (updateData.amountPaid === undefined) {
      updateData.amountPaid = 0;
      updateData.status = 'PENDING';
      updateData.paymentStatus = 'PENDING';
    }
  }

  if (vendorId) {
    // Validate vendor belongs to category
    const targetCategory = category || currentExpense.category;
    const vendor = await prisma.vendor.findUnique({ where: { id: parseInt(vendorId) } });
    
    if (!vendor || !vendor.categories || !vendor.categories.split(',').includes(targetCategory)) {
      throw new Error('Selected vendor does not belong to the selected category');
    }
    updateData.vendor = { connect: { id: parseInt(vendorId) } };
  }

  return await prisma.expense.update({
    where: { id: parseInt(id) },
    data: updateData,
  });
};

const processBatchPayment = async (payload) => {
  const { expenseIds, amount, method, notes } = payload;
  const count = expenseIds.length;
  if (count === 0) return;

  let remainingBatchAmount = parseFloat(amount);
  const reversedIds = [...expenseIds];

  const results = [];
  for (let i = 0; i < reversedIds.length; i++) {
    const id = reversedIds[i];
    const expense = await prisma.expense.findUnique({ where: { id: parseInt(id) } });
    if (!expense) continue;

    const isLastItem = i === reversedIds.length - 1;
    const itemDue = Math.max(0, parseFloat(expense.amount) - parseFloat(expense.amountPaid || 0));
    
    let paymentAmount = 0;
    if (isLastItem) {
      paymentAmount = remainingBatchAmount;
    } else {
      paymentAmount = Math.min(remainingBatchAmount, itemDue);
    }

    if (paymentAmount > 0 || isLastItem) {
      // Create Payment Record
      const payment = await prisma.payment.create({
        data: {
          paymentType: 'EXPENSE_PAYMENT',
          expenseId: expense.id,
          amount: paymentAmount,
          paymentDate: new Date(),
          paymentMethod: mapPaymentMethod(method),
          notes: notes,
          status: 'PAID'
        }
      });

      const newAmountPaid = parseFloat(expense.amountPaid || 0) + paymentAmount;
      const totalAmount = parseFloat(expense.amount);
      
      let paymentStatus = 'PARTIAL';
      let status = 'PENDING';

      if (newAmountPaid >= totalAmount && totalAmount > 0) {
        paymentStatus = 'PAID';
        status = 'PAID';
      } else if (newAmountPaid > 0) {
        paymentStatus = 'PARTIAL';
      }

      // Update Expense
      await prisma.expense.update({
        where: { id: expense.id },
        data: {
          amountPaid: newAmountPaid,
          paymentStatus: paymentStatus,
          status: status
        }
      });

      results.push(payment);
      remainingBatchAmount -= paymentAmount;
    }
  }

  return results;
};

const deleteExpense = async (id) => {
  return await prisma.expense.delete({
    where: { id: parseInt(id) },
  });
};

const importExpenses = async (expensesArray) => {
  // 1. Extract unique vendor names from input
  const uniqueVendorNames = [...new Set(expensesArray.map(exp => 
    (exp.vendorName || exp.vendor || 'Unknown Account').trim()
  ))];

  // 2. Find existing vendors
  const existingVendors = await prisma.vendor.findMany({
    where: {
      name: { in: uniqueVendorNames }
    }
  });

  const vendorMap = existingVendors.reduce((acc, v) => {
    acc[v.name.toLowerCase()] = v.id;
    return acc;
  }, {});

  // 3. Create missing vendors
  for (const name of uniqueVendorNames) {
    if (!vendorMap[name.toLowerCase()]) {
      const newVendor = await prisma.vendor.create({
        data: { 
          name: name,
          categories: 'Others', // Default category for imported vendors
          isActive: true
        }
      });
      vendorMap[name.toLowerCase()] = newVendor.id;
    }
  }

  // 4. Transform data
  const dataToInsert = expensesArray.map(exp => {
    const vendorName = (exp.vendorName || exp.vendor || 'Unknown Account').trim().toLowerCase();
    const vendorId = vendorMap[vendorName];

    return {
      vendorId: vendorId,
      title: `${exp.category || 'Expense'} - ${exp.invoiceRef || exp.invoiceNumber || 'Imported'}`,
      amount: parseFloat(exp.amount) || 0,
      expenseDate: new Date(exp.date || new Date()),
      category: exp.category || 'Others',
      invoiceNumber: exp.invoiceRef || exp.invoiceNumber || null,
      branch: exp.branch || 'Tubli Branch',
      status: (exp.status || exp.paymentStatus || 'Unpaid').toUpperCase() === 'PAID' ? 'PAID' : 'PENDING',
      paymentStatus: (exp.status || exp.paymentStatus || 'Unpaid').toUpperCase() === 'PAID' ? 'PAID' : 'PENDING',
    };
  });

  // 5. Insert using createMany
  const result = await prisma.expense.createMany({
    data: dataToInsert,
    skipDuplicates: true
  });

  return result;
};

module.exports = {
  getAllExpenses,
  getExpenseById,
  createExpense,
  updateExpense,
  deleteExpense,
  processBatchPayment,
  importExpenses
};

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// ➕ Create payment (FIXED)
const createPayment = async (data) => {
  const { expenseId, labCaseId, ...rest } = data;

  const paymentData = {
    ...rest,
  };

  // ✅ Expense payment
  if (expenseId && !isNaN(parseInt(expenseId))) {
    paymentData.expense = {
      connect: { id: parseInt(expenseId) }
    };
    paymentData.paymentType = "EXPENSE_PAYMENT";
  }

  // ✅ Lab case payment
  if (labCaseId && !isNaN(parseInt(labCaseId))) {
    paymentData.labCase = {
      connect: { id: parseInt(labCaseId) }
    };
    paymentData.paymentType = "LABCASE_PAYMENT";
  }

  // ❗ SAFETY CHECK
  if (!paymentData.expense && !paymentData.labCase) {
    throw new Error("Either expenseId or labCaseId must be provided");
  }

  const payment = await prisma.payment.create({
    data: paymentData,
    include: {
      expense: { include: { vendor: true } },
      labCase: { include: { laboratory: true } },
      documents: true
    }
  });

  // ✅ Auto-update expense → PAID
  if (expenseId && !isNaN(parseInt(expenseId))) {
    try {
      await prisma.expense.update({
        where: { id: parseInt(expenseId) },
        data: { paymentStatus: 'Paid' }
      });
    } catch (err) {
      console.error('Failed to update expense status:', err);
    }
  }

  return payment;
};

// ➕ Batch payments
const processBatchPayments = async (payments) => {
  const results = [];

  for (const p of payments) {
    const created = await createPayment(p);
    results.push(created);
  }

  return results;
};

// 📊 Get all payments
const getAllPayments = async (filters = {}) => {
  const { vendorId, labId } = filters;

  let where = {};

  if (vendorId) {
    where = {
      expense: {
        vendorId: parseInt(vendorId)
      }
    };
  }

  if (labId) {
    where = {
      labCase: {
        laboratoryId: parseInt(labId)
      }
    };
  }

  return await prisma.payment.findMany({
    where,
    include: {
      expense: { include: { vendor: true } },
      labCase: { include: { laboratory: true } },
      documents: true
    },
    orderBy: [
      { paymentDate: 'desc' },
      { id: 'desc' }
    ]
  });
};

// ✏️ Update payment
const updatePayment = async (id, data) => {
  return await prisma.payment.update({
    where: { id: parseInt(id) },
    data,
    include: {
      expense: { include: { vendor: true } },
      labCase: { include: { laboratory: true } },
      documents: true
    }
  });
};

// ❌ Delete payment
const deletePayment = async (id) => {
  return await prisma.payment.delete({
    where: { id: parseInt(id) }
  });
};

// ✅ Export everything
module.exports = {
  createPayment,
  processBatchPayments,
  getAllPayments,
  updatePayment,
  deletePayment,
};

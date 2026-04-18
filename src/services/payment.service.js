const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// ➕ Create payment (FIXED)
const createPayment = async (data) => {
  console.log("CREATE PAYMENT DATA:", data);

  const { expenseId, labCaseId, paymentMethod, method, notes, amount } = data;

  const paymentData = {
    amount,
    notes,

    // ✅ FIXED FIELD NAME
    method: paymentMethod || method || "Cash",

    // ✅ REQUIRED
    paymentDate: new Date(),
  };

  // Expense
  if (expenseId && !isNaN(parseInt(expenseId))) {
    paymentData.expense = {
      connect: { id: parseInt(expenseId) }
    };
    paymentData.paymentType = "EXPENSE_PAYMENT";
  }

  // Lab case
  if (labCaseId && !isNaN(parseInt(labCaseId))) {
    paymentData.labCase = {
      connect: { id: parseInt(labCaseId) }
    };
    paymentData.paymentType = "LABCASE_PAYMENT";
  }

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

  return payment;
};

// ➕ Batch payments (LAB CASES)
const processBatchPayments = async (data) => {

  const { caseIds, amount, method, notes } = data;

  const results = [];

  if (!Array.isArray(caseIds) || caseIds.length === 0) {
    throw new Error("No caseIds provided");
  }

  for (const caseId of caseIds) {
    const payment = await createPayment({
      labCaseId: caseId,
      amount,
      paymentMethod: method,
      notes,
      paymentDate: new Date() // ✅ important
    });

    results.push(payment);
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

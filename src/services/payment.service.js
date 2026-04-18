const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// ➕ Create payment (FULLY FIXED)
const createPayment = async (data) => {
  console.log("CREATE PAYMENT DATA:", data);

  const expenseId = data.expenseId ? parseInt(data.expenseId) : null;
  const labCaseId = data.labCaseId ? parseInt(data.labCaseId) : null;

  // ✅ Build CLEAN Prisma object (NO ...rest anymore)
  const paymentData = {
    amount: Number(data.amount),
    paymentMethod: data.paymentMethod || data.method || "Cash",
    notes: data.notes || "",
    paymentDate: new Date(), // ✅ REQUIRED FIELD
    paymentType: labCaseId ? "LABCASE_PAYMENT" : "EXPENSE_PAYMENT",
  };

  // ✅ Connect Expense
  if (expenseId) {
    paymentData.expense = {
      connect: { id: expenseId }
    };
  }

  // ✅ Connect Lab Case
  if (labCaseId) {
    paymentData.labCase = {
      connect: { id: labCaseId }
    };
  }

  // ❗ Safety
  if (!paymentData.expense && !paymentData.labCase) {
    throw new Error("No expenseId or labCaseId provided");
  }

  console.log("FINAL PAYMENT DATA:", paymentData);

  const payment = await prisma.payment.create({
    data: paymentData,
    include: {
      expense: { include: { vendor: true } },
      labCase: { include: { laboratory: true } },
      documents: true
    }
  });

  // ✅ Auto-update expense status
  if (expenseId) {
    try {
      await prisma.expense.update({
        where: { id: expenseId },
        data: { paymentStatus: 'Paid' }
      });
    } catch (err) {
      console.error('Expense status update failed:', err);
    }
  }

  return payment;
};

// ➕ Batch payments (LAB CASE FIXED)
const processBatchPayments = async (data) => {
  console.log("BATCH DATA:", data);

  const { caseIds, amount, method, notes } = data;

  if (!Array.isArray(caseIds) || caseIds.length === 0) {
    throw new Error("Invalid caseIds");
  }

  const results = [];

  for (const caseId of caseIds) {
    const payment = await createPayment({
      labCaseId: caseId,
      amount,
      paymentMethod: method,
      notes
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

// ✅ Export
module.exports = {
  createPayment,
  processBatchPayments,
  getAllPayments,
  updatePayment,
  deletePayment,
};

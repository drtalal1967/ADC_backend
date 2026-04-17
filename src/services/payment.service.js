const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// ➕ Create payment
const createPayment = async (data) => {
  const { expenseId, labCaseId, ...rest } = data;

  const payment = await prisma.payment.create({
    data: {
      ...rest,
      ...(expenseId && {
        expense: { connect: { id: parseInt(expenseId) } }
      }),
      ...(labCaseId && {
        labCase: { connect: { id: parseInt(labCaseId) } }
      }),
    },
    include: {
      expense: { include: { vendor: true } },
      labCase: { include: { laboratory: true } },
      documents: true
    }
  });

  // ✅ Auto-update expense → PAID
  if (expenseId) {
    try {
      await prisma.expense.update({
        where: { id: parseInt(expenseId) },
        data: {
          paymentStatus: 'Paid'
        }
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

// 📊 Get all payments (WITH FILTERS)
const getAllPayments = async (filters = {}) => {
  const { vendorId, labId } = filters;

  return await prisma.payment.findMany({
    where: {
      ...(vendorId && {
        expense: {
          vendorId: parseInt(vendorId)
        }
      }),
      ...(labId && {
        labCase: {
          laboratoryId: parseInt(labId)
        }
      })
    },
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

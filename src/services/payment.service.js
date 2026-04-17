const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// ➕ Create payment
const createPayment = async (data) => {
  const { expenseId, labCaseId, ...rest } = data;

  return await prisma.payment.create({
    data: {
      ...rest,
      ...(expenseId && { expense: { connect: { id: parseInt(expenseId) } } }),
      ...(labCaseId && { labCase: { connect: { id: parseInt(labCaseId) } } }),
    },
    include: {
      expense: { include: { vendor: true } },
      labCase: { include: { laboratory: true } },
      documents: true
    }
  });
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

// 📊 Get all payments (RAW for backend)
const getAllPayments = async () => {
  return await prisma.payment.findMany({
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

module.exports = {
  createPayment,
  processBatchPayments,
  getAllPayments,
  updatePayment,
  deletePayment,
};

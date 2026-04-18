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

  // ❗ Safety

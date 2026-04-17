const createPayment = async (data) => {
  const { expenseId, labCaseId, ...rest } = data;

  // Create payment first
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
          paymentStatus: 'PAID'
        }
      });
    } catch (err) {
      console.error('Failed to update expense status:', err);
    }
  }

  return payment;
};

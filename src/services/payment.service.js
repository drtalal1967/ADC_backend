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

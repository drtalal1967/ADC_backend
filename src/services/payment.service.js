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

const getAllPayments = async () => {
  const payments = await prisma.payment.findMany({
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

  const formattedPayments = payments.map(p => {
    const type = p.paymentType === "LABCASE_PAYMENT" ? "LAB" : "EXPENSE";
    let itemName = 'Unknown Payment';

    if (type === 'LAB') {
      if (p.labCase) {
        itemName = `Patient: ${p.labCase.patientName || 'N/A'}`;
        if (p.labCase.laboratory?.name) {
          itemName += ` (Lab: ${p.labCase.laboratory.name})`;
        }
      }
    } else {
      if (p.expense) {
        itemName = `Vendor: ${p.expense.vendor?.name || 'N/A'}`;
        if (p.expense.category) {
          itemName += ` (${p.expense.category})`;
        }
      }
    }

    return {
      id: p.id,
      type,
      itemName,
      amount: Number(p.amount),
      method: p.paymentMethod || "Cash",
      status: "Paid",
      date: p.paymentDate ? p.paymentDate.toISOString().split('T')[0] : "",
      branch: p.labCase?.branch || p.expense?.branch || 'N/A',
      attachment: p.documents?.[0]?.fileUrl,
      notes: p.notes,
      referenceNumber: p.referenceNumber,
      originalData: p,
      caseCount: 1
    };
  });

  return formattedPayments;
};

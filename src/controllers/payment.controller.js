const getAllCombined = async (req, res, next) => {
  try {
    // ✅ pass filters from frontend
    const payments = await paymentService.getAllPayments(req.query);

    const formattedPayments = payments.map(p => {
      const type = p.paymentType === "LABCASE_PAYMENT" ? "LAB" : "EXPENSE";

      let itemName = 'Unknown';

      if (type === 'LAB') {
        if (p.labCase) {
          itemName = p.labCase.laboratory?.name || 'Lab Payment';
        }
      } else {
        if (p.expense) {
          itemName = p.expense.vendor?.name || 'Vendor Payment';
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

    res.json(formattedPayments);

  } catch (error) {
    next(error);
  }
};

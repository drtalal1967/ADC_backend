const paymentService = require('../services/payment.service');

const createPayment = async (req, res, next) => {
  try {
    const payment = await paymentService.createPayment(req.body);
    res.status(201).json(payment);
  } catch (error) {
    next(error);
  }
};

const processBatchPayments = async (req, res, next) => {
  try {
    const results = await paymentService.processedBatchPayments(req.body);
    res.status(201).json(results);
  } catch (error) {
    next(error);
  }
};

// ✅ RAW payments (used internally if needed)
const getAllPayments = async (req, res, next) => {
  try {
    const payments = await paymentService.getAllPayments();
    res.json(payments || []);
  } catch (error) {
    next(error);
  }
};

// ✅ FORMATTED payments (USED BY FRONTEND /all)
const getAllCombined = async (req, res, next) => {
  try {
    const payments = await paymentService.getAllPayments();

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

const updatePayment = async (req, res, next) => {
  try {
    const payment = await paymentService.updatePayment(req.params.id, req.body);
    res.json(payment);
  } catch (error) {
    next(error);
  }
};

const deletePayment = async (req, res, next) => {
  try {
    await paymentService.deletePayment(req.params.id);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createPayment,
  processBatchPayments,
  getAllPayments,
  getAllCombined,   // ✅ IMPORTANT
  updatePayment,
  deletePayment,
};

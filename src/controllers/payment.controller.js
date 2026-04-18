const paymentService = require('../services/payment.service');

// ➕ Create payment
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
    // ✅ ensure it's always an array
    const payments = Array.isArray(req.body)
      ? req.body
      : req.body.payments || [];

    if (!Array.isArray(payments)) {
      return res.status(400).json({ message: 'Invalid payments format' });
    }

    const results = await paymentService.processBatchPayments(payments);
    res.status(201).json(results);
  } catch (error) {
    next(error);
  }
};

// 📊 Raw payments
const getAllPayments = async (req, res, next) => {
  try {
    const payments = await paymentService.getAllPayments(req.query);
    res.json(payments || []);
  } catch (error) {
    next(error);
  }
};

// 📊 Formatted payments (for frontend)
const getAllCombined = async (req, res, next) => {
  try {
    const payments = await paymentService.getAllPayments(req.query);

    const formattedPayments = payments.map(p => {
      const type = p.paymentType === "LABCASE_PAYMENT" ? "LAB" : "EXPENSE";

      let itemName = 'Unknown';

      if (type === 'LAB') {
        itemName = p.labCase?.laboratory?.name || 'Lab Payment';
      } else {
        itemName = p.expense?.vendor?.name || 'Vendor Payment';
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

// ✏️ Update payment
const updatePayment = async (req, res, next) => {
  try {
    const payment = await paymentService.updatePayment(req.params.id, req.body);
    res.json(payment);
  } catch (error) {
    next(error);
  }
};

// ❌ Delete payment
const deletePayment = async (req, res, next) => {
  try {
    await paymentService.deletePayment(req.params.id);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
};

// ✅ Export everything
module.exports = {
  createPayment,
  processBatchPayments,
  getAllPayments,
  getAllCombined,
  updatePayment,
  deletePayment,
};

const { PrismaClient } = require('@prisma/client');
const paymentService = require('../services/payment.service');

const prisma = new PrismaClient();

const hasPermission = (user, module, action) => {
  if (user?.role?.name === 'ADMIN') return true;
  const permission = user?.role?.permissions?.find(p => p.module === module);
  const actionMap = {
    view: 'canView',
    create: 'canCreate',
    update: 'canUpdate',
    edit: 'canUpdate',
    delete: 'canDelete',
    export: 'canExport'
  };
  return Boolean(permission?.[actionMap[action] || action]);
};

const ensurePaymentAccess = async (req, action) => {
  if (hasPermission(req.user, 'payments', action)) return;
  if (!hasPermission(req.user, 'lab_case_financials', action)) {
    throw new Error('Permission denied for payment action');
  }

  if (action === 'create') {
    const isLabPayment = Boolean(req.body?.labCaseId) || (Array.isArray(req.body?.caseIds) && req.body.caseIds.length > 0);
    const isExpensePayment = Boolean(req.body?.expenseId);
    if (!isLabPayment || isExpensePayment) {
      throw new Error('Lab Case Financials permission can only be used for lab case payments');
    }
    return;
  }

  const payment = await prisma.payment.findUnique({
    where: { id: parseInt(req.params.id, 10) },
    select: { id: true, labCaseId: true, expenseId: true }
  });

  if (!payment) throw new Error('Payment not found');
  if (!payment.labCaseId || payment.expenseId) {
    throw new Error('Lab Case Financials permission can only be used for lab case payments');
  }
};

// ➕ Create payment
const createPayment = async (req, res, next) => {
  try {
    await ensurePaymentAccess(req, 'create');
    const payment = await paymentService.createPayment(req.body);
    res.status(201).json(payment);
  } catch (error) {
    next(error);
  }
};

const processBatchPayments = async (req, res, next) => {
  try {
    await ensurePaymentAccess(req, 'create');
    console.log("BATCH HIT:", req.body);

    const results = await paymentService.processBatchPayments(req.body);

    res.status(201).json(results);

  } catch (error) {
    console.error("BATCH ERROR:", error); // ✅ DEBUG HERE
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
      let itemLogoUrl = null;

      if (type === 'LAB') {
        itemName = p.labCase?.laboratory?.name || 'Lab Payment';
        itemLogoUrl = p.labCase?.laboratory?.logoUrl || null;
      } else {
        itemName = p.expense?.vendor?.name || 'Vendor Payment';
        itemLogoUrl = p.expense?.vendor?.logoUrl || null;
      }

      return {
        id: p.id,
        type,
        itemName,
        itemLogoUrl,
        amount: Number(p.amount),
        method: p.paymentMethod || "Cash",
        status: "Paid",
        date: p.paymentDate ? p.paymentDate.toISOString().split('T')[0] : "",
        branch: p.labCase?.branch || p.expense?.branch || 'N/A',
        attachment: p.documents?.[0]?.fileUrl,
        notes: p.notes,
        referenceNumber: p.referenceNumber,
        batchGroupId: p.batchGroupId,
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
    await ensurePaymentAccess(req, 'update');
    const payment = await paymentService.updatePayment(req.params.id, req.body);
    res.json(payment);
  } catch (error) {
    next(error);
  }
};

// ❌ Delete payment
const deletePayment = async (req, res, next) => {
  try {
    await ensurePaymentAccess(req, 'delete');
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

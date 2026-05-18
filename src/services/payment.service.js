const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const mapPaymentMethod = (method) => {
  if (!method) return "CASH";
  const m = String(method).toLowerCase();

  if (m.includes("cash")) return "CASH";
  if (m.includes("bank")) return "BANK_TRANSFER";
  if (m.includes("card")) return "CREDIT_CARD";
  if (m.includes("cheque") || m.includes("check")) return "CHEQUE";

  return "CASH";
};

const getExpensePaymentStatus = (amountPaid, totalAmount) => {
  if (Number(amountPaid) <= 0) return "PENDING";
  return Number(amountPaid) >= Number(totalAmount) ? "PAID" : "PARTIAL";
};

const getLabCasePaymentStatus = (amountPaid, totalCost) => {
  if (Number(amountPaid) <= 0) return "PENDING";
  return Number(amountPaid) >= Number(totalCost) ? "PAID" : "PARTIAL";
};

const createBatchGroupId = (prefix) => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;

// âž• Create payment (FINAL CLEAN)
const createPayment = async (data) => {
  console.log("CREATE PAYMENT DATA:", data);

  const expenseId = data.expenseId ? parseInt(data.expenseId) : null;
  const labCaseId = data.labCaseId ? parseInt(data.labCaseId) : null;

  // âœ… Parse amount ONCE
  const amount = parseFloat(data.amount);
  if (!amount || amount <= 0) {
    throw new Error("Invalid payment amount");
  }

  // âœ… Convert frontend string â†’ Prisma ENUM
  const mapPaymentMethod = (method) => {
    if (!method) return "CASH";
    const m = method.toLowerCase();

    if (m.includes("cash")) return "CASH";
    if (m.includes("bank")) return "BANK_TRANSFER";
    if (m.includes("card")) return "CREDIT_CARD";
    if (m.includes("cheque") || m.includes("check")) return "CHEQUE";

    return "CASH";
  };

  const paymentData = {
    amount,
    paymentMethod: mapPaymentMethod(data.paymentMethod || data.method),
    paymentDate: new Date(),
    notes: data.notes || "",
    paymentType: labCaseId ? "LABCASE_PAYMENT" : "EXPENSE_PAYMENT",
  };

  if (data.referenceNumber) {
    paymentData.referenceNumber = data.referenceNumber;
  }

  if (data.batchGroupId) {
    paymentData.batchGroupId = data.batchGroupId;
  }

  // âœ… Relations
  if (expenseId) {
    paymentData.expense = { connect: { id: expenseId } };
  }

  if (labCaseId) {
    paymentData.labCase = { connect: { id: labCaseId } };
  }

  if (!paymentData.expense && !paymentData.labCase) {
    throw new Error("No expenseId or labCaseId provided");
  }

  console.log("FINAL PAYMENT DATA:", paymentData);

  const payment = await prisma.payment.create({
    data: paymentData,
    include: {
      expense: { include: { vendor: true } },
      labCase: { include: { laboratory: true } },
      documents: true
    }
  });

  // =========================
  // âœ… EXPENSE UPDATE
  // =========================
  if (expenseId) {
    try {
      const updated = await prisma.expense.update({
        where: { id: expenseId },
        data: {
          amountPaid: { increment: amount }
        }
      });

      const newStatus =
        Number(updated.amountPaid) >= Number(updated.amount)
          ? "PAID"
          : "PARTIAL";

      await prisma.expense.update({
        where: { id: expenseId },
        data: {
          paymentStatus: newStatus,
          status: newStatus === "PAID" ? "PAID" : "PENDING"
        }
      });

    } catch (err) {
      console.error('Expense status update failed:', err);
    }
  }

  // =========================
  // âœ… LAB CASE UPDATE
  // =========================
  if (labCaseId) {
    try {
      const updated = await prisma.labCase.update({
        where: { id: labCaseId },
        data: {
          amountPaid: { increment: amount }
        }
      });

      const newStatus =
        Number(updated.amountPaid) >= Number(updated.cost)
          ? "PAID"
          : "PARTIAL";

      await prisma.labCase.update({
        where: { id: labCaseId },
        data: {
          paymentStatus: newStatus
        }
      });

    } catch (err) {
      console.error('Lab case status update failed:', err);
    }
  }

  return payment;
};

// âž• Batch payments
const processBatchPayments = async (data) => {
  console.log("BATCH DATA:", data);

  const { caseIds, method, notes } = data;

  if (!Array.isArray(caseIds) || caseIds.length === 0) {
    throw new Error("Invalid caseIds");
  }

  const results = [];
  const batchReference = `LAB-BATCH-${Date.now()}`;
  const batchGroupId = createBatchGroupId("LABBATCH");

  for (const caseId of caseIds) {
    const labCase = await prisma.labCase.findUnique({
      where: { id: parseInt(caseId) },
      select: { id: true, cost: true, amountPaid: true }
    });

    if (!labCase) continue;

    const dueAmount = Math.max(
      0,
      Number(labCase.cost || 0) - Number(labCase.amountPaid || 0)
    );

    if (dueAmount <= 0) continue;

    const payment = await createPayment({
      labCaseId: caseId,
      amount: dueAmount,
      method,
      notes,
      referenceNumber: batchReference,
      batchGroupId
    });

    results.push(payment);
  }

  return results;
};

// ðŸ“Š Get all payments
const getAllPayments = async (filters = {}) => {
  const { vendorId, labId } = filters;

  let where = {};

  if (vendorId) {
    where.expense = { vendorId: parseInt(vendorId) };
  }

  if (labId) {
    where.labCase = { laboratoryId: parseInt(labId) };
  }

  return await prisma.payment.findMany({
    where,
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

// âœï¸ Update payment
const updatePayment = async (id, data) => {
  const paymentId = parseInt(id);

  return await prisma.$transaction(async (tx) => {
    const existing = await tx.payment.findUnique({
      where: { id: paymentId },
      include: {
        expense: true,
        labCase: true
      }
    });

    if (!existing) {
      throw new Error("Payment not found");
    }

    const updateData = {};

    if (data.amount !== undefined) {
      updateData.amount = parseFloat(data.amount);
      if (!updateData.amount || updateData.amount <= 0) {
        throw new Error("Invalid payment amount");
      }
    }
    if (data.paymentMethod !== undefined || data.method !== undefined) {
      updateData.paymentMethod = mapPaymentMethod(data.paymentMethod || data.method);
    }
    if (data.notes !== undefined) updateData.notes = data.notes || "";
    if (data.referenceNumber !== undefined) updateData.referenceNumber = data.referenceNumber || null;
    if (data.batchGroupId !== undefined) updateData.batchGroupId = data.batchGroupId || null;
    if (data.paymentDate !== undefined) updateData.paymentDate = new Date(data.paymentDate);

    const oldAmount = Number(existing.amount || 0);
    const newAmount = updateData.amount !== undefined ? Number(updateData.amount || 0) : oldAmount;
    const amountDelta = newAmount - oldAmount;

    const updatedPayment = await tx.payment.update({
      where: { id: paymentId },
      data: updateData,
      include: {
        expense: { include: { vendor: true } },
        labCase: { include: { laboratory: true } },
        documents: true
      }
    });

    if (amountDelta !== 0 && existing.expenseId && existing.expense) {
      const newPaid = Math.max(0, Number(existing.expense.amountPaid || 0) + amountDelta);
      const newStatus = getExpensePaymentStatus(newPaid, existing.expense.amount);

      await tx.expense.update({
        where: { id: existing.expenseId },
        data: {
          amountPaid: newPaid,
          paymentStatus: newStatus,
          status: newStatus === "PAID" ? "PAID" : "PENDING"
        }
      });
    }

    if (amountDelta !== 0 && existing.labCaseId && existing.labCase) {
      const newPaid = Math.max(0, Number(existing.labCase.amountPaid || 0) + amountDelta);

      await tx.labCase.update({
        where: { id: existing.labCaseId },
        data: {
          amountPaid: newPaid,
          paymentStatus: getLabCasePaymentStatus(newPaid, existing.labCase.cost)
        }
      });
    }

    return updatedPayment;
  });
};

// Delete payment
const deletePayment = async (id) => {
  const paymentId = parseInt(id);

  return await prisma.$transaction(async (tx) => {
    const payment = await tx.payment.findUnique({
      where: { id: paymentId },
      include: {
        expense: true,
        labCase: true
      }
    });

    if (!payment) {
      throw new Error("Payment not found");
    }

    await tx.document.deleteMany({
      where: { paymentId }
    });

    const deletedPayment = await tx.payment.delete({
      where: { id: paymentId }
    });

    const amount = Number(payment.amount || 0);

    if (payment.expenseId && payment.expense) {
      const newPaid = Math.max(0, Number(payment.expense.amountPaid || 0) - amount);
      const newStatus = getExpensePaymentStatus(newPaid, payment.expense.amount);

      await tx.expense.update({
        where: { id: payment.expenseId },
        data: {
          amountPaid: newPaid,
          paymentStatus: newStatus,
          status: newStatus === "PAID" ? "PAID" : "PENDING"
        }
      });
    }

    if (payment.labCaseId && payment.labCase) {
      const newPaid = Math.max(0, Number(payment.labCase.amountPaid || 0) - amount);

      await tx.labCase.update({
        where: { id: payment.labCaseId },
        data: {
          amountPaid: newPaid,
          paymentStatus: getLabCasePaymentStatus(newPaid, payment.labCase.cost)
        }
      });
    }

    return deletedPayment;
  });
};

// âœ… Export
module.exports = {
  createPayment,
  processBatchPayments,
  getAllPayments,
  updatePayment,
  deletePayment,
};

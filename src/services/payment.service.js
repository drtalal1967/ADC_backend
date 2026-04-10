const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Helper to map frontend payment methods to Prisma enums
const mapPaymentMethod = (method) => {
  if (!method) return 'CASH';
  const m = method.toUpperCase();
  if (m === 'CARD') return 'CREDIT_CARD';
  if (m === 'CASH') return 'CASH';
  if (m === 'CHEQUE') return 'CHEQUE';
  if (m.includes('BANK') || m.includes('TRANSFER')) return 'BANK_TRANSFER';
  if (m === 'ONLINE') return 'ONLINE';
  // Standardize other strings like "Bank Transfer"
  return m.replace(/\s+/g, '_');
};

const createPayment = async (paymentData) => {
  const { expenseId, labCaseId, amount, paymentDate, paymentMethod, referenceNumber, notes, paymentType } = paymentData;

  const payment = await prisma.payment.create({
    data: {
      paymentType,
      amount,
      paymentDate: new Date(paymentDate),
      paymentMethod: mapPaymentMethod(paymentMethod),
      referenceNumber,
      notes,
      ...(expenseId && { expense: { connect: { id: parseInt(expenseId) } } }),
      ...(labCaseId && { labCase: { connect: { id: parseInt(labCaseId) } } }),
    },
  });

  // Update expense status if it's an expense payment
  if (expenseId) {
    const expense = await prisma.expense.findUnique({
      where: { id: parseInt(expenseId) },
      include: { payments: true },
    });

    const totalPaid = expense.payments.reduce((sum, p) => sum + parseFloat(p.amount), 0);
    const status = totalPaid >= parseFloat(expense.amount) ? 'PAID' : 'PENDING';
    const paymentStatus = totalPaid >= parseFloat(expense.amount) ? 'PAID' : (totalPaid > 0 ? 'PARTIAL' : 'PENDING');

    await prisma.expense.update({
      where: { id: parseInt(expenseId) },
      data: { 
        amountPaid: totalPaid,
        status: status === 'PAID' ? 'PAID' : expense.status,
        paymentStatus 
      },
    });
  }

  return payment;
};

const processedBatchPayments = async (batchData) => {
  const { caseIds, amount, method, notes, payments: legacyPayments } = batchData;
  
  return await prisma.$transaction(async (tx) => {
    const results = [];

    // Handle new Case List format
    if (caseIds && Array.isArray(caseIds)) {
      let remainingAmount = parseFloat(amount);
      const reversedIds = [...caseIds]; // Maintain selection order or reverse if needed, here we'll just go in order

      for (let i = 0; i < reversedIds.length; i++) {
        const id = reversedIds[i];
        const labCase = await tx.labCase.findUnique({
          where: { id: parseInt(id) }
        });

        if (!labCase) continue;

        const isLastItem = i === reversedIds.length - 1;
        const itemDue = Math.max(0, parseFloat(labCase.cost || 0) - parseFloat(labCase.amountPaid || 0));
        
        let paymentAmount = 0;
        if (isLastItem) {
          // All remaining batch amount goes to the last item
          paymentAmount = remainingAmount;
        } else {
          // Pay the due amount for this item, but not more than remaining batch amount
          paymentAmount = Math.min(remainingAmount, itemDue);
        }

        if (paymentAmount > 0 || isLastItem) { // Record even 0 for the last item if needed, but normally amount > 0
          const payment = await tx.payment.create({
            data: {
              paymentType: 'LABCASE_PAYMENT',
              amount: paymentAmount,
              paymentDate: new Date(),
              paymentMethod: mapPaymentMethod(method),
              notes: notes || 'Batch payment',
              labCase: { connect: { id: parseInt(id) } },
            },
          });

          const newAmountPaid = parseFloat(labCase.amountPaid || 0) + paymentAmount;
          const cost = parseFloat(labCase.cost || 0);
          
          let paymentStatus = 'PENDING';
          if (newAmountPaid >= cost && cost > 0) {
            paymentStatus = 'PAID';
          } else if (newAmountPaid > 0) {
            paymentStatus = 'PARTIAL';
          }

          await tx.labCase.update({
            where: { id: parseInt(id) },
            data: {
              amountPaid: newAmountPaid,
              paymentStatus: paymentStatus,
            },
          });
          results.push(payment);
          remainingAmount -= paymentAmount;
        }
      }
    } 
    // Handle legacy expense payments format if still needed
    else if (legacyPayments && Array.isArray(legacyPayments)) {
      for (const p of legacyPayments) {
        const payment = await tx.payment.create({
          data: {
            paymentType: 'EXPENSE_PAYMENT',
            amount: p.amount,
            paymentDate: new Date(),
            paymentMethod: p.paymentMethod ? p.paymentMethod.toUpperCase().replace(/\s+/g, '_') : 'CASH',
            expense: { connect: { id: parseInt(p.expenseId) } },
          },
        });

        const expense = await tx.expense.findUnique({
          where: { id: parseInt(p.expenseId) },
          include: { payments: true },
        });

        const totalPaid = expense.payments.reduce((sum, pay) => sum + parseFloat(pay.amount), 0) + parseFloat(p.amount);
        const isFull = totalPaid >= parseFloat(expense.amount);

        await tx.expense.update({
          where: { id: parseInt(p.expenseId) },
          data: {
            amountPaid: totalPaid,
            status: isFull ? 'PAID' : expense.status,
            paymentStatus: isFull ? 'PAID' : 'PARTIAL',
          },
        });
        results.push(payment);
      }
    }
    
    return results;
  });
};

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
        ],
    });

    const formattedPayments = (payments || []).map(p => {
        const type = p.paymentType === "LABCASE_PAYMENT" ? "LAB" : "EXPENSE";
        let itemName = 'Unknown Payment';

        if (type === 'LAB') {
            if (p.labCase) {
                itemName = `Patient: ${p.labCase.patientName || 'N/A'}`;
                if (p.labCase.laboratory?.name) {
                    itemName += ` (Lab: ${p.labCase.laboratory.name})`;
                }
            } else if (p.labCaseId) {
                itemName = `Lab Case #${p.labCaseId}`;
            } else {
                itemName = 'Lab Payment (Case Link Missing)';
            }
        } else {
            if (p.expense) {
                itemName = `Vendor: ${p.expense.vendor?.name || 'N/A'}`;
                if (p.expense.category) {
                    itemName += ` (${p.expense.category})`;
                }
            } else if (p.expenseId) {
                itemName = `Expense #${p.expenseId}`;
            } else {
                itemName = 'Expense Payment (Link Missing)';
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
            caseCount: 1 // For backward compatibility if needed by frontend
        };
    });

    return formattedPayments;
};

const updatePayment = async (id, paymentData) => {
  const { amount, paymentDate, paymentMethod, referenceNumber, notes } = paymentData;
  return await prisma.payment.update({
    where: { id: parseInt(id) },
    data: {
      amount,
      paymentDate: paymentDate ? new Date(paymentDate) : undefined,
      paymentMethod,
      referenceNumber,
      notes,
    },
  });
};

const deletePayment = async (id) => {
  return await prisma.payment.delete({
    where: { id: parseInt(id) },
  });
};

module.exports = {
  createPayment,
  processedBatchPayments,
  getAllPayments,
  updatePayment,
  deletePayment,
};

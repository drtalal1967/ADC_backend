const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Map Prisma enum back to UI-friendly label
const categoryLabel = {
  CONTRACT: 'Employee',
  INVOICE: 'Vendor',
  RECEIPT: 'Payment',
  REPORT: 'Lab Case',
  IMAGE: 'Lab Case',
  EXPENSE: 'Expense',
  DAILY_INCOME_SHEET: 'Daily Income Sheet',
  LICENSE: 'License',
  WORK_PERMIT: 'Work Permit',
  VISA: 'Visa',
  AGREEMENT: 'Agreement',
  ID: 'ID',
  OTHER: 'General',
};

// ➕ Create document
const createDocument = async (docData) => {
  const { vendorId, labCaseId, expenseId, paymentId, employeeId, laboratoryId, leaveRequestId, ...data } = docData;

  const connectData = {};
  if (vendorId) connectData.vendor = { connect: { id: parseInt(vendorId) } };
  if (labCaseId) connectData.labCase = { connect: { id: parseInt(labCaseId) } };
  if (expenseId) connectData.expense = { connect: { id: parseInt(expenseId) } };
  if (paymentId) connectData.payment = { connect: { id: parseInt(paymentId) } };
  if (employeeId) connectData.employee = { connect: { id: parseInt(employeeId) } };
  if (laboratoryId) connectData.laboratory = { connect: { id: parseInt(laboratoryId) } };
  if (leaveRequestId) connectData.leaveRequest = { connect: { id: parseInt(leaveRequestId) } };

  const doc = await prisma.document.create({
    data: {
      ...data,
      description: `[source:document_center] ${data.description || ''}`,
      ...connectData,
    },
    include: { 
      vendor: true, 
      labCase: true, 
      expense: true, 
      payment: true, 
      employee: true, 
      laboratory: true,
      leaveRequest: true 
    }
  });

  return normalizeDoc(doc);
};

const getRelatedInfo = (doc) => {
  if (doc.labCase) {
    return {
      relatedType: 'Lab Case',
      relatedId: doc.labCase.id,
      relatedLabel: `${doc.labCase.patientName || 'Lab Case'}${doc.labCase.patientNumber ? ` (${doc.labCase.patientNumber})` : ''}`,
    };
  }
  if (doc.expense) {
    return {
      relatedType: 'Expense',
      relatedId: doc.expense.id,
      relatedLabel: doc.expense.invoiceNumber || doc.expense.description || `Expense #${doc.expense.id}`,
    };
  }
  if (doc.payment) {
    return {
      relatedType: 'Payment',
      relatedId: doc.payment.id,
      relatedLabel: `Payment #${doc.payment.id}`,
    };
  }
  if (doc.vendor) {
    return {
      relatedType: 'Vendor',
      relatedId: doc.vendor.id,
      relatedLabel: doc.vendor.name,
    };
  }
  if (doc.laboratory) {
    return {
      relatedType: 'Laboratory',
      relatedId: doc.laboratory.id,
      relatedLabel: doc.laboratory.name,
    };
  }
  if (doc.employee) {
    return {
      relatedType: 'Employee',
      relatedId: doc.employee.id,
      relatedLabel: `${doc.employee.firstName || ''} ${doc.employee.lastName || ''}`.trim(),
    };
  }
  if (doc.leaveRequest) {
    return {
      relatedType: 'Leave Request',
      relatedId: doc.leaveRequest.id,
      relatedLabel: `${doc.leaveRequest.leaveType || 'Leave'} Request #${doc.leaveRequest.id}`,
    };
  }
  return {
    relatedType: 'Document Center',
    relatedId: null,
    relatedLabel: 'Document Center',
  };
};

// 🔄 Normalize document
const normalizeDoc = (doc) => ({
  ...doc,
  ...getRelatedInfo(doc),
  category: categoryLabel[doc.category] || doc.category,
  uploadDate: doc.uploadedAt ? doc.uploadedAt.toISOString().split('T')[0] : (doc.createdAt ? doc.createdAt.toISOString().split('T')[0] : ''),
  uploadedBy: doc.uploadedBy || 'Admin',
});

const isAdminUser = (user) => String(user?.role?.name || '').toUpperCase() === 'ADMIN';
const getUserEmployeeId = (user) => Number(user?.employee?.id || user?.employeeId || 0);

// 📄 Get all software attachments
const getAllDocuments = async (user) => {
  const docs = await prisma.document.findMany({
    where: isAdminUser(user)
      ? undefined
      : {
          OR: [
            { leaveRequestId: null },
            { leaveRequest: { employeeId: getUserEmployeeId(user) } },
            { leaveRequest: { leaveType: { not: 'SICK' } } },
          ],
        },
    include: { 
      vendor: true, 
      labCase: true, 
      expense: true, 
      payment: true, 
      employee: true, 
      laboratory: true,
      leaveRequest: true 
    },
    orderBy: [
      { uploadedAt: 'desc' },
      { createdAt: 'desc' },
      { id: 'desc' }
    ]
  });

  return docs.map(normalizeDoc);
};

// ❌ Delete document
const deleteDocument = async (id) => {
  return await prisma.document.delete({
    where: { id: parseInt(id) }
  });
};

// ✅ Export
module.exports = {
  createDocument,
  getAllDocuments,
  deleteDocument
};

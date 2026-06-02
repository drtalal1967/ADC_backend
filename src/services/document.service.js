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
      expense: { include: { vendor: true } }, 
      payment: { include: { expense: { include: { vendor: true } }, labCase: true } }, 
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
    const vendorName = doc.expense.vendor?.name;
    return {
      relatedType: vendorName ? 'Vendor' : 'Expense',
      relatedId: vendorName ? doc.expense.vendorId : doc.expense.id,
      relatedLabel: vendorName || doc.expense.invoiceNumber || doc.expense.description || `Expense #${doc.expense.id}`,
    };
  }
  if (doc.payment) {
    const expenseVendorName = doc.payment.expense?.vendor?.name;
    const labCaseLabel = doc.payment.labCase
      ? `${doc.payment.labCase.patientName || 'Lab Case'}${doc.payment.labCase.patientNumber ? ` (${doc.payment.labCase.patientNumber})` : ''}`
      : '';
    return {
      relatedType: expenseVendorName ? 'Vendor' : (labCaseLabel ? 'Lab Case' : 'Payment'),
      relatedId: expenseVendorName ? doc.payment.expense.vendorId : (doc.payment.labCaseId || doc.payment.id),
      relatedLabel: expenseVendorName || labCaseLabel || `Payment #${doc.payment.id}`,
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

const dedupeDocuments = (docs) => {
  const seen = new Set();
  return docs.filter((doc) => {
    const key = [
      doc.fileUrl,
      doc.fileName,
      doc.title,
      doc.category,
      doc.uploadDate,
      doc.relatedType,
      doc.relatedLabel,
    ].map(value => String(value || '').trim().toLowerCase()).join('|');

    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

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
      expense: { include: { vendor: true } }, 
      payment: { include: { expense: { include: { vendor: true } }, labCase: true } }, 
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

  return dedupeDocuments(docs.map(normalizeDoc));
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

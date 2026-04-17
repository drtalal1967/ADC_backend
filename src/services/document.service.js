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

const createDocument = async (docData) => {
  const { vendorId, labCaseId, expenseId, paymentId, employeeId, laboratoryId, ...data } = docData;
  
  const connectData = {};
  if (vendorId) connectData.vendor = { connect: { id: parseInt(vendorId) } };
  if (labCaseId) connectData.labCase = { connect: { id: parseInt(labCaseId) } };
  if (expenseId) connectData.expense = { connect: { id: parseInt(expenseId) } };
  if (paymentId) connectData.payment = { connect: { id: parseInt(paymentId) } };
  if (employeeId) connectData.employee = { connect: { id: parseInt(employeeId) } };
  if (laboratoryId) connectData.laboratory = { connect: { id: parseInt(laboratoryId) } };

  const doc = await prisma.document.create({
  data: {
    ...data,
    description: `[source:document_center] ${data.description || ''}`, // ✅ add tag
    ...connectData,
  },
    include: { vendor: true, labCase: true, expense: true, payment: true, employee: true, laboratory: true }
  });

  return normalizeDoc(doc);
};

const normalizeDoc = (doc) => ({
  ...doc,
  category: categoryLabel[doc.category] || doc.category,
  uploadDate: doc.createdAt ? doc.createdAt.toISOString().split('T')[0] : '',
  uploadedBy: doc.uploadedBy || 'Admin',
});

const getAllDocuments = async () => {
  const docs = await prisma.document.findMany({
    where: {
      description: {
        startsWith: '[source:document_center]'
      }
    },
    include: { 
      vendor: true, 
      labCase: true, 
      expense: true, 
      payment: true, 
      employee: true, 
      laboratory: true 
    },
    orderBy: [
      { createdAt: 'desc' },
      { id: 'desc' }
    ]
  });

  return docs.map(normalizeDoc);
};

const deleteDocument = async (id) => {
  return await prisma.document.delete({
    where: { id: parseInt(id) }
  });
};

module.exports = {
  createDocument,
  getAllDocuments,
  deleteDocument
};

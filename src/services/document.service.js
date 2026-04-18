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
const createDocument = async (docData) =>

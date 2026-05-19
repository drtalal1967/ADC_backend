const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const normalizeDate = (value) => {
  if (!value) throw new Error('Holiday date is required');
  const datePart = String(value).slice(0, 10);
  const date = new Date(`${datePart}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime())) throw new Error('Invalid holiday date');
  return date;
};

const getPublicHolidays = async (filters = {}) => {
  const where = {};
  if (filters.year) {
    const year = Number(filters.year);
    if (Number.isFinite(year)) {
      where.date = {
        gte: new Date(`${year}-01-01T00:00:00.000Z`),
        lte: new Date(`${year}-12-31T00:00:00.000Z`),
      };
    }
  }

  return prisma.publicHoliday.findMany({
    where,
    orderBy: [{ date: 'asc' }, { id: 'asc' }],
  });
};

const createPublicHoliday = async (data) => {
  return prisma.publicHoliday.create({
    data: {
      name: String(data.name || '').trim() || 'Public Holiday',
      date: normalizeDate(data.date),
      notes: data.notes || null,
    },
  });
};

const updatePublicHoliday = async (id, data) => {
  const updateData = {};
  if (data.name !== undefined) updateData.name = String(data.name || '').trim() || 'Public Holiday';
  if (data.date !== undefined) updateData.date = normalizeDate(data.date);
  if (data.notes !== undefined) updateData.notes = data.notes || null;

  return prisma.publicHoliday.update({
    where: { id: parseInt(id, 10) },
    data: updateData,
  });
};

const deletePublicHoliday = async (id) => {
  return prisma.publicHoliday.delete({
    where: { id: parseInt(id, 10) },
  });
};

module.exports = {
  getPublicHolidays,
  createPublicHoliday,
  updatePublicHoliday,
  deletePublicHoliday,
};
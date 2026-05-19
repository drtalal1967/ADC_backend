const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const normalizeDate = (value, fieldName = 'Holiday date') => {
  if (!value) throw new Error(`${fieldName} is required`);
  const datePart = String(value).slice(0, 10);
  const date = new Date(`${datePart}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime())) throw new Error(`Invalid ${fieldName.toLowerCase()}`);
  return date;
};

const getPublicHolidays = async (filters = {}) => {
  const where = {};

  if (filters.start || filters.end) {
    const start = normalizeDate(filters.start || filters.end, 'Start date');
    const end = normalizeDate(filters.end || filters.start, 'End date');
    where.AND = [
      { date: { lte: end } },
      { endDate: { gte: start } },
    ];
  } else if (filters.year) {
    const year = Number(filters.year);
    if (Number.isFinite(year)) {
      const yearStart = new Date(`${year}-01-01T00:00:00.000Z`);
      const yearEnd = new Date(`${year}-12-31T00:00:00.000Z`);
      where.AND = [
        { date: { lte: yearEnd } },
        { endDate: { gte: yearStart } },
      ];
    }
  }

  return prisma.publicHoliday.findMany({
    where,
    orderBy: [{ date: 'asc' }, { id: 'asc' }],
  });
};

const buildHolidayData = (data = {}) => {
  const startDate = normalizeDate(data.date || data.startDate, 'Start date');
  const endDate = normalizeDate(data.endDate || data.date || data.startDate, 'End date');
  if (endDate < startDate) throw new Error('Holiday end date cannot be before start date');

  return {
    name: String(data.name || '').trim() || 'Public Holiday',
    date: startDate,
    endDate,
    notes: data.notes || null,
  };
};

const createPublicHoliday = async (data) => {
  return prisma.publicHoliday.create({ data: buildHolidayData(data) });
};

const updatePublicHoliday = async (id, data) => {
  const existing = await prisma.publicHoliday.findUnique({ where: { id: parseInt(id, 10) } });
  if (!existing) throw new Error('Public holiday not found');

  const next = {
    name: data.name !== undefined ? data.name : existing.name,
    date: data.date !== undefined || data.startDate !== undefined ? (data.date || data.startDate) : existing.date,
    endDate: data.endDate !== undefined ? data.endDate : (data.date !== undefined || data.startDate !== undefined ? (data.date || data.startDate) : existing.endDate),
    notes: data.notes !== undefined ? data.notes : existing.notes,
  };

  return prisma.publicHoliday.update({
    where: { id: parseInt(id, 10) },
    data: buildHolidayData(next),
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
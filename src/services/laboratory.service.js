const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const getAllLaboratories = async () => {
  return await prisma.laboratory.findMany({
    orderBy: [
      { createdAt: 'desc' },
      { id: 'desc' }
    ]
  });
};

const getLaboratoryById = async (id) => {
  return await prisma.laboratory.findUnique({
    where: { id: parseInt(id) },
  });
};

const buildLaboratoryData = (labData) => {
  const data = {};
  ['name', 'contactName', 'phone', 'email', 'address', 'notes', 'isActive'].forEach((field) => {
    if (Object.prototype.hasOwnProperty.call(labData, field)) {
      data[field] = labData[field];
    }
  });
  return data;
};

const createLaboratory = async (labData) => {
  const { logoUrl } = labData;
  const data = buildLaboratoryData(labData);

  const lab = await prisma.laboratory.create({
    data,
  });

  if (Object.prototype.hasOwnProperty.call(labData, 'logoUrl')) {
    await prisma.$executeRaw`UPDATE laboratories SET logo_url = ${logoUrl || null} WHERE id = ${lab.id}`;
  }

  return { ...lab, logoUrl: logoUrl || null };
};

const updateLaboratory = async (id, labData) => {
  const labId = parseInt(id);
  const { logoUrl } = labData;
  const data = buildLaboratoryData(labData);

  const lab = await prisma.laboratory.update({
    where: { id: labId },
    data,
  });

  if (Object.prototype.hasOwnProperty.call(labData, 'logoUrl')) {
    await prisma.$executeRaw`UPDATE laboratories SET logo_url = ${logoUrl || null} WHERE id = ${labId}`;
  }

  return { ...lab, logoUrl: logoUrl ?? lab.logoUrl ?? null };
};

const deleteLaboratory = async (id) => {
  const labId = parseInt(id);
  // Check if there are any related lab cases
  const casesCount = await prisma.labCase.count({
    where: { laboratoryId: labId }
  });

  if (casesCount > 0) {
    throw new Error(`Cannot delete laboratory: ${casesCount} active cases are linked to this lab.`);
  }

  return await prisma.laboratory.delete({
    where: { id: parseInt(id) },
  });
};

const importLaboratories = async (labsArray) => {
  const dataToInsert = labsArray.map(lab => ({
    name: lab.name || "Unnamed Lab",
    contactName: lab.contactName || null,
    phone: lab.phone || null,
    email: lab.email || null,
    address: lab.address || null,
    notes: lab.notes || null,
    isActive: true
  }));

  return await prisma.laboratory.createMany({
    data: dataToInsert,
    skipDuplicates: true
  });
};

module.exports = {
  getAllLaboratories,
  getLaboratoryById,
  createLaboratory,
  updateLaboratory,
  deleteLaboratory,
  importLaboratories
};

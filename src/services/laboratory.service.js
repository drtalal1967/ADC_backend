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

const createLaboratory = async (labData) => {
  return await prisma.laboratory.create({
    data: labData,
  });
};

const updateLaboratory = async (id, labData) => {
  return await prisma.laboratory.update({
    where: { id: parseInt(id) },
    data: labData,
  });
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
    where: { id: labId },
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

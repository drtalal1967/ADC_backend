const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const getAllLabCases = async (user) => {
  const where = {};
  
  // If user is a dentist, only show their cases
  const roleName = user?.role?.name?.toUpperCase();
  if (roleName === 'DENTIST') {
    const dentistId = user.employee?.id;
    if (dentistId) {
      where.dentistId = dentistId;
    } else {
      // Fallback: fetch employee if not attached to user object
      const employee = await prisma.employee.findUnique({
        where: { userId: user.id }
      });
      if (employee) {
        where.dentistId = employee.id;
      }
    }
  }

  return await prisma.labCase.findMany({
    where,
    include: { dentist: true, laboratory: true, documents: true },
    orderBy: [
      { createdAt: 'desc' },
      { id: 'desc' }
    ]
  });
};

const getLabCaseById = async (id, user) => {
  const where = { id: parseInt(id) };

  // If user is a dentist, only allow them to see their own cases
  const roleName = user?.role?.name?.toUpperCase();
  if (roleName === 'DENTIST') {
    const dentistId = user.employee?.id;
    if (dentistId) {
      where.dentistId = dentistId;
    }
  }

  return await prisma.labCase.findFirst({
    where,
    include: { dentist: true, laboratory: true, payments: true, documents: true, logs: true },
  });
};

const createCaseLog = async (labCaseId, logData, user) => {
  // First verify ownership if dentist
  const existingCase = await getLabCaseById(labCaseId, user);
  if (!existingCase) {
    throw new Error('Lab case not found or access denied');
  }

  const log = await prisma.caseLog.create({
    data: {
      labCaseId: parseInt(labCaseId),
      type: logData.type,
      note: logData.note,
      createdBy: user.id,
    },
  });

  // Automatically update LabCase status based on log type
  let newStatus;
  if (logData.type === 'Pickup') {
    newStatus = 'PICKED_UP'; // Matching standardized enum
  } else if (logData.type === 'Delivery') {
    newStatus = 'COMPLETED';
  }

  if (newStatus) {
    await prisma.labCase.update({
      where: { id: parseInt(labCaseId) },
      data: { status: newStatus }
    });
  }

  return log;
};

const getCaseLogs = async (labCaseId, user) => {
  const labCase = await getLabCaseById(labCaseId, user);
  if (!labCase) return [];

  return await prisma.caseLog.findMany({
    where: { labCaseId: parseInt(labCaseId) },
    orderBy: { createdAt: 'desc' },
  });
};

const createLabCase = async (labCaseData) => {
  const { dentistId, laboratoryId, ...data } = labCaseData;
  
  // Generate a case number if not provided
  const caseNumber = data.caseNumber || `LC-${Date.now()}`;

  return await prisma.labCase.create({
    data: {
      ...data,
      caseNumber,
      branch: labCaseData.branch,
      dentist: { connect: { id: parseInt(dentistId) } },
      laboratory: { connect: { id: parseInt(laboratoryId) } },
    },
  });
};

const updateLabCase = async (id, labCaseData, user) => {
  // First verify ownership if dentist
  const existingCase = await getLabCaseById(id, user);
  if (!existingCase) {
    throw new Error('Lab case not found or access denied');
  }

  const { dentistId, laboratoryId, ...data } = labCaseData;
  const updateData = { ...data };
  
  if (dentistId) updateData.dentist = { connect: { id: parseInt(dentistId) } };
  if (laboratoryId) updateData.laboratory = { connect: { id: parseInt(laboratoryId) } };
  if (labCaseData.branch) updateData.branch = labCaseData.branch;

  return await prisma.labCase.update({
    where: { id: parseInt(id) },
    data: updateData,
  });
};

const deleteLabCase = async (id, user) => {
  // First verify ownership if dentist
  const existingCase = await getLabCaseById(id, user);
  if (!existingCase) {
    throw new Error('Lab case not found or access denied');
  }

  return await prisma.labCase.delete({
    where: { id: parseInt(id) },
  });
};

module.exports = {
  getAllLabCases,
  getLabCaseById,
  createLabCase,
  updateLabCase,
  deleteLabCase,
  createCaseLog,
  getCaseLogs,
};

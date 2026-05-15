const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const normalizeLabCaseStatus = (status) => {
  if (!status) return undefined;
  const value = String(status).trim().toUpperCase().replace(/\s+/g, '_');
  const allowed = new Set(['PENDING', 'PICKED_UP', 'IN_LAB', 'DELIVERED', 'COMPLETED', 'CANCELLED']);
  return allowed.has(value) ? value : undefined;
};

const parseOptionalDate = (value) => {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const generateLabCaseNumber = () => `LC-${Date.now()}`;

const getAllLabCases = async (user) => {
  const where = {};

  const roleName = user?.role?.name?.toUpperCase();
  if (roleName === 'DENTIST') {
    const dentistId = user.employee?.id;
    if (dentistId) {
      where.dentistId = dentistId;
    }
  }

  return await prisma.labCase.findMany({
    where,
    include: {
      dentist: true,
      laboratory: true,
      documents: true,
      payments: {
        include: { documents: true },
        orderBy: [{ paymentDate: 'desc' }, { id: 'desc' }]
      }
    },
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }]
  });
};

const getLabCaseById = async (id, user) => {
  const where = { id: parseInt(id) };

  const roleName = user?.role?.name?.toUpperCase();
  if (roleName === 'DENTIST') {
    const dentistId = user.employee?.id;
    if (dentistId) {
      where.dentistId = dentistId;
    }
  }

  return await prisma.labCase.findFirst({
    where,
    include: {
      dentist: true,
      laboratory: true,
      payments: {
        include: { documents: true },
        orderBy: [{ paymentDate: 'desc' }, { id: 'desc' }]
      },
      documents: true,
      logs: true
    }
  });
};

const createLabCase = async (labCaseData) => {
  const { dentistId, labId } = labCaseData;
  const normalizedStatus = normalizeLabCaseStatus(labCaseData.status);
  const dentistNumericId = Number(dentistId);
  const labNumericId = Number(labId);

  if (!Number.isInteger(dentistNumericId) || dentistNumericId <= 0) {
    throw new Error('Dentist is required');
  }

  if (!Number.isInteger(labNumericId) || labNumericId <= 0) {
    throw new Error('Laboratory is required');
  }

  const data = {
    caseNumber: labCaseData.caseNumber || generateLabCaseNumber(),
    patientName: labCaseData.patientName,
    patientNumber: labCaseData.patientNumber,
    toothNumbers: labCaseData.toothNumbers !== undefined ? String(labCaseData.toothNumbers) : null,
    prosthesisType: labCaseData.prosthesisType,
    cost: Number(labCaseData.cost) || 0,
    branch: labCaseData.branch || null,
    dentist: { connect: { id: dentistNumericId } },
    laboratory: { connect: { id: labNumericId } },
  };

  if (normalizedStatus) data.status = normalizedStatus;

  const expectedDate = parseOptionalDate(labCaseData.expectedDate || labCaseData.dueDate);
  if (expectedDate) data.expectedDate = expectedDate;

  return await prisma.labCase.create({
    data
  });
};

const updateLabCase = async (id, labCaseData, user) => {
  const existingCase = await getLabCaseById(id, user);
  if (!existingCase) {
    throw new Error('Lab case not found or access denied');
  }

  const { dentistId, labId } = labCaseData;

  const updateData = {};

  if (labCaseData.patientName !== undefined) updateData.patientName = labCaseData.patientName;
  if (labCaseData.patientNumber !== undefined) updateData.patientNumber = labCaseData.patientNumber;
  if (labCaseData.toothNumbers !== undefined) updateData.toothNumbers = String(labCaseData.toothNumbers);
  if (labCaseData.prosthesisType !== undefined) updateData.prosthesisType = labCaseData.prosthesisType;
  if (labCaseData.status !== undefined) {
    const normalizedStatus = normalizeLabCaseStatus(labCaseData.status);
    if (normalizedStatus) updateData.status = normalizedStatus;
  }
  if (labCaseData.cost !== undefined) updateData.cost = Number(labCaseData.cost) || 0;
  if (labCaseData.expectedDate !== undefined) {
    updateData.expectedDate = labCaseData.expectedDate
      ? new Date(labCaseData.expectedDate)
      : null;
  }

  if (dentistId) {
    updateData.dentist = {
      connect: { id: Number(dentistId) }
    };
  }

  if (labId) {
    updateData.laboratory = {
      connect: { id: Number(labId) }
    };
  }

  // ✅ correct date mapping
  if (labCaseData.dueDate) {
    const d = new Date(labCaseData.dueDate);
    if (!isNaN(d.getTime())) {
      updateData.expectedDate = d;
    }
  }

  if (labCaseData.branch) {
    updateData.branch = labCaseData.branch;
  }

  console.log("FINAL updateData:", updateData);

  return await prisma.labCase.update({
    where: { id: parseInt(id) },
    data: updateData
  });
};

const deleteLabCase = async (id, user) => {
  const existingCase = await getLabCaseById(id, user);
  if (!existingCase) {
    throw new Error('Lab case not found or access denied');
  }

  return await prisma.labCase.delete({
    where: { id: parseInt(id) }
  });
};

const createCaseLog = async (labCaseId, logData, user) => {
  const existingCase = await getLabCaseById(labCaseId, user);
  if (!existingCase) {
    throw new Error('Lab case not found or access denied');
  }

  const log = await prisma.caseLog.create({
    data: {
      labCaseId: parseInt(labCaseId),
      type: logData.type,
      note: logData.note,
      createdAt: logData.createdAt ? new Date(logData.createdAt) : undefined,
      createdBy: user.id,
    },
  });

  let newStatus;
  if (logData.type === 'Pickup') newStatus = 'PICKED_UP';
  if (logData.type === 'Delivery') newStatus = 'COMPLETED';

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

const deleteCaseLog = async (labCaseId, logId, user) => {
  const labCase = await getLabCaseById(labCaseId, user);
  if (!labCase) {
    throw new Error('Lab case not found or access denied');
  }

  const log = await prisma.caseLog.findFirst({
    where: {
      id: parseInt(logId),
      labCaseId: parseInt(labCaseId)
    }
  });

  if (!log) {
    throw new Error('Log entry not found');
  }

  const deletedLog = await prisma.caseLog.delete({
    where: { id: parseInt(logId) }
  });

  const latestLog = await prisma.caseLog.findFirst({
    where: { labCaseId: parseInt(labCaseId) },
    orderBy: { createdAt: 'desc' }
  });

  let status = 'PENDING';
  if (latestLog?.type === 'Pickup') status = 'PICKED_UP';
  if (latestLog?.type === 'Delivery') status = 'COMPLETED';

  await prisma.labCase.update({
    where: { id: parseInt(labCaseId) },
    data: { status }
  });

  return deletedLog;
};

module.exports = {
  getAllLabCases,
  getLabCaseById,
  createLabCase,
  updateLabCase,
  deleteLabCase,
  createCaseLog,
  getCaseLogs,
  deleteCaseLog,
};

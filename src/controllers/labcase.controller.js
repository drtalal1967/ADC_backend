const labCaseService = require('../services/labcase.service');
const documentService = require('../services/document.service');
const { uploadToImageKit } = require('../services/imagekit.service');

const getAllLabCases = async (req, res, next) => {
  try {
    const cases = await labCaseService.getAllLabCases(req.user);
    res.json(cases);
  } catch (error) {
    next(error);
  }
};

const getLabCaseById = async (req, res, next) => {
  try {
    const labCase = await labCaseService.getLabCaseById(req.params.id, req.user);
    if (!labCase) return res.status(404).json({ message: 'Lab case not found' });
    res.json(labCase);
  } catch (error) {
    next(error);
  }
};

const createLabCase = async (req, res, next) => {
  try {
    const labCase = await labCaseService.createLabCase(req.body);
    res.status(201).json(labCase);
  } catch (error) {
    next(error);
  }
};

const updateLabCase = async (req, res, next) => {
  try {
    const labCase = await labCaseService.updateLabCase(req.params.id, req.body, req.user);
    res.json(labCase);
  } catch (error) {
    next(error);
  }
};

const deleteLabCase = async (req, res, next) => {
  try {
    await labCaseService.deleteLabCase(req.params.id, req.user);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
};

const createCaseLog = async (req, res, next) => {
  try {
    const log = await labCaseService.createCaseLog(req.params.id, req.body, req.user);
    res.status(201).json(log);
  } catch (error) {
    next(error);
  }
};

const getCaseLogs = async (req, res, next) => {
  try {
    const logs = await labCaseService.getCaseLogs(req.params.id, req.user);
    res.json(logs);
  } catch (error) {
    next(error);
  }
};

const deleteCaseLog = async (req, res, next) => {
  try {
    await labCaseService.deleteCaseLog(req.params.id, req.params.logId, req.user);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
};


const uploadLabCaseDocument = async (req, res, next) => {
  try {
    const labCase = await labCaseService.getLabCaseById(req.params.id, req.user);
    if (!labCase) return res.status(404).json({ message: 'Lab case not found or access denied' });
    if (!req.file) return res.status(400).json({ message: 'No file uploaded' });

    const ikResult = await uploadToImageKit(
      req.file.buffer,
      req.file.originalname,
      'dental-documents'
    );

    let uploadedBy = 'Admin';
    if (req.user?.employee) {
      uploadedBy = `${req.user.employee.firstName || ''} ${req.user.employee.lastName || ''}`.trim() || req.user.role?.name || 'Admin';
    } else if (req.user?.role?.name) {
      uploadedBy = req.user.role.name.charAt(0) + req.user.role.name.slice(1).toLowerCase();
    }

    const document = await documentService.createDocument({
      fileName: req.file.originalname,
      fileUrl: ikResult.url,
      fileType: req.file.mimetype,
      fileSizeKb: Math.round(req.file.size / 1024),
      category: 'Lab Case',
      title: req.body.title || req.file.originalname,
      description: req.body.description || 'Lab case attachment',
      branch: req.body.branch || labCase.branch || null,
      uploadedBy,
      labCaseId: req.params.id,
    });

    res.status(201).json(document);
  } catch (error) {
    next(error);
  }
};

const deleteLabCaseDocument = async (req, res, next) => {
  try {
    const labCase = await labCaseService.getLabCaseById(req.params.id, req.user);
    if (!labCase) return res.status(404).json({ message: 'Lab case not found or access denied' });

    const documentId = parseInt(req.params.documentId, 10);
    const document = (labCase.documents || []).find(doc => Number(doc.id) === documentId);
    if (!document) return res.status(404).json({ message: 'Attachment not found for this lab case' });

    await documentService.deleteDocument(documentId);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
};
const getLabCasePayments = async (req, res, next) => {
  try {
    const labCase = await labCaseService.getLabCaseById(req.params.id, req.user);
    res.json(labCase?.payments || []);
  } catch (error) {
    next(error);
  }
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
  uploadLabCaseDocument,
  deleteLabCaseDocument,
  getLabCasePayments,
};

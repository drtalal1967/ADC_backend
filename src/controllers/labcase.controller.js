const labCaseService = require('../services/labcase.service');

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
  getLabCasePayments,
};

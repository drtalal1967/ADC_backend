const dashboardService = require('../services/dashboard.service');

const getStats = async (req, res, next) => {
  try {
    const stats = await dashboardService.getAdminStats(req.user);
    res.json(stats);
  } catch (error) {
    next(error);
  }
};

const getAnalytics = async (req, res, next) => {
  try {
    const { branch } = req.query;
    const analytics = await dashboardService.getFinancialAnalytics(branch);
    res.json(analytics);
  } catch (error) {
    next(error);
  }
};

const addFinancialEntry = async (req, res, next) => {
  try {
    const entry = await dashboardService.createMonthlyFinancial(req.body);
    res.status(201).json(entry);
  } catch (error) {
    next(error);
  }
};

const getFinancialEntries = async (req, res, next) => {
  try {
    const { branch } = req.query;
    const entries = await dashboardService.getMonthlyFinancials(branch);
    res.json(entries);
  } catch (error) {
    next(error);
  }
};

const deleteFinancialEntry = async (req, res, next) => {
  try {
    await dashboardService.deleteMonthlyFinancial(req.params.id);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getStats,
  getAnalytics,
  addFinancialEntry,
  getFinancialEntries,
  deleteFinancialEntry
};

const publicHolidayService = require('../services/publicHoliday.service');

const getPublicHolidays = async (req, res, next) => {
  try {
    const holidays = await publicHolidayService.getPublicHolidays(req.query);
    res.json(holidays || []);
  } catch (error) {
    next(error);
  }
};

const createPublicHoliday = async (req, res, next) => {
  try {
    const holiday = await publicHolidayService.createPublicHoliday(req.body);
    res.status(201).json(holiday);
  } catch (error) {
    next(error);
  }
};

const updatePublicHoliday = async (req, res, next) => {
  try {
    const holiday = await publicHolidayService.updatePublicHoliday(req.params.id, req.body);
    res.json(holiday);
  } catch (error) {
    next(error);
  }
};

const deletePublicHoliday = async (req, res, next) => {
  try {
    await publicHolidayService.deletePublicHoliday(req.params.id);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getPublicHolidays,
  createPublicHoliday,
  updatePublicHoliday,
  deletePublicHoliday,
};
const paymentService = require('../services/payment.service');

const createPayment = async (req, res, next) => {
  try {
    const payment = await paymentService.createPayment(req.body);
    res.status(201).json(payment);
  } catch (error) {
    next(error);
  }
};

const processBatchPayments = async (req, res, next) => {
  try {
    const results = await paymentService.processedBatchPayments(req.body);
    res.status(201).json(results);
  } catch (error) {
    next(error);
  }
};

const getAllPayments = async (req, res, next) => {
  try {
    const payments = await paymentService.getAllPayments();
    res.json(payments || []);
  } catch (error) {
    next(error);
  }
};

const updatePayment = async (req, res, next) => {
  try {
    const payment = await paymentService.updatePayment(req.params.id, req.body);
    res.json(payment);
  } catch (error) {
    next(error);
  }
};

const deletePayment = async (req, res, next) => {
  try {
    await paymentService.deletePayment(req.params.id);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createPayment,
  processBatchPayments,
  getAllPayments,
  updatePayment,
  deletePayment,
};

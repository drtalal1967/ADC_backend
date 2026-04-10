const expenseService = require('../services/expense.service');

const getAllExpenses = async (req, res, next) => {
  try {
    const expenses = await expenseService.getAllExpenses();
    res.json(expenses);
  } catch (error) {
    next(error);
  }
};

const getExpenseById = async (req, res, next) => {
  try {
    const expense = await expenseService.getExpenseById(req.params.id);
    if (!expense) return res.status(404).json({ message: 'Expense not found' });
    res.json(expense);
  } catch (error) {
    next(error);
  }
};

const createExpense = async (req, res, next) => {
  try {
    const expense = await expenseService.createExpense(req.body);
    res.status(201).json(expense);
  } catch (error) {
    next(error);
  }
};

const updateExpense = async (req, res, next) => {
  try {
    const expense = await expenseService.updateExpense(req.params.id, req.body);
    res.json(expense);
  } catch (error) {
    next(error);
  }
};

const deleteExpense = async (req, res, next) => {
  try {
    await expenseService.deleteExpense(req.params.id);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
};

const processBatchPayment = async (req, res, next) => {
  try {
    const result = await expenseService.processBatchPayment(req.body);
    res.json(result);
  } catch (error) {
    next(error);
  }
};

const importExpenses = async (req, res, next) => {
  try {
    const result = await expenseService.importExpenses(req.body);
    res.json({
      message: 'Expenses imported successfully',
      count: result.count
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAllExpenses,
  getExpenseById,
  createExpense,
  updateExpense,
  deleteExpense,
  processBatchPayment,
  importExpenses
};

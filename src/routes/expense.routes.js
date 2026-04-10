const express = require('express');
const expenseController = require('../controllers/expense.controller');
const { authMiddleware, checkPermission } = require('../middleware/auth.middleware');

const router = express.Router();

router.use(authMiddleware);

router.get('/', checkPermission('expenses', 'canView'), expenseController.getAllExpenses);
router.get('/:id', checkPermission('expenses', 'canView'), expenseController.getExpenseById);
router.post('/', checkPermission('expenses', 'canCreate'), expenseController.createExpense);
router.post('/import', checkPermission('expenses', 'canCreate'), expenseController.importExpenses);
router.post('/batch-payment', checkPermission('expenses', 'canUpdate'), expenseController.processBatchPayment); // Mapping update to batch payment
router.put('/:id', checkPermission('expenses', 'canUpdate'), expenseController.updateExpense);
router.delete('/:id', checkPermission('expenses', 'canDelete'), expenseController.deleteExpense);

module.exports = router;

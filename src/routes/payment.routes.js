const express = require('express');
const router = express.Router();

const paymentController = require('../controllers/payment.controller');
const { authMiddleware, checkPermission, checkAnyPermission } = require('../middleware/auth.middleware');

router.use(authMiddleware);

// âž• Single payment
router.post('/', checkAnyPermission([
  { module: 'payments', action: 'create' },
  { module: 'lab_case_financials', action: 'create' },
]), paymentController.createPayment);

// âž• Batch payments (REQUIRED for lab cases)
router.post('/batch', checkAnyPermission([
  { module: 'payments', action: 'create' },
  { module: 'lab_case_financials', action: 'create' },
]), paymentController.processBatchPayments);

// ðŸ“Š Get raw
router.get('/', checkPermission('payments', 'view'), paymentController.getAllPayments);

// ðŸ“Š Get formatted
router.get('/all', checkPermission('payments', 'view'), paymentController.getAllCombined);

// âœï¸ Update
router.put('/:id', checkAnyPermission([
  { module: 'payments', action: 'update' },
  { module: 'lab_case_financials', action: 'update' },
]), paymentController.updatePayment);

// âŒ Delete
router.delete('/:id', checkAnyPermission([
  { module: 'payments', action: 'delete' },
  { module: 'lab_case_financials', action: 'delete' },
]), paymentController.deletePayment);

module.exports = router;

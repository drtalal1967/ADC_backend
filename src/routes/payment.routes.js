const express = require('express');
const router = express.Router();

const paymentController = require('../controllers/payment.controller');
const { authMiddleware, checkPermission } = require('../middleware/auth.middleware');

router.use(authMiddleware);

// âž• Single payment
router.post('/', checkPermission('payments', 'create'), paymentController.createPayment);

// âž• Batch payments (REQUIRED for lab cases)
router.post('/batch', checkPermission('payments', 'create'), paymentController.processBatchPayments);

// ðŸ“Š Get raw
router.get('/', checkPermission('payments', 'view'), paymentController.getAllPayments);

// ðŸ“Š Get formatted
router.get('/all', checkPermission('payments', 'view'), paymentController.getAllCombined);

// âœï¸ Update
router.put('/:id', checkPermission('payments', 'update'), paymentController.updatePayment);

// âŒ Delete
router.delete('/:id', checkPermission('payments', 'delete'), paymentController.deletePayment);

module.exports = router;

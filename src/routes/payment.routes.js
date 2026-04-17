const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/payment.controller');
const { authMiddleware, checkPermission } = require('../middleware/auth.middleware');

// 🔐 Apply authentication to all routes
router.use(authMiddleware);

// ➕ Create payment
router.post('/', checkPermission('payments', 'canCreate'), paymentController.createPayment);

// ➕ Batch payments
router.post('/batch', checkPermission('payments', 'canCreate'), paymentController.processBatchPayments);

// 📊 ALL PAYMENTS (formatted for frontend)
router.get('/all', checkPermission('payments', 'canView'), paymentController.getAllCombined);

// 📄 RAW payments (optional / internal use)
router.get('/', checkPermission('payments', 'canView'), paymentController.getAllPayments);

// ✏️ Update payment
router.put('/:id', checkPermission('payments', 'canUpdate'), paymentController.updatePayment);

// ❌ Delete payment
router.delete('/:id', checkPermission('payments', 'canDelete'), paymentController.deletePayment);

module.exports = router;

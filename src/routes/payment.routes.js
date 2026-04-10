const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/payment.controller');
const { authMiddleware, checkPermission } = require('../middleware/auth.middleware');

router.use(authMiddleware);

router.post('/', checkPermission('payments', 'canCreate'), paymentController.createPayment);
router.post('/batch', checkPermission('payments', 'canCreate'), paymentController.processBatchPayments);
router.get('/all', checkPermission('payments', 'canView'), paymentController.getAllPayments);
router.get('/', checkPermission('payments', 'canView'), paymentController.getAllPayments);
router.put('/:id', checkPermission('payments', 'canUpdate'), paymentController.updatePayment);
router.delete('/:id', checkPermission('payments', 'canDelete'), paymentController.deletePayment);

module.exports = router;

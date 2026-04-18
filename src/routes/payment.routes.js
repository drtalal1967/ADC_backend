const express = require('express');
const router = express.Router();

const paymentController = require('../controllers/payment.controller');

// ➕ Single payment
router.post('/', paymentController.createPayment);

// ➕ Batch payments (REQUIRED for lab cases)
router.post('/batch', paymentController.processBatchPayments);

// 📊 Get raw
router.get('/', paymentController.getAllPayments);

// 📊 Get formatted
router.get('/all', paymentController.getAllCombined);

// ✏️ Update
router.put('/:id', paymentController.updatePayment);

// ❌ Delete
router.delete('/:id', paymentController.deletePayment);

module.exports = router;

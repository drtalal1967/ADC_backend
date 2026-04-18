const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/payment.controller');

// Create single payment
router.post('/', paymentController.createPayment);

// ✅ Batch payments (FIXED)
router.post('/batch', paymentController.processBatchPayments);

// Get all payments (formatted)
router.get('/all', paymentController.getAllCombined);

// Get raw payments
router.get('/', paymentController.getAllPayments);

// Update payment
router.put('/:id', paymentController.updatePayment);

// Delete payment
router.delete('/:id', paymentController.deletePayment);

module.exports = router;

const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/payment.controller');

// TEMP: remove middleware to isolate issue

router.post('/', paymentController.createPayment);
router.get('/all', paymentController.getAllCombined);
router.get('/', paymentController.getAllPayments);
router.put('/:id', paymentController.updatePayment);
router.delete('/:id', paymentController.deletePayment);

module.exports = router;

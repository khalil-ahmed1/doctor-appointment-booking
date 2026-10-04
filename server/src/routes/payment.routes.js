const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/payment.controller');
const { protect, authorize } = require('../middlewares/auth');

router.post('/create-order', protect, authorize('PATIENT'), paymentController.createOrder);
router.post('/verify', protect, authorize('PATIENT'), paymentController.verifyPayment);

module.exports = router;

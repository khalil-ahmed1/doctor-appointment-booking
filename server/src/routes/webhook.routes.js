const express = require('express');
const router = express.Router();
const webhookController = require('../controllers/webhook.controller');

// IMPORTANT: We use express.raw({ type: 'application/json' }) here
// so that req.body remains a Buffer for signature verification.
// This route must be mounted before any global express.json() middleware.
router.post(
  '/razorpay',
  express.raw({ type: 'application/json' }),
  webhookController.razorpayWebhook,
);

module.exports = router;

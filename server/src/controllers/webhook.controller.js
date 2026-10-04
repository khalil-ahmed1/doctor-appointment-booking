const crypto = require('crypto');
const WebhookEvent = require('../models/WebhookEvent');
const paymentService = require('../services/payment.service');
const logger = require('../utils/logger');

// Fire-and-forget processor
const processWebhookEvent = async (eventDoc) => {
  try {
    const payload = eventDoc.payload;
    const eventType = payload.event;

    if (eventType === 'payment.captured' || eventType === 'order.paid') {
      const paymentEntity = payload.payload.payment.entity;
      const orderId = paymentEntity.order_id;
      const paymentId = paymentEntity.id;

      if (orderId && paymentId) {
        // Check payment type
        const Payment = require('../models/Payment');
        const paymentRecord = await Payment.findOne({ razorpayOrderId: orderId });

        if (paymentRecord) {
          if (paymentRecord.type === 'SUBSCRIPTION') {
            const subscriptionService = require('../services/subscription.service');
            await subscriptionService.finalizeSubscriptionPayment(orderId, paymentId);
          } else {
            await paymentService.finalizePayment(orderId, paymentId);
          }
        }
      }
    } else if (eventType.startsWith('account.')) {
      const accountEntity = payload.payload.account.entity;
      const accountId = accountEntity.id;

      let newStatus = 'UNDER_REVIEW';
      if (eventType === 'account.activated') newStatus = 'ACTIVE';
      else if (eventType === 'account.needs_clarification') newStatus = 'NEEDS_CLARIFICATION';
      else if (eventType === 'account.rejected') newStatus = 'REJECTED';
      else if (eventType === 'account.suspended') newStatus = 'SUSPENDED';

      const DoctorProfile = require('../models/DoctorProfile');
      await DoctorProfile.updateOne(
        { 'payout.linkedAccountId': accountId },
        {
          $set: {
            'payout.status': newStatus,
            'payout.lastSyncedAt': new Date(),
          },
        },
      );
    }
    // Add logic for refund.processed, refund.failed etc. in Phase 3

    eventDoc.status = 'PROCESSED';
    eventDoc.processedAt = new Date();
    await eventDoc.save();
  } catch (error) {
    logger.error(`Webhook processing failed for event ${eventDoc.eventId}:`, error);
    eventDoc.status = 'FAILED';
    eventDoc.error = error.message;
    await eventDoc.save();
  }
};

exports.razorpayWebhook = async (req, res) => {
  try {
    const signature = req.headers['x-razorpay-signature'];
    const secret = process.env.RAZORPAY_WEBHOOK_SECRET || 'test_webhook_secret';

    // Verify signature using crypto
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(req.body) // req.body is a Buffer/String here due to express.raw
      .digest('hex');

    if (expectedSignature !== signature) {
      logger.warn('Invalid Razorpay webhook signature');
      return res.status(400).send('Invalid signature');
    }

    const payload = JSON.parse(req.body.toString());
    const eventId = payload.custom_event_id || req.headers['x-razorpay-event-id'];

    if (!eventId) {
      return res.status(400).send('Missing event ID');
    }

    // Idempotency check
    const existingEvent = await WebhookEvent.findOne({ eventId });
    if (existingEvent) {
      // Already processed or processing, return 200 to acknowledge
      return res.status(200).send('OK');
    }

    // Save event to DB
    const eventDoc = await WebhookEvent.create({
      eventId,
      event: payload.event,
      source: 'RAZORPAY',
      status: 'PENDING',
      payload,
    });

    // Respond 200 quickly
    res.status(200).send('OK');

    // Process asynchronously
    processWebhookEvent(eventDoc);
  } catch (error) {
    logger.error('Webhook endpoint error:', error);
    // Even on structural error, we return 200 or 400 so Razorpay knows we received it
    res.status(400).send('Webhook Error');
  }
};

const cron = require('node-cron');
const Appointment = require('../models/Appointment');
const Payment = require('../models/Payment');
const logger = require('../utils/logger');
const paymentService = require('../services/payment.service');

// Job 1: Expire Holds
// Runs every minute
const expireHolds = async () => {
  try {
    const now = new Date();

    // Find appointments that are PENDING_PAYMENT and hold has expired
    const expiredAppointments = await Appointment.find({
      status: 'PENDING_PAYMENT',
      holdExpiresAt: { $lt: now },
    });

    for (const appt of expiredAppointments) {
      // Note: We use atomic operations and don't blindly update.
      // We will set status to EXPIRED and unset slotLock
      await Appointment.updateOne(
        { _id: appt._id, status: 'PENDING_PAYMENT' },
        {
          $set: { status: 'EXPIRED' },
          $unset: { slotLock: 1 },
          $push: {
            statusHistory: {
              from: 'PENDING_PAYMENT',
              to: 'EXPIRED',
              byRole: 'SYSTEM',
              at: now,
              reason: 'Hold expired',
            },
          },
        },
      );
      logger.info(`Expired hold for appointment: ${appt._id}`);
    }
  } catch (err) {
    logger.error(`Error in expireHolds job: ${err.message}`);
  }
};

// Job 2: Expire Normal Tokens
// Runs every hour
const expireNormalTokens = async () => {
  try {
    const now = new Date();

    // Find NORMAL appointments that are CONFIRMED and validity has passed
    const expiredTokens = await Appointment.find({
      type: 'NORMAL',
      status: 'CONFIRMED',
      validUntil: { $lt: now },
    });

    for (const appt of expiredTokens) {
      await Appointment.updateOne(
        { _id: appt._id, status: 'CONFIRMED' },
        {
          $set: { status: 'EXPIRED_TOKEN' },
          $push: {
            statusHistory: {
              from: 'CONFIRMED',
              to: 'EXPIRED_TOKEN',
              byRole: 'SYSTEM',
              at: now,
              reason: 'Token validity expired',
            },
          },
        },
      );
      logger.info(`Expired normal token for appointment: ${appt._id}`);
    }
  } catch (err) {
    logger.error(`Error in expireNormalTokens job: ${err.message}`);
  }
};

// Job 3: Reconcile Payments
// Runs every 10 minutes
const reconcilePayments = async () => {
  try {
    const fifteenMinsAgo = new Date(Date.now() - 15 * 60 * 1000);

    // Find payments stuck in CREATED or ATTEMPTED
    const stuckPayments = await Payment.find({
      status: { $in: ['CREATED', 'ATTEMPTED'] },
      createdAt: { $lt: fifteenMinsAgo },
    });

    const razorpayService = require('../services/razorpay.service');
    const rzp = razorpayService.getRazorpayInstance();

    for (const payment of stuckPayments) {
      try {
        if (!payment.razorpayOrderId) continue;

        // Fetch order's payments from Razorpay
        const payments = await rzp.orders.fetchPayments(payment.razorpayOrderId);

        let capturedPayment = null;
        let failedPayment = null;

        if (payments && payments.items && payments.items.length > 0) {
          for (const p of payments.items) {
            if (p.status === 'captured') capturedPayment = p;
            else if (p.status === 'failed') failedPayment = p;
          }
        }

        if (capturedPayment) {
          logger.info(
            `Reconciling captured payment ${capturedPayment.id} for order ${payment.razorpayOrderId}`,
          );
          await paymentService.finalizePayment(payment.razorpayOrderId, capturedPayment.id);
        } else if (failedPayment) {
          // It failed and was never captured
          payment.status = 'FAILED';
          await payment.save();

          const appt = await Appointment.findById(payment.appointment);
          if (appt && appt.status === 'PENDING_PAYMENT') {
            appt.status = 'PAYMENT_FAILED';
            appt.statusHistory.push({
              from: 'PENDING_PAYMENT',
              to: 'PAYMENT_FAILED',
              byRole: 'SYSTEM',
              at: new Date(),
              reason: 'Payment failed at gateway',
            });
            // If premium/home, we might need to unlock slotLock. But wait, expireHolds handles unlocking.
            // We can just unset it here too if not already expired.
            await appt.save();
          }
        }
      } catch (innerErr) {
        logger.error(`Failed to reconcile payment ${payment._id}: ${innerErr.message}`);
      }
    }
  } catch (err) {
    logger.error(`Error in reconcilePayments job: ${err.message}`);
  }
};

// Job 4: Retry Transfers & Refunds
// Runs every 15 minutes
const retryTransfersAndRefunds = async () => {
  try {
    // 1. Retry failed refunds
    const paymentsWithFailedRefunds = await Payment.find({
      'refunds.status': 'FAILED',
    });

    for (const payment of paymentsWithFailedRefunds) {
      for (let i = 0; i < payment.refunds.length; i++) {
        const refund = payment.refunds[i];
        if (refund.status === 'FAILED') {
          try {
            logger.info(`Retrying failed refund for payment ${payment._id}`);
            const razorpayService = require('../services/razorpay.service');
            const rzpRefund = await razorpayService.refundPayment(
              payment.razorpayPaymentId,
              refund.amount,
              {
                reason: refund.reason,
              },
            );

            refund.status = 'PROCESSED';
            refund.razorpayRefundId = rzpRefund.id;
            payment.status = 'REFUNDED';
            await payment.save();
          } catch (e) {
            logger.error(`Retry refund failed for payment ${payment._id}: ${e.message}`);
            // leave as FAILED to retry again later
          }
        }
      }
    }

    // 2. Retry failed transfers (if any)
    const paymentsWithFailedTransfers = await Payment.find({
      'transfers.status': 'failed',
    });

    for (const payment of paymentsWithFailedTransfers) {
      const appt = await Appointment.findById(payment.appointment).populate('doctor');
      if (!appt || !appt.doctor || !appt.doctor.payout || !appt.doctor.payout.linkedAccountId)
        continue;

      for (let i = 0; i < payment.transfers.length; i++) {
        const transfer = payment.transfers[i];
        if (transfer.status === 'failed') {
          try {
            logger.info(`Retrying failed transfer for payment ${payment._id}`);
            const razorpayService = require('../services/razorpay.service');
            const rzpTransfer = await razorpayService.createTransfer(
              payment.razorpayPaymentId,
              transfer.amount,
              appt.doctor.payout.linkedAccountId,
              { appointmentId: appt._id.toString() },
            );

            transfer.status = rzpTransfer.status || 'processed';
            transfer.razorpayTransferId = rzpTransfer.id;
            await payment.save();
          } catch (e) {
            logger.error(`Retry transfer failed for payment ${payment._id}: ${e.message}`);
          }
        }
      }
    }
  } catch (err) {
    logger.error(`Error in retryTransfersAndRefunds job: ${err.message}`);
  }
};

const startMaintenanceJobs = () => {
  // Every minute
  cron.schedule('* * * * *', expireHolds);

  // Every hour at minute 0
  cron.schedule('0 * * * *', expireNormalTokens);

  // Every 10 minutes
  cron.schedule('*/10 * * * *', reconcilePayments);

  // Every 15 minutes
  cron.schedule('*/15 * * * *', retryTransfersAndRefunds);

  logger.info('Maintenance background jobs started');
};

module.exports = {
  startMaintenanceJobs,
  expireHolds,
  expireNormalTokens,
  reconcilePayments,
  retryTransfersAndRefunds,
};

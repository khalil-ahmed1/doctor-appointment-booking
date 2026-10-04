const mongoose = require('mongoose');
const Payment = require('../models/Payment');
const Appointment = require('../models/Appointment');
const DoctorProfile = require('../models/DoctorProfile');
const razorpayService = require('./razorpay.service');
const ApiError = require('../utils/ApiError');

const createAppointmentOrder = async (appointmentId) => {
  const appointment = await Appointment.findById(appointmentId).populate('doctor');
  if (!appointment) {
    throw new ApiError(404, 'NOT_FOUND', 'Appointment not found');
  }

  if (appointment.status !== 'PENDING_PAYMENT') {
    throw new ApiError(400, 'INVALID_STATE', 'Appointment is not pending payment');
  }

  const { fee } = appointment;
  if (!fee || !fee.total) {
    throw new ApiError(500, 'SERVER_ERROR', 'Fee snapshot missing on appointment');
  }

  // Create Razorpay Order
  const rzpOrder = await razorpayService.createOrder(fee.total, appointment.bookingCode, {
    appointmentId: appointment._id.toString(),
    doctorId: appointment.doctor._id.toString(),
    type: appointment.type,
    patientId: appointment.patient.toString(),
  });

  // Create Payment Document
  const payment = await Payment.create({
    type: 'CONSULTATION',
    appointment: appointment._id,
    razorpayOrderId: rzpOrder.id,
    amount: fee.total,
    status: 'CREATED',
    breakdown: fee,
  });

  // Link payment to appointment
  appointment.payment = payment._id;
  await appointment.save();

  return {
    orderId: rzpOrder.id,
    amount: fee.total,
    currency: 'INR',
    paymentId: payment._id,
  };
};

const finalizePayment = async (razorpayOrderId, razorpayPaymentId) => {
  // Guard: Find payment by order ID and lock it (or at least check if already captured)
  // We'll do an optimistic lock / status check
  const payment = await Payment.findOne({ razorpayOrderId });
  if (!payment) {
    throw new ApiError(404, 'NOT_FOUND', 'Payment record not found');
  }

  if (payment.status === 'CAPTURED') {
    return { status: 'ALREADY_PROCESSED', appointmentId: payment.appointment };
  }

  const appointment = await Appointment.findById(payment.appointment);
  if (!appointment) {
    throw new ApiError(404, 'NOT_FOUND', 'Associated appointment not found');
  }

  const now = new Date();
  const isHoldExpired = appointment.holdExpiresAt && appointment.holdExpiresAt < now;

  // CASE D: Duplicate capture for an ALREADY confirmed appointment
  // E.g. User opened two tabs, paid in both. The first one confirmed the appointment.
  if (['CONFIRMED', 'CHECKED_IN', 'IN_PROGRESS', 'COMPLETED'].includes(appointment.status)) {
    if (appointment.payment.toString() !== payment._id.toString()) {
      // It's a duplicate different payment for the same appointment
      await refundPaymentProcess(
        payment,
        razorpayPaymentId,
        'Duplicate payment for confirmed appointment',
      );
      return { status: 'REFUNDED_DUPLICATE', appointmentId: appointment._id };
    }
  }

  // We need atomic operations to re-acquire locks if necessary
  const session = await mongoose.startSession();
  let finalStatus = '';

  try {
    await session.withTransaction(async () => {
      // Reload appointment inside transaction
      const appt = await Appointment.findById(appointment._id).session(session);

      const assignNormalToken = async () => {
        if (appt.type !== 'NORMAL') return true;
        const Counter = require('../models/Counter');

        // Final re-check if hold expired
        if (isHoldExpired) {
          const doctor = await DoctorProfile.findById(appt.doctor).session(session);
          const limit = doctor.types.normal.dailyTokenLimit || 0;
          if (limit > 0) {
            const currentDaily = await Counter.findOne({
              key: `ntoken:${appt.doctor}:${appt.dateStr}`,
            }).session(session);
            if (currentDaily && currentDaily.value >= limit) {
              return false; // Slot lost (daily limit exceeded)
            }
          }
        }

        const seq = await Counter.findOneAndUpdate(
          { key: `ntoken:${appt.doctor}` },
          { $inc: { value: 1 } },
          { upsert: true, new: true, session },
        );
        const daily = await Counter.findOneAndUpdate(
          { key: `ntoken:${appt.doctor}:${appt.dateStr}` },
          { $inc: { value: 1 } },
          { upsert: true, new: true, session },
        );

        appt.tokenSeq = seq.value;
        appt.tokenLabel = `N-${String(daily.value).padStart(3, '0')}`;

        // Validity is today + 2 days (assuming setting default normalValidityDays = 2)
        // In Phase 2 this comes from settings
        const normalValidityDays = 2;
        const nowMs = Date.now();
        appt.validFrom = new Date(nowMs);
        appt.validUntil = new Date(nowMs + normalValidityDays * 24 * 60 * 60 * 1000);

        return true;
      };

      // CASE A: Normal happy path
      if (appt.status === 'PENDING_PAYMENT' && !isHoldExpired) {
        await assignNormalToken();

        appt.status = 'CONFIRMED';
        appt.confirmedAt = now;
        appt.paymentStatus = 'PAID';
        appt.statusHistory.push({
          from: 'PENDING_PAYMENT',
          to: 'CONFIRMED',
          byRole: 'SYSTEM',
          at: now,
          reason: 'Payment captured',
        });
        await appt.save({ session });

        await Payment.updateOne(
          { _id: payment._id },
          { $set: { status: 'CAPTURED', razorpayPaymentId } },
          { session },
        );

        finalStatus = 'CONFIRMED';
      }
      // CASE B & C: Hold expired or failed, but user paid late
      else if (
        appt.status === 'EXPIRED' ||
        appt.status === 'PAYMENT_FAILED' ||
        (appt.status === 'PENDING_PAYMENT' && isHoldExpired)
      ) {
        // Try to re-acquire the slot lock or token limit
        let canReacquire = true;

        if (appt.type === 'NORMAL') {
          canReacquire = await assignNormalToken();
        } else {
          const slotLock = `${appt.doctor}|${appt.dateStr}|${appt.startTime}`;
          const conflictingAppt = await Appointment.findOne({
            slotLock,
            _id: { $ne: appt._id },
          }).session(session);
          if (conflictingAppt) canReacquire = false;
          else appt.slotLock = slotLock; // re-lock it
        }

        if (canReacquire) {
          // CASE B: Slot is still free! Re-acquire and confirm
          appt.status = 'CONFIRMED';
          appt.confirmedAt = now;
          appt.paymentStatus = 'PAID';
          appt.statusHistory.push({
            from: appt.status,
            to: 'CONFIRMED',
            byRole: 'SYSTEM',
            at: now,
            reason: 'Late payment honored',
          });
          await appt.save({ session });

          await Payment.updateOne(
            { _id: payment._id },
            { $set: { status: 'CAPTURED', razorpayPaymentId } },
            { session },
          );

          finalStatus = 'CONFIRMED_LATE';
        } else {
          // CASE C: Slot was taken by someone else
          // We must fail this appointment and trigger a refund
          appt.status = 'PAYMENT_FAILED';
          appt.paymentStatus = 'AUTO_REFUND_PENDING';
          if (appt.type !== 'NORMAL') appt.slotLock = null; // Ensure unlocked
          appt.statusHistory.push({
            from: appt.status,
            to: 'PAYMENT_FAILED',
            byRole: 'SYSTEM',
            at: now,
            reason: 'Slot lost during late payment',
          });
          await appt.save({ session });

          await Payment.updateOne(
            { _id: payment._id },
            { $set: { status: 'AUTO_REFUND_PENDING', razorpayPaymentId } },
            { session },
          );

          finalStatus = 'SLOT_LOST_REFUNDING';
        }
      }
    });
  } catch (error) {
    if (error.code === 11000) {
      // CASE C alternative trigger (Index collision during transaction)
      finalStatus = 'SLOT_LOST_REFUNDING';
    } else {
      throw error; // Re-throw unhandled DB errors
    }
  } finally {
    await session.endSession();
  }

  // Process async refund outside transaction if CASE C
  if (finalStatus === 'SLOT_LOST_REFUNDING') {
    await refundPaymentProcess(
      payment,
      razorpayPaymentId,
      'Slot no longer available, full refund initiated',
    );
  }

  // Trigger notifications and transfer
  if (finalStatus === 'CONFIRMED' || finalStatus === 'CONFIRMED_LATE') {
    const notificationService = require('./notification.service');
    // Run asynchronously without waiting
    notificationService.sendBookingConfirmation(appointment._id).catch((err) => {
      const logger = require('../utils/logger');
      logger.error(`Notification trigger failed: ${err.message}`);
    });

    processTransfer(payment._id, appointment._id, razorpayPaymentId).catch((err) => {
      const logger = require('../utils/logger');
      logger.error(`Transfer process trigger failed: ${err.message}`);
    });
  }

  return { status: finalStatus, appointmentId: appointment._id };
};

const processTransfer = async (paymentId, appointmentId, razorpayPaymentId) => {
  const payment = await Payment.findById(paymentId);
  const appointment = await Appointment.findById(appointmentId);
  if (!payment || !appointment) return;

  try {
    const doctor = await DoctorProfile.findById(appointment.doctor);
    if (!doctor || !doctor.payout || !doctor.payout.linkedAccountId) {
      return; // Route not set up, skip transfer
    }

    let transferAmount = 0;
    const breakdown = payment.breakdown;

    if (breakdown.feeBearer === 'DOCTOR') {
      const rzpPayment = await razorpayService.fetchPayment(razorpayPaymentId);
      const actualFee = rzpPayment.fee || 0;
      const actualTax = rzpPayment.tax || 0;

      payment.breakdown.actualGatewayFee = actualFee;
      payment.breakdown.actualGatewayGst = actualTax;

      transferAmount = breakdown.total - actualFee - actualTax - breakdown.platformCommission;
    } else {
      // For PATIENT fee bearer, the platform commission is already factored in fee calculation.
      transferAmount = breakdown.consultationFee - breakdown.platformCommission;
    }

    transferAmount = Math.max(0, transferAmount);

    if (transferAmount > 0) {
      const transfer = await razorpayService.createTransfer(
        razorpayPaymentId,
        transferAmount,
        doctor.payout.linkedAccountId,
        {
          appointmentId: appointment._id.toString(),
        },
      );

      payment.transfers.push({
        razorpayTransferId: transfer.id,
        amount: transferAmount,
        status: transfer.status || 'processed',
        processedAt: new Date(),
      });
    }

    await payment.save();
  } catch (err) {
    const logger = require('../utils/logger');
    logger.error(`Transfer failed for payment ${paymentId}:`, err);
    payment.transfers.push({
      razorpayTransferId: null,
      amount: 0,
      status: 'failed',
      errorReason: err.message,
      processedAt: new Date(),
    });
    await payment.save();
  }
};

const refundPaymentProcess = async (payment, rzpPaymentId, reason) => {
  payment.razorpayPaymentId = payment.razorpayPaymentId || rzpPaymentId;
  payment.status = 'REFUND_INITIATED';

  try {
    const refund = await razorpayService.refundPayment(payment.razorpayPaymentId, payment.amount, {
      reason,
    });
    payment.refunds.push({
      razorpayRefundId: refund.id,
      amount: payment.amount,
      status: 'PROCESSED',
      reason,
      createdAt: new Date(),
    });
    payment.status = 'REFUNDED';

    // Transfers are automatically reversed since reverse_all: 1 is set in Razorpay service
  } catch (e) {
    payment.refunds.push({
      razorpayRefundId: null,
      amount: payment.amount,
      status: 'FAILED',
      reason: e.message || 'Refund API failed',
      createdAt: new Date(),
    });
  }
  await payment.save();
};

const processRefundForAppointment = async (appointmentId, reason) => {
  const payment = await Payment.findOne({ appointment: appointmentId, status: 'CAPTURED' });
  if (!payment || !payment.razorpayPaymentId) return; // Nothing to refund

  try {
    await refundPaymentProcess(payment, payment.razorpayPaymentId, reason);

    const Appointment = require('../models/Appointment');
    await Appointment.updateOne({ _id: appointmentId }, { $set: { paymentStatus: 'REFUNDED' } });
  } catch (err) {
    const logger = require('../utils/logger');
    logger.error(`Failed to process refund for appointment ${appointmentId}: ${err.message}`);
  }
};

const verifyPaymentAndFinalize = async (razorpayOrderId, razorpayPaymentId, signature) => {
  const isValid = razorpayService.verifySignature(razorpayOrderId, razorpayPaymentId, signature);
  if (!isValid) {
    throw new ApiError(400, 'INVALID_SIGNATURE', 'Payment signature verification failed');
  }
  return await finalizePayment(razorpayOrderId, razorpayPaymentId);
};

const retryTransfer = async (paymentId) => {
  const payment = await Payment.findById(paymentId);
  if (!payment) {
    throw new ApiError(404, 'NOT_FOUND', 'Payment not found');
  }

  if (payment.status !== 'CAPTURED') {
    throw new ApiError(400, 'INVALID_STATE', 'Payment is not in CAPTURED state');
  }

  const failedTransfer = payment.transfers.find((t) => t.status === 'failed');
  if (!failedTransfer && payment.transfers.length > 0) {
    throw new ApiError(400, 'INVALID_STATE', 'No failed transfers found to retry');
  }

  // Attempt the transfer logic again
  await processTransfer(payment._id, payment.appointment, payment.razorpayPaymentId);

  const updatedPayment = await Payment.findById(paymentId);
  return updatedPayment;
};

const manualRefund = async (paymentId, reason) => {
  const payment = await Payment.findById(paymentId);
  if (!payment) {
    throw new ApiError(404, 'NOT_FOUND', 'Payment not found');
  }

  if (['REFUNDED', 'REFUND_INITIATED'].includes(payment.status)) {
    throw new ApiError(400, 'INVALID_STATE', 'Payment is already refunded or refund initiated');
  }

  if (!payment.razorpayPaymentId) {
    throw new ApiError(400, 'INVALID_STATE', 'Payment has no Razorpay Payment ID to refund');
  }

  await refundPaymentProcess(payment, payment.razorpayPaymentId, reason);

  if (payment.appointment) {
    const Appointment = require('../models/Appointment');
    await Appointment.updateOne(
      { _id: payment.appointment },
      { $set: { paymentStatus: 'REFUNDED' } },
    );
  }

  return payment;
};

module.exports = {
  createAppointmentOrder,
  finalizePayment,
  verifyPaymentAndFinalize,
  processRefundForAppointment,
  retryTransfer,
  manualRefund,
};

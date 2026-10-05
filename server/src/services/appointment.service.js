const Appointment = require('../models/Appointment');
const ApiError = require('../utils/ApiError');

// Define allowed transitions for the state machine
const ALLOWED_TRANSITIONS = {
  PENDING_PAYMENT: ['CONFIRMED', 'PAYMENT_FAILED', 'EXPIRED'],
  CONFIRMED: [
    'CHECKED_IN',
    'EN_ROUTE',
    'IN_PROGRESS',
    'COMPLETED',
    'NO_SHOW',
    'CANCELLED_BY_DOCTOR',
    'CANCELLED_BY_ADMIN',
  ],
  CHECKED_IN: ['IN_PROGRESS', 'COMPLETED', 'NO_SHOW', 'CANCELLED_BY_DOCTOR', 'CANCELLED_BY_ADMIN'],
  EN_ROUTE: ['IN_PROGRESS', 'COMPLETED', 'NO_SHOW', 'CANCELLED_BY_DOCTOR', 'CANCELLED_BY_ADMIN'],
  IN_PROGRESS: ['COMPLETED'],
  COMPLETED: [], // Terminal
  NO_SHOW: [], // Terminal
  CANCELLED_BY_DOCTOR: [], // Terminal
  CANCELLED_BY_ADMIN: [], // Terminal
  EXPIRED: [], // Terminal (Hold timeout)
  PAYMENT_FAILED: [], // Terminal
};

// Role-based restrictions for certain states
const ROLE_RESTRICTIONS = {
  CANCELLED_BY_DOCTOR: ['DOCTOR'],
  CANCELLED_BY_ADMIN: ['ADMIN'],
  CHECKED_IN: ['DOCTOR', 'ADMIN'], // patient cannot check themselves in
  EN_ROUTE: ['DOCTOR', 'ADMIN'], // doctor is en route
  IN_PROGRESS: ['DOCTOR', 'ADMIN'],
  COMPLETED: ['DOCTOR', 'ADMIN'],
  NO_SHOW: ['DOCTOR', 'ADMIN'],
};

/**
 * Validates and executes a state transition for an appointment.
 * @param {string|ObjectId} appointmentId
 * @param {string} toStatus - The target status
 * @param {Object} user - The user requesting the transition (needs _id and role)
 * @param {string} reason - Optional reason (required for cancellations)
 */
const transition = async (appointmentId, toStatus, user, reason = '') => {
  const appointment = await Appointment.findById(appointmentId);

  if (!appointment) {
    throw new ApiError(404, 'NOT_FOUND', 'Appointment not found');
  }

  const fromStatus = appointment.status;

  // 1. Check if already in target state
  if (fromStatus === toStatus) {
    return appointment; // Idempotent
  }

  // 2. Validate transition
  const validNextStates = ALLOWED_TRANSITIONS[fromStatus] || [];
  if (!validNextStates.includes(toStatus)) {
    throw new ApiError(
      400,
      'INVALID_STATE_TRANSITION',
      `Cannot transition from ${fromStatus} to ${toStatus}`,
    );
  }

  // 3. Validate role
  const requiredRoles = ROLE_RESTRICTIONS[toStatus];
  if (requiredRoles && !requiredRoles.includes(user.role)) {
    throw new ApiError(
      403,
      'FORBIDDEN',
      `Role ${user.role} is not authorized to set status ${toStatus}`,
    );
  }

  // Type specific restrictions
  if (toStatus === 'CHECKED_IN' && !['PREMIUM', 'NORMAL'].includes(appointment.type)) {
    throw new ApiError(
      400,
      'VALIDATION_ERROR',
      'CHECKED_IN status is only for PREMIUM and NORMAL appointments',
    );
  }
  if (toStatus === 'EN_ROUTE' && appointment.type !== 'HOME_VISIT') {
    throw new ApiError(
      400,
      'VALIDATION_ERROR',
      'EN_ROUTE status is only for HOME_VISIT appointments',
    );
  }

  // 4. Require reason for cancellations
  if ((toStatus === 'CANCELLED_BY_DOCTOR' || toStatus === 'CANCELLED_BY_ADMIN') && !reason) {
    throw new ApiError(400, 'VALIDATION_ERROR', 'Cancellation reason is required');
  }

  // 5. Apply state changes
  appointment.status = toStatus;

  // Side effects based on new state
  if (toStatus === 'CONFIRMED') {
    appointment.confirmedAt = new Date();
    // If it was holding a slot, the slotLock remains to prevent double booking.
  }

  if (toStatus === 'COMPLETED') {
    appointment.completedAt = new Date();
  }

  // If appointment is cancelled, failed, expired, or no-show, free the slotLock so it can be booked again
  const releaseLockStates = [
    'CANCELLED_BY_DOCTOR',
    'CANCELLED_BY_ADMIN',
    'PAYMENT_FAILED',
    'EXPIRED',
    'NO_SHOW',
  ];
  if (releaseLockStates.includes(toStatus)) {
    appointment.slotLock = null;
  }

  // Add cancellation specific metadata
  if (toStatus === 'CANCELLED_BY_DOCTOR' || toStatus === 'CANCELLED_BY_ADMIN') {
    appointment.cancellation = {
      by: user.id,
      role: user.role,
      reason: reason,
      at: new Date(),
    };
  }

  // 6. Record audit history
  appointment.statusHistory.push({
    from: fromStatus,
    to: toStatus,
    by: user.id,
    byRole: user.role,
    at: new Date(),
    reason: reason,
  });

  await appointment.save();

  // Side-effect: Process refund and notification asynchronously
  if (toStatus === 'CANCELLED_BY_DOCTOR' || toStatus === 'CANCELLED_BY_ADMIN') {
    const paymentService = require('./payment.service');
    const notificationService = require('./notification.service');

    // Process refund for the appointment if there was a payment
    paymentService.processRefundForAppointment(appointment._id, reason).catch((err) => {
      const logger = require('../utils/logger');
      logger.error(`Failed to trigger refund for appointment ${appointment._id}: ${err.message}`);
    });

    // Send cancellation notification
    notificationService.sendAppointmentCancellation(appointment._id).catch((err) => {
      const logger = require('../utils/logger');
      logger.error(
        `Failed to send cancellation notification for appointment ${appointment._id}: ${err.message}`,
      );
    });
  }

  // TODO: Trigger events like emitting Socket.io updates

  return appointment;
};

const rescheduleAppointment = async (appointmentId, user, dateStr, startTime) => {
  const appointment = await Appointment.findById(appointmentId).populate('doctor');

  if (!appointment) {
    throw new ApiError(404, 'NOT_FOUND', 'Appointment not found');
  }

  if (appointment.type === 'NORMAL') {
    throw new ApiError(
      400,
      'VALIDATION_ERROR',
      'Normal appointments cannot be rescheduled this way.',
    );
  }

  if (appointment.status !== 'CONFIRMED') {
    throw new ApiError(
      400,
      'VALIDATION_ERROR',
      `Only CONFIRMED appointments can be rescheduled. Current status: ${appointment.status}`,
    );
  }

  const doctor = appointment.doctor;
  if (!doctor) {
    throw new ApiError(404, 'NOT_FOUND', 'Doctor profile not found');
  }

  if (user.role !== 'ADMIN' && user.id !== doctor.user.toString()) {
    throw new ApiError(403, 'FORBIDDEN', 'You are not authorized to reschedule this appointment');
  }

  const slotService = require('./slot.service');
  const slots = await slotService.getSlotsForDate(doctor.slug, appointment.type, dateStr);
  const targetSlot = slots.find((s) => s.startTime === startTime);

  if (!targetSlot) {
    throw new ApiError(400, 'VALIDATION_ERROR', 'Invalid slot time or outside working hours');
  }
  if (targetSlot.status !== 'AVAILABLE') {
    throw new ApiError(409, 'SLOT_TAKEN', `This slot is currently ${targetSlot.status}`);
  }

  const newSlotLock = `${doctor._id}|${dateStr}|${startTime}`;
  const oldDateStr = appointment.dateStr;
  const oldStartTime = appointment.startTime;

  // Use transaction for swapping the slot lock safely
  const mongoose = require('mongoose');
  const session = await mongoose.startSession();

  try {
    await session.withTransaction(async () => {
      // Check if new lock is already taken
      const existingAppt = await Appointment.findOne({ slotLock: newSlotLock }).session(session);
      if (existingAppt) {
        throw new ApiError(409, 'SLOT_TAKEN', 'This slot was just taken');
      }

      appointment.rescheduledFrom = {
        dateStr: oldDateStr,
        startTime: oldStartTime,
      };

      appointment.dateStr = dateStr;
      appointment.startTime = targetSlot.startTime;
      appointment.endTime = targetSlot.endTime;
      appointment.startAt = targetSlot.startAt;
      appointment.endAt = targetSlot.endAt;
      appointment.slotLock = newSlotLock;

      appointment.statusHistory.push({
        from: 'CONFIRMED',
        to: 'CONFIRMED',
        by: user.id,
        byRole: user.role,
        at: new Date(),
        reason: `Rescheduled from ${oldDateStr} ${oldStartTime} to ${dateStr} ${startTime}`,
      });

      await appointment.save({ session });
    });
  } catch (error) {
    if (error.code === 11000) {
      throw new ApiError(409, 'SLOT_TAKEN', 'This slot was just taken by another user');
    }
    throw error;
  } finally {
    await session.endSession();
  }

  // Side-effect: Send reschedule notification
  const notificationService = require('./notification.service');
  if (notificationService.sendAppointmentReschedule) {
    notificationService.sendAppointmentReschedule(appointment._id).catch((err) => {
      const logger = require('../utils/logger');
      logger.error(`Failed to send reschedule notification for ${appointment._id}: ${err.message}`);
    });
  }

  return appointment;
};

module.exports = {
  transition,
  rescheduleAppointment,
};

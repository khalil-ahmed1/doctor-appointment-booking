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
    'EXPIRED_TOKEN', // For NORMAL queue
  ],
  CHECKED_IN: ['IN_PROGRESS', 'COMPLETED', 'NO_SHOW', 'CANCELLED_BY_DOCTOR', 'CANCELLED_BY_ADMIN'],
  EN_ROUTE: ['IN_PROGRESS', 'COMPLETED', 'NO_SHOW', 'CANCELLED_BY_DOCTOR', 'CANCELLED_BY_ADMIN'],
  IN_PROGRESS: ['COMPLETED'],
  COMPLETED: [], // Terminal
  NO_SHOW: [], // Terminal
  CANCELLED_BY_DOCTOR: [], // Terminal
  CANCELLED_BY_ADMIN: [], // Terminal
  EXPIRED_TOKEN: [], // Terminal
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
    throw new ApiError(400, 'INVALID_STATE_TRANSITION', `Cannot transition from ${fromStatus} to ${toStatus}`);
  }

  // 3. Validate role
  const requiredRoles = ROLE_RESTRICTIONS[toStatus];
  if (requiredRoles && !requiredRoles.includes(user.role)) {
    throw new ApiError(403, 'FORBIDDEN', `Role ${user.role} is not authorized to set status ${toStatus}`);
  }

  // Type specific restrictions
  if (toStatus === 'CHECKED_IN' && appointment.type !== 'PREMIUM') {
    throw new ApiError(400, 'VALIDATION_ERROR', 'CHECKED_IN status is only for PREMIUM appointments');
  }
  if (toStatus === 'EN_ROUTE' && appointment.type !== 'HOME_VISIT') {
    throw new ApiError(400, 'VALIDATION_ERROR', 'EN_ROUTE status is only for HOME_VISIT appointments');
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
    'NO_SHOW'
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
      at: new Date()
    };
  }

  // 6. Record audit history
  appointment.statusHistory.push({
    from: fromStatus,
    to: toStatus,
    by: user.id,
    byRole: user.role,
    at: new Date(),
    reason: reason
  });

  await appointment.save();

  // TODO: Trigger events like emitting Socket.io updates, Email/SMS notifications, or Razorpay refund jobs.

  return appointment;
};

module.exports = {
  transition
};

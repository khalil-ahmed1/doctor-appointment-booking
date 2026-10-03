const mongoose = require('mongoose');
const Appointment = require('../models/Appointment');
const ApiError = require('../utils/ApiError');
const slotService = require('./slot.service');

const HOLD_LIMIT = 3;
const HOLD_DURATION_MINS = 10;

const generateBookingCode = () => {
  return 'B-' + Date.now().toString().slice(-6) + Math.random().toString(36).substring(2, 6).toUpperCase();
};

const cleanupStaleHolds = async () => {
  const now = new Date();
  await Appointment.updateMany(
    {
      status: 'PENDING_PAYMENT',
      holdExpiresAt: { $lt: now }
    },
    {
      $set: {
        status: 'EXPIRED',
        slotLock: null
      },
      $push: {
        statusHistory: {
          from: 'PENDING_PAYMENT',
          to: 'EXPIRED',
          byRole: 'SYSTEM',
          at: now,
          reason: 'Hold time expired'
        }
      }
    }
  );
};

const holdSlot = async (userId, doctorId, type, dateStr, startTime, endTime, idempotencyKey) => {
  // 1. Cleanup stale holds
  await cleanupStaleHolds();

  // 2. Check Idempotency Key
  if (idempotencyKey) {
    const existing = await Appointment.findOne({ 
      patient: userId, 
      idempotencyKey,
      status: { $in: ['PENDING_PAYMENT', 'CONFIRMED'] }
    });
    if (existing) {
      return existing; // Already held or confirmed
    }
  }

  // 3. User hold limits
  const activeHolds = await Appointment.countDocuments({
    patient: userId,
    status: 'PENDING_PAYMENT'
  });

  if (activeHolds >= HOLD_LIMIT) {
    throw new ApiError(429, 'HOLD_LIMIT_REACHED', `You cannot hold more than ${HOLD_LIMIT} slots simultaneously. Complete or cancel existing bookings.`);
  }

  // 4. Validate slot logic (Must be AVAILABLE)
  // To avoid circular dependency or full slot map generation, we can generate the map for the day and verify
  // Actually, wait, getSlotsForDate takes doctor slug, not ID.
  const DoctorProfile = require('../models/DoctorProfile');
  const doctor = await DoctorProfile.findById(doctorId);
  if (!doctor) {
    throw new ApiError(404, 'NOT_FOUND', 'Doctor not found');
  }

  const slots = await slotService.getSlotsForDate(doctor.slug, type, dateStr);
  const targetSlot = slots.find(s => s.startTime === startTime && s.endTime === endTime);

  if (!targetSlot) {
    throw new ApiError(400, 'VALIDATION_ERROR', 'Invalid slot time or outside working hours');
  }
  if (targetSlot.status !== 'AVAILABLE') {
    throw new ApiError(409, 'SLOT_TAKEN', `This slot is currently ${targetSlot.status}`);
  }

  // 5. Transaction for Atomic Insert
  const session = await mongoose.startSession();
  let appointment;

  try {
    await session.withTransaction(async () => {
      const slotLock = `${doctorId}|${dateStr}|${startTime}`;
      
      const holdExpiresAt = new Date(Date.now() + HOLD_DURATION_MINS * 60000);

      const [newAppt] = await Appointment.create([{
        bookingCode: generateBookingCode(),
        patient: userId,
        doctor: doctorId,
        type,
        status: 'PENDING_PAYMENT',
        dateStr,
        startTime,
        endTime,
        slotLock,
        holdExpiresAt,
        idempotencyKey
      }], { session });

      appointment = newAppt;
    });
  } catch (error) {
    // E11000 duplicate key error on slotLock means race condition lost
    if (error.code === 11000 && error.keyPattern && error.keyPattern.slotLock) {
      throw new ApiError(409, 'SLOT_TAKEN', 'This slot was just taken by another user');
    }
    throw error;
  } finally {
    await session.endSession();
  }

  return appointment;
};

module.exports = {
  holdSlot,
  cleanupStaleHolds
};

const mongoose = require('mongoose');
const Appointment = require('../models/Appointment');
const ApiError = require('../utils/ApiError');
const slotService = require('./slot.service');

const HOLD_LIMIT = 3;
const HOLD_DURATION_MINS = 10;

const generateBookingCode = () => {
  return (
    'B-' +
    Date.now().toString().slice(-6) +
    Math.random().toString(36).substring(2, 6).toUpperCase()
  );
};

const cleanupStaleHolds = async () => {
  const now = new Date();
  await Appointment.updateMany(
    {
      status: 'PENDING_PAYMENT',
      holdExpiresAt: { $lt: now },
    },
    {
      $set: {
        status: 'EXPIRED',
        slotLock: null,
      },
      $push: {
        statusHistory: {
          from: 'PENDING_PAYMENT',
          to: 'EXPIRED',
          byRole: 'SYSTEM',
          at: now,
          reason: 'Hold time expired',
        },
      },
    },
  );
};

const holdSlot = async (
  userId,
  doctorId,
  type,
  dateStr,
  startTime,
  endTime,
  idempotencyKey,
  patientDetails,
  addressSnapshot,
) => {
  // 1. Cleanup stale holds
  await cleanupStaleHolds();

  // 2. Check Idempotency Key
  if (idempotencyKey) {
    const existing = await Appointment.findOne({
      patient: userId,
      idempotencyKey,
      status: { $in: ['PENDING_PAYMENT', 'CONFIRMED'] },
    });
    if (existing) {
      return existing; // Already held or confirmed
    }
  }

  // 3. User hold limits
  const activeHolds = await Appointment.countDocuments({
    patient: userId,
    status: 'PENDING_PAYMENT',
  });

  if (activeHolds >= HOLD_LIMIT) {
    throw new ApiError(
      429,
      'HOLD_LIMIT_REACHED',
      `You cannot hold more than ${HOLD_LIMIT} slots simultaneously. Complete or cancel existing bookings.`,
    );
  }

  // 4. Validate limits or slots
  const DoctorProfile = require('../models/DoctorProfile');
  const doctor = await DoctorProfile.findById(doctorId);
  if (!doctor) {
    throw new ApiError(404, 'NOT_FOUND', 'Doctor not found');
  }

  let targetSlot = null;

  if (type === 'NORMAL') {
    if (!doctor.types.normal.enabled) {
      throw new ApiError(
        400,
        'TYPE_DISABLED',
        'Normal appointments are not enabled for this doctor',
      );
    }
    const dailyLimit = doctor.types.normal.dailyTokenLimit || 0;

    if (dailyLimit > 0) {
      // Check active + confirmed tokens for today
      const currentTokens = await Appointment.countDocuments({
        doctor: doctorId,
        type: 'NORMAL',
        dateStr,
        status: { $in: ['PENDING_PAYMENT', 'CONFIRMED', 'CHECKED_IN', 'IN_PROGRESS', 'COMPLETED'] },
      });
      if (currentTokens >= dailyLimit) {
        throw new ApiError(409, 'LIMIT_REACHED', 'Daily token limit reached for this date');
      }
    }
  } else {
    if (type === 'HOME_VISIT') {
      if (!doctor.types?.homeVisit?.enabled) {
        throw new ApiError(400, 'TYPE_DISABLED', 'Home visits are not enabled for this doctor');
      }

      if (!addressSnapshot) {
        throw new ApiError(400, 'VALIDATION_ERROR', 'Address is required for home visit');
      }

      const sa = doctor.types.homeVisit.serviceArea || {};
      if (sa.mode === 'PINCODES') {
        if (!sa.pincodes || !sa.pincodes.includes(addressSnapshot.pincode)) {
          throw new ApiError(400, 'SERVICE_AREA_ERROR', 'Doctor does not serve this pincode');
        }
      } else {
        // RADIUS mode
        const { getDistanceFromLatLonInKm } = require('../utils/geo');
        if (!doctor.clinic?.location?.coordinates || !addressSnapshot.location) {
          throw new ApiError(
            400,
            'VALIDATION_ERROR',
            'Invalid location coordinates for service area check',
          );
        }
        const [docLng, docLat] = doctor.clinic.location.coordinates;
        const dist = getDistanceFromLatLonInKm(
          docLat,
          docLng,
          addressSnapshot.location.lat,
          addressSnapshot.location.lng,
        );
        const radius = sa.radiusKm || 10;
        if (dist > radius) {
          throw new ApiError(
            400,
            'SERVICE_AREA_ERROR',
            `Doctor does not serve this area (Distance: ${dist.toFixed(1)}km, Max: ${radius}km)`,
          );
        }
      }
    } else if (type === 'PREMIUM') {
      if (!doctor.types?.premium?.enabled) {
        throw new ApiError(
          400,
          'TYPE_DISABLED',
          'Premium appointments are not enabled for this doctor',
        );
      }
    }

    // Validate slot logic for PREMIUM and HOME_VISIT
    const slots = await slotService.getSlotsForDate(doctor.slug, type, dateStr);
    targetSlot = slots.find((s) => s.startTime === startTime && s.endTime === endTime);

    if (!targetSlot) {
      throw new ApiError(400, 'VALIDATION_ERROR', 'Invalid slot time or outside working hours');
    }
    if (targetSlot.status !== 'AVAILABLE') {
      throw new ApiError(409, 'SLOT_TAKEN', `This slot is currently ${targetSlot.status}`);
    }
  }

  // 5. Calculate Fee Breakdown
  // Defaulting settings for now, in Phase 2 this will be fetched from Admin Settings DB
  const settings = {
    feeBearer: 'PATIENT',
    gatewayFeePercent: 2,
    gstOnFeePercent: 18,
    platformCommissionPercent: 0,
  };

  // Get doctor's fee based on appointment type
  const baseFee = type === 'PREMIUM' ? doctor.fees.premium || 0 : doctor.fees.homeVisit || 0;
  const feeSnapshot = require('./fee.service').calculateFeeBreakdown(baseFee, settings);

  // 6. Transaction for Atomic Insert
  const session = await mongoose.startSession();
  let appointment;

  try {
    await session.withTransaction(async () => {
      const slotLock = type === 'NORMAL' ? null : `${doctorId}|${dateStr}|${startTime}`;

      const holdExpiresAt = new Date(Date.now() + HOLD_DURATION_MINS * 60000);

      const [newAppt] = await Appointment.create(
        [
          {
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
            idempotencyKey,
            patientDetails,
            addressSnapshot,
            fee: {
              consultationFee: feeSnapshot.consultationFee,
              convenienceFee: feeSnapshot.convenienceFee,
              platformCommission: feeSnapshot.platformCommission,
              total: feeSnapshot.total,
              feeBearer: feeSnapshot.feeBearer,
            },
          },
        ],
        { session },
      );

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
  cleanupStaleHolds,
};

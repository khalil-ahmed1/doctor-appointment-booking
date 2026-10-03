const mongoose = require('mongoose');

const appointmentSchema = new mongoose.Schema(
  {
    bookingCode: { type: String, required: true, unique: true },
    patient: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    doctor: { type: mongoose.Schema.Types.ObjectId, ref: 'DoctorProfile', required: true },
    type: { type: String, enum: ['NORMAL', 'PREMIUM', 'HOME_VISIT'], required: true },
    status: {
      type: String,
      enum: [
        'PENDING_PAYMENT',
        'CONFIRMED',
        'CHECKED_IN',
        'EN_ROUTE',
        'IN_PROGRESS',
        'COMPLETED',
        'NO_SHOW',
        'CANCELLED_BY_DOCTOR',
        'CANCELLED_BY_ADMIN',
        'EXPIRED_TOKEN',
        'EXPIRED',
        'PAYMENT_FAILED',
      ],
      default: 'PENDING_PAYMENT',
    },
    statusHistory: [
      {
        from: String,
        to: String,
        by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        byRole: String,
        at: { type: Date, default: Date.now },
        reason: String,
      },
    ],

    // Premium / Home specific
    dateStr: { type: String },
    startTime: { type: String },
    endTime: { type: String },
    startAt: { type: Date },
    endAt: { type: Date },
    slotLock: { type: String, default: null },

    // Normal specific
    tokenSeq: { type: Number },
    tokenLabel: { type: String },
    validFrom: { type: Date },
    validUntil: { type: Date },
    extendedByDays: { type: Number, default: 0 },

    holdExpiresAt: { type: Date },

    patientDetails: {
      name: String,
      age: Number,
      gender: String,
      phone: String,
      relation: String,
      reason: String,
    },

    addressSnapshot: {
      name: String,
      phone: String,
      line1: String,
      line2: String,
      landmark: String,
      area: String,
      city: String,
      state: String,
      pincode: String,
      location: { lat: Number, lng: Number },
      notes: String,
    },

    clinicSnapshot: {
      name: String,
      address: String,
      mapsUrl: String,
    },

    fee: {
      consultationFee: Number,
      convenienceFee: Number,
      platformCommission: Number,
      total: Number,
      feeBearer: { type: String, enum: ['PATIENT', 'DOCTOR'] },
    },

    // Reference to Payment model
    payment: { type: mongoose.Schema.Types.ObjectId, ref: 'Payment' },
    paymentStatus: String,

    cancellation: {
      by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      role: String,
      reason: String,
      at: Date,
    },
    doctorNotes: { type: String }, // private

    remindersSent: {
      r24h: { type: Boolean, default: false },
      r2h: { type: Boolean, default: false },
      normalEvening: { type: Boolean, default: false },
      normalLastDay: { type: Boolean, default: false },
    },

    confirmedAt: Date,
    completedAt: Date,
    rescheduledFrom: {
      dateStr: String,
      startTime: String,
    },

    idempotencyKey: { type: String }, // For preventing double submission
  },
  { timestamps: true },
);

// Indexes defined in PRD
// unique partial index on slotLock
appointmentSchema.index(
  { slotLock: 1 },
  { unique: true, partialFilterExpression: { slotLock: { $type: 'string' } } },
);

appointmentSchema.index({ idempotencyKey: 1 });
appointmentSchema.index({ doctor: 1, dateStr: 1, status: 1 });
appointmentSchema.index({ doctor: 1, type: 1, status: 1, tokenSeq: 1 });
appointmentSchema.index({ patient: 1, createdAt: -1 });
appointmentSchema.index({ status: 1, holdExpiresAt: 1 });
appointmentSchema.index({ startAt: 1 });
appointmentSchema.index({ validUntil: 1, status: 1 });

module.exports = mongoose.model('Appointment', appointmentSchema);

const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true, lowercase: true },
    phone: { type: String, required: true },
    passwordHash: { type: String, select: false },
    role: {
      type: String,
      enum: ['PATIENT', 'DOCTOR', 'ADMIN', 'SUB_ADMIN'],
      default: 'PATIENT',
    },
    permissions: [{ type: String }],
    status: {
      type: String,
      enum: ['ACTIVE', 'INVITED', 'BLOCKED', 'DELETED'],
      default: 'ACTIVE',
    },
    emailVerified: { type: Boolean, default: false },
    emailVerifyToken: String,
    emailVerifyExpires: Date,
    resetTokenHash: String,
    resetTokenExpires: Date,
    refreshTokens: [
      {
        tokenHash: String,
        expiresAt: Date,
        userAgent: String,
        ip: String,
      },
    ],
    failedLoginCount: { type: Number, default: 0 },
    lockUntil: Date,
    lastLoginAt: Date,
    gender: { type: String, enum: ['MALE', 'FEMALE', 'OTHER'] },
    dob: Date,
    avatarUrl: String,
    savedAddresses: [
      {
        label: String,
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
      },
    ],
    notificationPrefs: {
      email: { type: Boolean, default: true },
      reminders: { type: Boolean, default: true },
    },
    doctorProfile: { type: mongoose.Schema.Types.ObjectId, ref: 'DoctorProfile' },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true },
);

userSchema.index({ phone: 1 });
userSchema.index({ role: 1, status: 1 });

module.exports = mongoose.model('User', userSchema);

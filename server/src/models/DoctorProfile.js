const mongoose = require('mongoose');

const doctorProfileSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    fullName: { type: String, required: true },
    slug: { type: String, required: true, unique: true },
    headline: String,
    bio: String,
    experienceYears: Number,
    gender: { type: String, enum: ['MALE', 'FEMALE', 'OTHER'] },
    specializations: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Specialization' }],
    languages: [String],
    services: [String],
    awards: [String],
    gallery: [{ url: String, caption: String, order: Number }],
    videoUrl: String,
    qualifications: [{ degree: String, institute: String, year: Number }],
    registration: {
      number: String,
      council: String,
      year: Number,
      verified: { type: Boolean, default: false },
      verifiedAt: Date,
      verifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    },
    clinic: {
      name: String,
      line1: String,
      line2: String,
      landmark: String,
      city: String,
      state: String,
      pincode: String,
      location: {
        type: { type: String, enum: ['Point'] },
        coordinates: { type: [Number] }, // [longitude, latitude]
      },
      mapsUrl: String,
      phone: String,
      email: String,
      timingsText: String,
    },
    social: {
      website: String,
      twitter: String,
      linkedin: String,
    },
    fees: {
      normal: { type: Number, default: 0 },
      premium: { type: Number, default: 0 },
      homeVisit: { type: Number, default: 0 },
    },
    types: {
      normal: {
        enabled: { type: Boolean, default: false },
        dailyTokenLimit: { type: Number, default: 0 },
        walkInHoursText: String,
      },
      premium: { enabled: { type: Boolean, default: false } },
      homeVisit: {
        enabled: { type: Boolean, default: false },
        serviceArea: {
          mode: { type: String, enum: ['RADIUS', 'PINCODES'], default: 'RADIUS' },
          radiusKm: Number,
          pincodes: [String],
        },
      },
    },
    payout: {
      linkedAccountId: String,
      stakeholderId: String,
      productId: String,
      status: {
        type: String,
        enum: ['CREATED', 'NEEDS_CLARIFICATION', 'UNDER_REVIEW', 'ACTIVE', 'SUSPENDED', 'REJECTED'],
      },
      bankLast4: String,
      ifsc: String,
      panLast4: String,
      legalName: String,
      businessType: String,
      statusReason: String,
      lastSyncedAt: Date,
    },
    subscription: {
      status: { type: String, enum: ['TRIAL', 'ACTIVE', 'GRACE', 'EXPIRED', 'SUSPENDED'] },
      endsAt: Date,
      planName: String,
      trialUsed: { type: Boolean, default: false },
    },
    onboardedAt: Date,
    onboardedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    isPublished: { type: Boolean, default: false },
    isVerifiedBadge: { type: Boolean, default: false },
    status: {
      type: String,
      enum: ['ACTIVE', 'SUSPENDED', 'INVITED', 'DELETED'],
      default: 'INVITED',
    },
    stats: {
      totalAppointments: { type: Number, default: 0 },
      rating: { type: Number, default: 0 },
    },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true },
);

doctorProfileSchema.index({ 'clinic.location': '2dsphere' });
doctorProfileSchema.index({
  fullName: 'text',
  headline: 'text',
  services: 'text',
  'clinic.city': 'text',
});
doctorProfileSchema.index({
  isPublished: 1,
  status: 1,
  'subscription.status': 1,
  'payout.status': 1,
});
doctorProfileSchema.index({ specializations: 1 });
doctorProfileSchema.index({ 'clinic.city': 1 });
doctorProfileSchema.index({ 'fees.normal': 1, 'fees.premium': 1, 'fees.homeVisit': 1 });

module.exports = mongoose.model('DoctorProfile', doctorProfileSchema);

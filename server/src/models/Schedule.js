const mongoose = require('mongoose');

const windowSchema = new mongoose.Schema(
  {
    start: { type: String, required: true }, // "HH:mm"
    end: { type: String, required: true }, // "HH:mm"
  },
  { _id: false },
);

const weeklyRuleSchema = new mongoose.Schema(
  {
    dayOfWeek: { type: Number, required: true, min: 0, max: 6 }, // 0 = Sunday
    isWorking: { type: Boolean, default: false },
    windows: [windowSchema],
  },
  { _id: false },
);

const scheduleSchema = new mongoose.Schema(
  {
    doctor: { type: mongoose.Schema.Types.ObjectId, ref: 'DoctorProfile', required: true },
    type: { type: String, enum: ['PREMIUM', 'HOME_VISIT'], required: true },
    slotDurationMin: { type: Number, default: 30, min: 10, max: 120 }, // multiples of 5 validated at service level
    bufferMin: { type: Number, default: 0, min: 0, max: 60 },
    advanceBookingDays: { type: Number, default: 30, min: 1, max: 90 },
    minNoticeMinutes: { type: Number, default: 60, min: 0 },
    weeklyRules: [weeklyRuleSchema],
  },
  { timestamps: true },
);

// Ensure one schedule per doctor per type
scheduleSchema.index({ doctor: 1, type: 1 }, { unique: true });

module.exports = mongoose.model('Schedule', scheduleSchema);

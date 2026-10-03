const mongoose = require('mongoose');

const windowSchema = new mongoose.Schema(
  {
    start: { type: String, required: true }, // "HH:mm"
    end: { type: String, required: true }, // "HH:mm"
  },
  { _id: false },
);

const scheduleExceptionSchema = new mongoose.Schema(
  {
    doctor: { type: mongoose.Schema.Types.ObjectId, ref: 'DoctorProfile', required: true },
    dateStr: { type: String, required: true }, // "YYYY-MM-DD"
    kind: { type: String, enum: ['LEAVE', 'CUSTOM_HOURS'], required: true },
    appliesTo: [{ type: String, enum: ['NORMAL', 'PREMIUM', 'HOME_VISIT'] }],
    windows: [windowSchema], // only relevant for CUSTOM_HOURS or partial LEAVE
    reason: { type: String },
  },
  { timestamps: true },
);

// A doctor shouldn't have duplicate rules of the same kind on the same day usually, but uniqueness on just this might be tricky if we want multiple leaves of different types? No, one exception record per day per kind should suffice.
scheduleExceptionSchema.index({ doctor: 1, dateStr: 1, kind: 1 }, { unique: true });

module.exports = mongoose.model('ScheduleException', scheduleExceptionSchema);

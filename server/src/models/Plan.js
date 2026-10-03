const mongoose = require('mongoose');

const planSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    code: { type: String, required: true, unique: true },
    durationDays: { type: Number, required: true },
    price: { type: Number, required: true }, // in paise
    gstPercent: { type: Number, default: 18 },
    isActive: { type: Boolean, default: true },
    displayOrder: { type: Number, default: 0 },
    features: [String],
  },
  { timestamps: true }
);

module.exports = mongoose.model('Plan', planSchema);

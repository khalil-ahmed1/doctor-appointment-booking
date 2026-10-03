const mongoose = require('mongoose');

const emailLogSchema = new mongoose.Schema(
  {
    to: {
      type: String,
      required: true,
      lowercase: true,
    },
    subject: {
      type: String,
      required: true,
    },
    template: {
      type: String,
      required: true,
    },
    data: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    status: {
      type: String,
      enum: ['PENDING', 'SENT', 'FAILED'],
      default: 'PENDING',
    },
    error: {
      type: String,
    },
    retryCount: {
      type: Number,
      default: 0,
    },
    sentAt: {
      type: Date,
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model('EmailLog', emailLogSchema);

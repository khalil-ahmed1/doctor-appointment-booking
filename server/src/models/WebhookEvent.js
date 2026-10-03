const mongoose = require('mongoose');

const webhookEventSchema = new mongoose.Schema(
  {
    eventId: { type: String, required: true, unique: true },
    event: { type: String, required: true },
    source: { type: String, default: 'RAZORPAY' },
    status: {
      type: String,
      enum: ['PENDING', 'PROCESSED', 'FAILED', 'IGNORED'],
      default: 'PENDING',
    },
    payload: { type: mongoose.Schema.Types.Mixed },
    error: { type: String },
    processedAt: { type: Date },
  },
  { timestamps: true },
);

webhookEventSchema.index({ eventId: 1 });
webhookEventSchema.index({ status: 1 });
webhookEventSchema.index({ createdAt: -1 });

module.exports = mongoose.model('WebhookEvent', webhookEventSchema);

const mongoose = require('mongoose');

const subscriptionSchema = new mongoose.Schema(
  {
    doctor: { type: mongoose.Schema.Types.ObjectId, ref: 'DoctorProfile', required: true },
    plan: { type: mongoose.Schema.Types.ObjectId, ref: 'Plan' },
    type: { type: String, enum: ['TRIAL', 'PAID', 'ADMIN_GRANT'], required: true },
    source: { type: String, enum: ['RAZORPAY', 'ADMIN'], required: true },
    startsAt: { type: Date, required: true },
    endsAt: { type: Date, required: true },
    amount: { type: Number, default: 0 },
    gst: { type: Number, default: 0 },
    total: { type: Number, default: 0 },
    payment: { type: mongoose.Schema.Types.ObjectId, ref: 'Payment' },
    invoiceNo: String,
    invoiceUrl: String,
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    reason: String,
    remindersSent: [{ type: String }],
  },
  { timestamps: true },
);

subscriptionSchema.index({ doctor: 1, endsAt: -1 });

module.exports = mongoose.model('Subscription', subscriptionSchema);

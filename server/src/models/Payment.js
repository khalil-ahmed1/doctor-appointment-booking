const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema(
  {
    type: { type: String, enum: ['CONSULTATION', 'SUBSCRIPTION'], required: true },
    appointment: { type: mongoose.Schema.Types.ObjectId, ref: 'Appointment' },
    subscription: { type: mongoose.Schema.Types.ObjectId, ref: 'Subscription' },

    razorpayOrderId: { type: String, unique: true, sparse: true },
    razorpayPaymentId: { type: String, unique: true, sparse: true },

    amount: { type: Number, required: true }, // in paise
    currency: { type: String, default: 'INR' },

    status: {
      type: String,
      enum: [
        'CREATED',
        'AUTHORIZED',
        'CAPTURED',
        'FAILED',
        'REFUND_INITIATED',
        'REFUNDED',
        'AUTO_REFUND_PENDING',
      ],
      default: 'CREATED',
    },

    // Exact fee snapshot saved upon order creation
    breakdown: {
      consultationFee: Number,
      convenienceFee: Number,
      platformCommission: Number,
      total: Number,
      feeBearer: { type: String, enum: ['PATIENT', 'DOCTOR'] },
      actualGatewayFee: Number, // filled after capture
      actualGatewayGst: Number, // filled after capture
    },

    // Transfers to the Doctor's Linked Razorpay Route Account
    transfers: [
      {
        razorpayTransferId: String,
        amount: Number,
        status: String, // 'processed', 'failed'
        errorReason: String,
        processedAt: Date,
      },
    ],

    // Refunds
    refunds: [
      {
        razorpayRefundId: String,
        amount: Number,
        status: String,
        reason: String,
        createdAt: Date,
      },
    ],
  },
  { timestamps: true },
);

paymentSchema.index({ appointment: 1 });
paymentSchema.index({ status: 1 });
paymentSchema.index({ razorpayOrderId: 1 });
paymentSchema.index({ razorpayPaymentId: 1 });

module.exports = mongoose.model('Payment', paymentSchema);

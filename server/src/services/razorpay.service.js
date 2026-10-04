const Razorpay = require('razorpay');
const crypto = require('crypto');

let instance = null;

const getRazorpayInstance = () => {
  if (!instance) {
    // These should come from env in production
    const key_id = process.env.RAZORPAY_KEY_ID || 'rzp_test_mockKeyId';
    const key_secret = process.env.RAZORPAY_KEY_SECRET || 'rzp_test_mockKeySecret';

    instance = new Razorpay({
      key_id,
      key_secret,
    });
  }
  return instance;
};

const createOrder = async (amount, receipt, notes = {}) => {
  const rzp = getRazorpayInstance();
  const options = {
    amount, // amount in the smallest currency unit (paise)
    currency: 'INR',
    receipt,
    notes,
    payment_capture: 1, // auto capture
  };
  return await rzp.orders.create(options);
};

const verifySignature = (orderId, paymentId, signature) => {
  const key_secret = process.env.RAZORPAY_KEY_SECRET || 'rzp_test_mockKeySecret';
  const body = orderId + '|' + paymentId;
  const expectedSignature = crypto
    .createHmac('sha256', key_secret)
    .update(body.toString())
    .digest('hex');

  return expectedSignature === signature;
};

const refundPayment = async (paymentId, amount, notes = {}) => {
  const rzp = getRazorpayInstance();
  return await rzp.payments.refund(paymentId, {
    amount,
    speed: 'normal',
    notes,
    reverse_all: 1, // Reverse all transfers mapped to this payment
  });
};

const fetchPayment = async (paymentId) => {
  const rzp = getRazorpayInstance();
  return await rzp.payments.fetch(paymentId);
};

const createLinkedAccount = async (accountData) => {
  // Mocking for local development as Razorpay Route requires special approval
  return {
    id: 'acc_' + crypto.randomBytes(6).toString('hex'),
    status: 'created',
    reference_id: accountData.reference_id,
  };
};

const createTransfer = async (paymentId, amount, accountId, notes = {}) => {
  // Mocking transfer
  return {
    id: 'trf_' + crypto.randomBytes(6).toString('hex'),
    entity: 'transfer',
    source: paymentId,
    recipient: accountId,
    amount: amount,
    status: 'processed',
    notes,
  };
};

module.exports = {
  createOrder,
  verifySignature,
  refundPayment,
  fetchPayment,
  getRazorpayInstance,
  createLinkedAccount,
  createTransfer,
};

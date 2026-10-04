const asyncHandler = require('../utils/asyncHandler');
const paymentService = require('../services/payment.service');

const createOrder = asyncHandler(async (req, res) => {
  const { appointmentId } = req.body;
  const order = await paymentService.createAppointmentOrder(appointmentId);
  res.status(200).json({ success: true, data: order });
});

const verifyPayment = asyncHandler(async (req, res) => {
  const { razorpayOrderId, razorpayPaymentId, signature } = req.body;
  const result = await paymentService.verifyPaymentAndFinalize(razorpayOrderId, razorpayPaymentId, signature);
  res.status(200).json({ success: true, data: result });
});

module.exports = { createOrder, verifyPayment };

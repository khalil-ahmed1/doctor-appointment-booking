const mongoose = require('mongoose');
const { MongoMemoryReplSet } = require('mongodb-memory-server');
const Appointment = require('../src/models/Appointment');
const Payment = require('../src/models/Payment');
const paymentService = require('../src/services/payment.service');
const razorpayService = require('../src/services/razorpay.service');

// Mock Razorpay Service
jest.mock('../src/services/razorpay.service', () => ({
  createOrder: jest.fn(),
  verifySignature: jest.fn(),
  refundPayment: jest.fn()
}));

let mongoServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
  const mongoUri = mongoServer.getUri();
  await mongoose.connect(mongoUri);
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

describe('Payment Service - finalizePayment', () => {
  let appointment;
  let payment;
  let docId = new mongoose.Types.ObjectId();
  let patientId = new mongoose.Types.ObjectId();

  beforeEach(async () => {
    jest.clearAllMocks();

    appointment = await Appointment.create({
      bookingCode: `B-${Date.now()}`,
      patient: patientId,
      doctor: docId,
      type: 'PREMIUM',
      status: 'PENDING_PAYMENT',
      dateStr: '2026-10-10',
      startTime: '10:00',
      endTime: '10:30',
      slotLock: `${docId}|2026-10-10|10:00`,
      holdExpiresAt: new Date(Date.now() + 600000), // Active hold
      fee: { total: 50000 }
    });

    payment = await Payment.create({
      type: 'CONSULTATION',
      appointment: appointment._id,
      razorpayOrderId: `order_${Date.now()}`,
      amount: 50000,
      status: 'CREATED',
    });

    appointment.payment = payment._id;
    await appointment.save();
  });

  afterEach(async () => {
    await Appointment.deleteMany();
    await Payment.deleteMany();
  });

  it('CASE A: Normal happy path confirms appointment', async () => {
    const result = await paymentService.finalizePayment(payment.razorpayOrderId, 'pay_123');

    expect(result.status).toBe('CONFIRMED');
    
    const updatedAppt = await Appointment.findById(appointment._id);
    expect(updatedAppt.status).toBe('CONFIRMED');
    expect(updatedAppt.paymentStatus).toBe('PAID');
    expect(updatedAppt.slotLock).toBe(`${docId}|2026-10-10|10:00`);

    const updatedPayment = await Payment.findById(payment._id);
    expect(updatedPayment.status).toBe('CAPTURED');
  });

  it('CASE B: Late payment honored if slot is still free', async () => {
    // Manually expire the hold
    appointment.status = 'EXPIRED';
    appointment.slotLock = null;
    await appointment.save();

    const result = await paymentService.finalizePayment(payment.razorpayOrderId, 'pay_123');

    expect(result.status).toBe('CONFIRMED_LATE');
    
    const updatedAppt = await Appointment.findById(appointment._id);
    expect(updatedAppt.status).toBe('CONFIRMED');
    expect(updatedAppt.slotLock).toBe(`${docId}|2026-10-10|10:00`); // Lock re-acquired
  });

  it('CASE C: Late payment refunded if slot was taken by someone else', async () => {
    // 1. Manually expire the original hold
    appointment.status = 'EXPIRED';
    appointment.slotLock = null;
    await appointment.save();

    // 2. Someone else takes the slot
    await Appointment.create({
      bookingCode: `B-TAKEN`,
      patient: new mongoose.Types.ObjectId(),
      doctor: docId,
      type: 'PREMIUM',
      status: 'PENDING_PAYMENT',
      dateStr: '2026-10-10',
      startTime: '10:00',
      slotLock: `${docId}|2026-10-10|10:00`,
    });

    // 3. Mock Refund API
    razorpayService.refundPayment.mockResolvedValue({ id: 'rfnd_123' });

    // 4. Attempt finalize
    const result = await paymentService.finalizePayment(payment.razorpayOrderId, 'pay_123');

    expect(result.status).toBe('SLOT_LOST_REFUNDING');
    
    const updatedAppt = await Appointment.findById(appointment._id);
    expect(updatedAppt.status).toBe('PAYMENT_FAILED');
    expect(updatedAppt.slotLock).toBeNull(); // Did NOT acquire lock

    const updatedPayment = await Payment.findById(payment._id);
    expect(updatedPayment.status).toBe('REFUNDED');
    expect(updatedPayment.refunds).toHaveLength(1);
    expect(updatedPayment.refunds[0].razorpayRefundId).toBe('rfnd_123');
  });

  it('CASE D: Duplicate payment for an already confirmed appointment refunds the duplicate', async () => {
    // 1. Confirm original appointment
    appointment.status = 'CONFIRMED';
    await appointment.save();

    // 2. Create a duplicate fake payment pointing to the same appointment
    const dupPayment = await Payment.create({
      type: 'CONSULTATION',
      appointment: appointment._id,
      razorpayOrderId: 'order_DUPLICATE',
      amount: 50000,
      status: 'CREATED',
    });

    razorpayService.refundPayment.mockResolvedValue({ id: 'rfnd_dup' });

    // 3. Finalize the duplicate
    const result = await paymentService.finalizePayment(dupPayment.razorpayOrderId, 'pay_dup');

    expect(result.status).toBe('REFUNDED_DUPLICATE');

    const updatedDup = await Payment.findById(dupPayment._id);
    expect(updatedDup.status).toBe('REFUNDED');
  });

  describe('retryTransfer and manualRefund', () => {
    it('retryTransfer should fail if payment is not CAPTURED', async () => {
      payment.status = 'CREATED';
      await payment.save();
      await expect(paymentService.retryTransfer(payment._id)).rejects.toThrow('Payment is not in CAPTURED state');
    });

    it('manualRefund should successfully refund payment', async () => {
      payment.status = 'CAPTURED';
      payment.razorpayPaymentId = 'pay_123';
      await payment.save();
      
      razorpayService.refundPayment.mockResolvedValue({ id: 'rfnd_manual' });
      
      const result = await paymentService.manualRefund(payment._id, 'Customer requested refund');
      expect(result.status).toBe('REFUNDED');
      
      const updatedAppt = await Appointment.findById(appointment._id);
      expect(updatedAppt.paymentStatus).toBe('REFUNDED');
    });
  });
});

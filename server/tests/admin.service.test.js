const mongoose = require('mongoose');
const adminService = require('../src/services/admin.service');
const Appointment = require('../src/models/Appointment');
const Payment = require('../src/models/Payment');
const User = require('../src/models/User');

describe('Admin Service', () => {
  let admin, user1, appt1, payment1;

  beforeAll(async () => {
    admin = await User.create({
      name: 'Admin User',
      email: 'admin.test@example.com',
      password: 'Password123!',
      phone: '9999999999',
      role: 'ADMIN',
    });

    user1 = await User.create({
      name: 'Patient User',
      email: 'patient.test@example.com',
      password: 'Password123!',
      phone: '8888888888',
      role: 'PATIENT',
    });
  });

  afterAll(async () => {
    await User.deleteMany({});
    await Appointment.deleteMany({});
    await Payment.deleteMany({});
  });

  beforeEach(async () => {
    await Appointment.deleteMany({});
    await Payment.deleteMany({});

    appt1 = await Appointment.create({
      type: 'NORMAL',
      patient: user1._id,
      doctor: new mongoose.Types.ObjectId(),
      status: 'CONFIRMED',
      dateStr: '2026-10-10',
      startTime: '10:00',
      fee: { total: 50000 },
      bookingCode: 'BOK123',
    });

    payment1 = await Payment.create({
      appointment: appt1._id,
      amount: 50000,
      status: 'CAPTURED',
      razorpayOrderId: 'order_123',
      razorpayPaymentId: 'pay_123',
    });
  });

  describe('getAppointments', () => {
    it('should list all appointments with pagination', async () => {
      const result = await adminService.getAppointments({ page: 1, limit: 10 });
      expect(result.appointments).toHaveLength(1);
      expect(result.appointments[0]._id.toString()).toBe(appt1._id.toString());
      expect(result.meta.total).toBe(1);
    });

    it('should filter appointments by status', async () => {
      const result = await adminService.getAppointments({ status: 'PENDING_PAYMENT' });
      expect(result.appointments).toHaveLength(0);

      const resultConfirmed = await adminService.getAppointments({ status: 'CONFIRMED' });
      expect(resultConfirmed.appointments).toHaveLength(1);
    });
  });

  describe('getPayments', () => {
    it('should list all payments with pagination', async () => {
      const result = await adminService.getPayments({ page: 1, limit: 10 });
      expect(result.payments).toHaveLength(1);
      expect(result.payments[0]._id.toString()).toBe(payment1._id.toString());
      expect(result.meta.total).toBe(1);
    });

    it('should filter payments by status', async () => {
      const result = await adminService.getPayments({ status: 'CREATED' });
      expect(result.payments).toHaveLength(0);

      const resultCaptured = await adminService.getPayments({ status: 'CAPTURED' });
      expect(resultCaptured.payments).toHaveLength(1);
    });
  });
});

const mongoose = require('mongoose');
const subscriptionService = require('../src/services/subscription.service');
const DoctorProfile = require('../src/models/DoctorProfile');
const Subscription = require('../src/models/Subscription');
const AuditLog = require('../src/models/AuditLog');
const Plan = require('../src/models/Plan');
const notificationService = require('../src/services/notification.service');
const dayjs = require('dayjs');

jest.mock('../src/services/notification.service', () => ({
  sendAdminManualSubscriptionUpdate: jest.fn(),
}));

describe('Subscription Service', () => {
  let doctorId;
  let adminId;
  let planId;

  beforeEach(async () => {
    jest.clearAllMocks();

    const doctor = await DoctorProfile.create({
      fullName: 'Test Doctor',
      user: new mongoose.Types.ObjectId(),
      specializations: [],
      qualifications: [],
      clinic: {
        name: 'Test Clinic',
        line1: 'Line 1',
        city: 'City',
        state: 'State',
        pincode: '123456',
        location: { lat: 0, lng: 0 },
      },
      subscription: {
        status: 'TRIAL',
        endsAt: dayjs().add(7, 'day').toDate(),
      },
    });
    doctorId = doctor._id;

    adminId = new mongoose.Types.ObjectId();

    const plan = await Plan.create({
      name: 'Basic Plan',
      code: 'BASIC',
      durationDays: 30,
      price: 1000,
      isActive: true,
    });
    planId = plan._id;
  });

  describe('manualSubscriptionUpdate', () => {
    it('should grant days to a subscription', async () => {
      const result = await subscriptionService.manualSubscriptionUpdate(
        {
          action: 'GRANT_DAYS',
          doctorId,
          days: 10,
          reason: 'Test grant days',
        },
        adminId,
      );

      expect(result).toBeDefined();
      expect(result.type).toBe('ADMIN_GRANT');
      expect(result.source).toBe('ADMIN');
      expect(result.notes).toBe('Test grant days');

      const audit = await AuditLog.findOne({ action: 'SUBSCRIPTION_MANUAL_UPDATE' });
      expect(audit).toBeDefined();
      expect(audit.after.days).toBe(10);

      expect(notificationService.sendAdminManualSubscriptionUpdate).toHaveBeenCalled();
    });

    it('should set an exact end date', async () => {
      const futureDate = dayjs().add(15, 'day').format('YYYY-MM-DD');
      const result = await subscriptionService.manualSubscriptionUpdate(
        {
          action: 'SET_END_DATE',
          doctorId,
          endDate: futureDate,
          reason: 'Test set end date',
        },
        adminId,
      );

      expect(dayjs(result.endsAt).format('YYYY-MM-DD')).toBe(futureDate);
    });

    it('should assign a specific plan', async () => {
      const result = await subscriptionService.manualSubscriptionUpdate(
        {
          action: 'CHANGE_PLAN',
          doctorId,
          planId,
          reason: 'Test change plan',
        },
        adminId,
      );

      expect(result.plan.toString()).toBe(planId.toString());
    });

    it('should suspend a subscription', async () => {
      await subscriptionService.manualSubscriptionUpdate(
        {
          action: 'SUSPEND',
          doctorId,
          reason: 'Violation of terms',
        },
        adminId,
      );

      const doctor = await DoctorProfile.findById(doctorId);
      expect(doctor.subscription.status).toBe('SUSPENDED');

      const audit = await AuditLog.findOne({ action: 'SUBSCRIPTION_SUSPENDED' });
      expect(audit).toBeDefined();
    });

    it('should reactivate a suspended subscription', async () => {
      await subscriptionService.manualSubscriptionUpdate(
        {
          action: 'SUSPEND',
          doctorId,
          reason: 'Violation of terms',
        },
        adminId,
      );

      await subscriptionService.manualSubscriptionUpdate(
        {
          action: 'REACTIVATE',
          doctorId,
          reason: 'Resolved',
        },
        adminId,
      );

      const doctor = await DoctorProfile.findById(doctorId);
      expect(doctor.subscription.status).not.toBe('SUSPENDED');

      const audit = await AuditLog.findOne({ action: 'SUBSCRIPTION_REACTIVATED' });
      expect(audit).toBeDefined();
    });
  });
});

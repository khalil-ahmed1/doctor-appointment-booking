const mongoose = require('mongoose');
const { MongoMemoryReplSet } = require('mongodb-memory-server');
const Appointment = require('../src/models/Appointment');
const DoctorProfile = require('../src/models/DoctorProfile');
const { transition } = require('../src/services/appointment.service');
const ApiError = require('../src/utils/ApiError');

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

describe('Appointment Service - State Machine', () => {
  let doctorId;
  let adminUser;
  let doctorUser;
  let patientUser;

  beforeEach(async () => {
    doctorId = new mongoose.Types.ObjectId();
    adminUser = { id: new mongoose.Types.ObjectId(), role: 'ADMIN' };
    doctorUser = { id: new mongoose.Types.ObjectId(), role: 'DOCTOR' };
    patientUser = { id: new mongoose.Types.ObjectId(), role: 'PATIENT' };
  });

  afterEach(async () => {
    await Appointment.deleteMany();
  });

  const createInitialAppointment = async (type = 'PREMIUM') => {
    return await Appointment.create({
      bookingCode: `B-${Date.now()}`,
      patient: patientUser.id,
      doctor: doctorId,
      type: type,
      status: 'PENDING_PAYMENT',
      slotLock: 'test-lock',
    });
  };

  it('allows valid transitions and maintains audit log', async () => {
    let app = await createInitialAppointment();

    // PENDING_PAYMENT -> CONFIRMED (by patient system)
    app = await transition(app._id, 'CONFIRMED', patientUser);
    expect(app.status).toBe('CONFIRMED');
    expect(app.statusHistory).toHaveLength(1);
    expect(app.statusHistory[0].from).toBe('PENDING_PAYMENT');
    expect(app.statusHistory[0].to).toBe('CONFIRMED');
    expect(app.slotLock).toBe('test-lock'); // Should retain lock

    // CONFIRMED -> CHECKED_IN (by doctor)
    app = await transition(app._id, 'CHECKED_IN', doctorUser);
    expect(app.status).toBe('CHECKED_IN');
    expect(app.statusHistory).toHaveLength(2);

    // CHECKED_IN -> IN_PROGRESS
    app = await transition(app._id, 'IN_PROGRESS', doctorUser);
    expect(app.status).toBe('IN_PROGRESS');

    // IN_PROGRESS -> COMPLETED
    app = await transition(app._id, 'COMPLETED', doctorUser);
    expect(app.status).toBe('COMPLETED');
    expect(app.completedAt).toBeDefined();
  });

  it('rejects invalid state transitions', async () => {
    const app = await createInitialAppointment();

    // Cannot go directly from PENDING_PAYMENT to IN_PROGRESS
    await expect(transition(app._id, 'IN_PROGRESS', doctorUser)).rejects.toThrow(ApiError);
    await expect(transition(app._id, 'IN_PROGRESS', doctorUser)).rejects.toMatchObject({
      statusCode: 400,
      message: 'Cannot transition from PENDING_PAYMENT to IN_PROGRESS',
    });
  });

  it('enforces role restrictions', async () => {
    let app = await createInitialAppointment();
    app = await transition(app._id, 'CONFIRMED', patientUser); // Allowed

    // Patient cannot cancel as doctor or admin
    await expect(
      transition(app._id, 'CANCELLED_BY_DOCTOR', patientUser, 'Changed mind'),
    ).rejects.toThrow(ApiError);

    // Patient cannot check in
    await expect(transition(app._id, 'CHECKED_IN', patientUser)).rejects.toThrow(ApiError);
  });

  it('enforces type restrictions for specific statuses', async () => {
    const homeApp = await createInitialAppointment('HOME_VISIT');
    await transition(homeApp._id, 'CONFIRMED', patientUser);

    // Home visit cannot be CHECKED_IN
    await expect(transition(homeApp._id, 'CHECKED_IN', doctorUser)).rejects.toThrow(
      'CHECKED_IN status is only for PREMIUM appointments',
    );

    // Premium cannot be EN_ROUTE
    const premiumApp = await createInitialAppointment('PREMIUM');
    await transition(premiumApp._id, 'CONFIRMED', patientUser);
    await expect(transition(premiumApp._id, 'EN_ROUTE', doctorUser)).rejects.toThrow(
      'EN_ROUTE status is only for HOME_VISIT appointments',
    );
  });

  it('frees slotLock and requires reason on cancellation', async () => {
    const app = await createInitialAppointment();
    await transition(app._id, 'CONFIRMED', patientUser);

    // Missing reason
    await expect(transition(app._id, 'CANCELLED_BY_DOCTOR', doctorUser)).rejects.toThrow(
      'Cancellation reason is required',
    );

    // Valid cancellation
    const cancelledApp = await transition(app._id, 'CANCELLED_BY_DOCTOR', doctorUser, 'Emergency');

    expect(cancelledApp.status).toBe('CANCELLED_BY_DOCTOR');
    expect(cancelledApp.slotLock).toBeNull(); // Slot must be freed
    expect(cancelledApp.cancellation.reason).toBe('Emergency');
    expect(cancelledApp.cancellation.role).toBe('DOCTOR');
  });
});

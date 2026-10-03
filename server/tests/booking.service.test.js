const mongoose = require('mongoose');
const { MongoMemoryReplSet } = require('mongodb-memory-server');
const dayjs = require('dayjs');
const Appointment = require('../src/models/Appointment');
const DoctorProfile = require('../src/models/DoctorProfile');
const Schedule = require('../src/models/Schedule');
const bookingService = require('../src/services/booking.service');

let mongoServer;

beforeAll(async () => {
  // Must use Replica Set for MongoDB Transactions!
  mongoServer = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
  const mongoUri = mongoServer.getUri();
  await mongoose.connect(mongoUri);
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

describe('Booking Service - Slot Holds', () => {
  let docId;
  let user1;
  let user2;

  beforeEach(async () => {
    user1 = new mongoose.Types.ObjectId();
    user2 = new mongoose.Types.ObjectId();

    const doc = await DoctorProfile.create({
      user: new mongoose.Types.ObjectId(),
      slug: 'dr-concurrency',
      fullName: 'Dr. Concurrency',
      status: 'ACTIVE',
      isPublished: true,
      types: {
        premium: { enabled: true }
      }
    });
    docId = doc._id;

    // Create a 1-day schedule so slots exist
    const tomorrow = dayjs().tz('Asia/Kolkata').add(1, 'day');
    const dayOfWeek = tomorrow.day();

    await Schedule.create({
      doctor: docId,
      type: 'PREMIUM',
      slotDurationMin: 30,
      bufferMin: 0,
      advanceBookingDays: 30,
      minNoticeMinutes: 60,
      weeklyRules: Array.from({ length: 7 }, (_, i) => ({
        dayOfWeek: i,
        isWorking: i === dayOfWeek,
        windows: [{ start: '09:00', end: '10:00' }]
      }))
    });
  });

  afterEach(async () => {
    await Appointment.deleteMany();
    await DoctorProfile.deleteMany();
    await Schedule.deleteMany();
  });

  it('allows holding an available slot', async () => {
    const tomorrowStr = dayjs().tz('Asia/Kolkata').add(1, 'day').format('YYYY-MM-DD');
    const appt = await bookingService.holdSlot(
      user1, docId, 'PREMIUM', tomorrowStr, '09:00', '09:30', 'idem-1'
    );
    expect(appt).toBeDefined();
    expect(appt.status).toBe('PENDING_PAYMENT');
    expect(appt.slotLock).toBe(`${docId}|${tomorrowStr}|09:00`);
    expect(appt.idempotencyKey).toBe('idem-1');
  });

  it('prevents a user from holding more than 3 slots', async () => {
    const tomorrowStr = dayjs().tz('Asia/Kolkata').add(1, 'day').format('YYYY-MM-DD');
    
    // Cheat: Insert 3 holds manually
    await Appointment.create([
      { bookingCode: 'A1', patient: user1, doctor: docId, type: 'PREMIUM', status: 'PENDING_PAYMENT' },
      { bookingCode: 'A2', patient: user1, doctor: docId, type: 'PREMIUM', status: 'PENDING_PAYMENT' },
      { bookingCode: 'A3', patient: user1, doctor: docId, type: 'PREMIUM', status: 'PENDING_PAYMENT' },
    ]);

    await expect(
      bookingService.holdSlot(user1, docId, 'PREMIUM', tomorrowStr, '09:00', '09:30', 'idem-limit')
    ).rejects.toThrow('You cannot hold more than 3 slots simultaneously');
  });

  it('cleans up stale holds immediately upon request', async () => {
    // Insert a stale hold
    await Appointment.create({
      bookingCode: 'STALE',
      patient: user1,
      doctor: docId,
      type: 'PREMIUM',
      status: 'PENDING_PAYMENT',
      slotLock: 'stale-lock',
      holdExpiresAt: new Date(Date.now() - 1000) // 1 second ago
    });

    await bookingService.cleanupStaleHolds();

    const staleAppt = await Appointment.findOne({ bookingCode: 'STALE' });
    expect(staleAppt.status).toBe('EXPIRED');
    expect(staleAppt.slotLock).toBeNull(); // Freed!
  });

  it('supports 50 parallel hold requests on the same slot (Concurrency Test)', async () => {
    const tomorrowStr = dayjs().tz('Asia/Kolkata').add(1, 'day').format('YYYY-MM-DD');

    // Fire 50 simultaneous requests from 50 different users
    const promises = Array.from({ length: 50 }).map(async (_, i) => {
      const uId = new mongoose.Types.ObjectId();
      try {
        await bookingService.holdSlot(
          uId, docId, 'PREMIUM', tomorrowStr, '09:00', '09:30', `idem-batch-${i}`
        );
        return 'SUCCESS';
      } catch (error) {
        if (error.statusCode === 409 && error.code === 'SLOT_TAKEN') {
          return 'FAIL_TAKEN';
        }
        return `FAIL_OTHER: ${error.message}`;
      }
    });

    const results = await Promise.all(promises);
    
    const successes = results.filter(r => r === 'SUCCESS');
    const takenFails = results.filter(r => r === 'FAIL_TAKEN');
    const otherFails = results.filter(r => !['SUCCESS', 'FAIL_TAKEN'].includes(r));

    expect(otherFails).toHaveLength(0); // Ensure no random API errors
    expect(successes).toHaveLength(1); // EXACTLY ONE wins
    expect(takenFails).toHaveLength(49); // EXACTLY 49 fail with SLOT_TAKEN

    // Verify exactly 1 lock exists in DB
    const count = await Appointment.countDocuments({
      slotLock: `${docId}|${tomorrowStr}|09:00`
    });
    expect(count).toBe(1);
  });
});

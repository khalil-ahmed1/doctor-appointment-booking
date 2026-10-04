const mongoose = require('mongoose');
const { MongoMemoryReplSet } = require('mongodb-memory-server');
const dayjs = require('dayjs');
const utc = require('dayjs/plugin/utc');
const timezone = require('dayjs/plugin/timezone');

dayjs.extend(utc);
dayjs.extend(timezone);

const DoctorProfile = require('../src/models/DoctorProfile');
const Schedule = require('../src/models/Schedule');
const Appointment = require('../src/models/Appointment');
const slotService = require('../src/services/slot.service');

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

describe('Slot Service', () => {
  let docId;

  beforeEach(async () => {
    // Create doctor
    const doc = await DoctorProfile.create({
      user: new mongoose.Types.ObjectId(),
      slug: 'dr-test-slots',
      fullName: 'Dr. Test Slots',
      status: 'ACTIVE',
      isPublished: true,
      types: {
        premium: { enabled: true },
        homeVisit: { enabled: true },
      },
    });
    docId = doc._id;

    // Create schedule
    const tomorrow = dayjs().tz('Asia/Kolkata').add(1, 'day');
    const dayOfWeek = tomorrow.day();

    const weeklyRules = Array.from({ length: 7 }, (_, i) => ({
      dayOfWeek: i,
      isWorking: i === dayOfWeek, // Only working tomorrow
      windows: [{ start: '10:00', end: '12:00' }], // 120 mins
    }));

    await Schedule.create({
      doctor: doc._id,
      type: 'PREMIUM',
      slotDurationMin: 30,
      bufferMin: 0,
      advanceBookingDays: 30,
      minNoticeMinutes: 60,
      weeklyRules,
    });
  });

  afterEach(async () => {
    await DoctorProfile.deleteMany();
    await Schedule.deleteMany();
    await Appointment.deleteMany();
  });

  it('generates correct slots for a given date', async () => {
    const tomorrowStr = dayjs().tz('Asia/Kolkata').add(1, 'day').format('YYYY-MM-DD');
    const slots = await slotService.getSlotsForDate('dr-test-slots', 'PREMIUM', tomorrowStr);

    expect(slots).toHaveLength(4); // 10:00-10:30, 10:30-11:00, 11:00-11:30, 11:30-12:00
    expect(slots[0].startTime).toBe('10:00');
    expect(slots[0].status).toBe('AVAILABLE');
  });

  it('marks slots as HELD or BOOKED based on active appointments', async () => {
    const tomorrowStr = dayjs().tz('Asia/Kolkata').add(1, 'day').format('YYYY-MM-DD');

    // Create a PENDING_PAYMENT appointment (HELD)
    await Appointment.create({
      bookingCode: 'B1',
      patient: new mongoose.Types.ObjectId(),
      doctor: docId,
      type: 'PREMIUM',
      status: 'PENDING_PAYMENT',
      dateStr: tomorrowStr,
      startTime: '10:30',
      endTime: '11:00',
      holdExpiresAt: new Date(Date.now() + 10 * 60000), // valid for 10 mins
    });

    // Create a CONFIRMED appointment (BOOKED)
    await Appointment.create({
      bookingCode: 'B2',
      patient: new mongoose.Types.ObjectId(),
      doctor: docId,
      type: 'PREMIUM',
      status: 'CONFIRMED',
      dateStr: tomorrowStr,
      startTime: '11:30',
      endTime: '12:00',
    });

    const slots = await slotService.getSlotsForDate('dr-test-slots', 'PREMIUM', tomorrowStr);

    expect(slots[0].status).toBe('AVAILABLE'); // 10:00
    expect(slots[1].status).toBe('HELD'); // 10:30
    expect(slots[2].status).toBe('AVAILABLE'); // 11:00
    expect(slots[3].status).toBe('BOOKED'); // 11:30
  });
});

require('dotenv').config();
const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryReplSet } = require('mongodb-memory-server');
const app = require('../src/app');
const User = require('../src/models/User');
const DoctorProfile = require('../src/models/DoctorProfile');
const { generateTokens } = require('../src/utils/token');

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

describe('Doctor Profile APIs', () => {
  let doctorToken;
  let doctorUserId;
  let doctorProfileId;

  beforeEach(async () => {
    const user = await User.create({
      name: 'Dr. Test',
      email: 'drtest@example.com',
      phone: '9876543210',
      passwordHash: 'hashed',
      role: 'DOCTOR',
      status: 'ACTIVE',
    });
    doctorUserId = user._id;

    const profile = await DoctorProfile.create({
      user: user._id,
      fullName: 'Dr. Test',
      slug: 'dr-test',
      headline: 'Cardiologist',
      status: 'ACTIVE',
      isPublished: true,
      clinic: {
        name: 'Test Clinic',
        city: 'Delhi',
        location: { type: 'Point', coordinates: [77.2090, 28.6139] },
      }
    });
    doctorProfileId = profile._id;
    user.doctorProfile = profile._id;
    await user.save();

    const tokens = generateTokens(user);
    doctorToken = tokens.accessToken;
  });

  afterEach(async () => {
    await User.deleteMany();
    await DoctorProfile.deleteMany();
  });

  it('GET /api/v1/doctor/profile - returns the profile', async () => {
    const res = await request(app)
      .get('/api/v1/doctor/profile')
      .set('Authorization', `Bearer ${doctorToken}`);
    
    expect(res.status).toBe(200);
    expect(res.body.data.fullName).toBe('Dr. Test');
  });

  it('PATCH /api/v1/doctor/profile - updates profile details', async () => {
    const res = await request(app)
      .patch('/api/v1/doctor/profile')
      .set('Authorization', `Bearer ${doctorToken}`)
      .send({
        headline: 'Senior Cardiologist',
        experienceYears: 15,
      });

    expect(res.status).toBe(200);
    expect(res.body.data.headline).toBe('Senior Cardiologist');
    expect(res.body.data.experienceYears).toBe(15);
  });

  it('PATCH /api/v1/doctor/clinic - updates clinic and location', async () => {
    const res = await request(app)
      .patch('/api/v1/doctor/clinic')
      .set('Authorization', `Bearer ${doctorToken}`)
      .send({
        name: 'Heart Clinic',
        line1: '123 Main St',
        city: 'Mumbai',
        state: 'MH',
        pincode: '400001',
        lat: 18.9750,
        lng: 72.8258
      });

    expect(res.status).toBe(200);
    expect(res.body.data.name).toBe('Heart Clinic');
    expect(res.body.data.location.coordinates[0]).toBe(72.8258);
  });
});

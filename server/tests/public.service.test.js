const mongoose = require('mongoose');
const { searchDoctors } = require('../src/services/public.service');
const DoctorProfile = require('../src/models/DoctorProfile');
const Specialization = require('../src/models/Specialization');
const User = require('../src/models/User');

describe('Public Service - searchDoctors', () => {
  beforeEach(async () => {
    await DoctorProfile.deleteMany({});
    await Specialization.deleteMany({});
    await User.deleteMany({});
  });

  it('should return published and active doctors with active payout and valid subscription', async () => {
    const user = await User.create({
      name: 'Dr. Test',
      email: 'drtest@example.com',
      passwordHash: 'hashed',
      role: 'DOCTOR',
    });

    const spec = await Specialization.create({ name: 'Cardiology', isActive: true });

    await DoctorProfile.create({
      user: user._id,
      fullName: 'Test Doctor',
      slug: 'test-doctor',
      isPublished: true,
      status: 'ACTIVE',
      'subscription.status': 'ACTIVE',
      'payout.status': 'ACTIVE',
      isDeleted: false,
      specializations: [spec._id],
      'types.premium.enabled': true,
      'fees.premium': 50000,
    });

    // An invalid doctor
    await DoctorProfile.create({
      user: user._id,
      fullName: 'Hidden Doctor',
      slug: 'hidden-doctor',
      isPublished: false,
      status: 'ACTIVE',
      'subscription.status': 'ACTIVE',
      'payout.status': 'ACTIVE',
      isDeleted: false,
    });

    const result = await searchDoctors({ page: 1, limit: 10 });
    expect(result.doctors.length).toBe(1);
    expect(result.doctors[0].fullName).toBe('Test Doctor');
  });

  it('should filter by specialization and city', async () => {
    const user = await User.create({
      name: 'Dr. Filter',
      email: 'filter@example.com',
      passwordHash: 'hashed',
      role: 'DOCTOR',
    });

    const spec1 = await Specialization.create({ name: 'Cardiology' });
    const spec2 = await Specialization.create({ name: 'Dermatology' });

    await DoctorProfile.create({
      user: user._id,
      fullName: 'Doc 1',
      slug: 'doc-1',
      isPublished: true,
      status: 'ACTIVE',
      'subscription.status': 'ACTIVE',
      'payout.status': 'ACTIVE',
      specializations: [spec1._id],
      clinic: { city: 'Mumbai' },
    });

    await DoctorProfile.create({
      user: user._id,
      fullName: 'Doc 2',
      slug: 'doc-2',
      isPublished: true,
      status: 'ACTIVE',
      'subscription.status': 'ACTIVE',
      'payout.status': 'ACTIVE',
      specializations: [spec2._id],
      clinic: { city: 'Delhi' },
    });

    const resultCity = await searchDoctors({ city: 'Mumbai', page: 1, limit: 10 });
    expect(resultCity.doctors.length).toBe(1);
    expect(resultCity.doctors[0].fullName).toBe('Doc 1');

    const resultSpec = await searchDoctors({ specializations: spec2._id.toString(), page: 1, limit: 10 });
    expect(resultSpec.doctors.length).toBe(1);
    expect(resultSpec.doctors[0].fullName).toBe('Doc 2');
  });
});

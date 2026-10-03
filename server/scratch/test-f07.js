require('dotenv').config({ path: '../.env' });
const mongoose = require('mongoose');
const { onboardDoctor } = require('../src/services/admin.service');
const { resetPassword } = require('../src/services/auth.service');
const User = require('../src/models/User');
const DoctorProfile = require('../src/models/DoctorProfile');
const { MongoMemoryReplSet } = require('mongodb-memory-server');

async function run() {
  const replSet = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
  const uri = replSet.getUri();
  await mongoose.connect(uri);

  console.log('Connected to Memory DB');

  // Create an admin
  const admin = await User.create({
    name: 'Admin',
    email: 'admin@test.com',
    phone: '0000000000',
    role: 'ADMIN'
  });

  const doctorData = {
    fullName: 'Test Doctor',
    email: 'testdoctor@example.com',
    phone: '1234567890',
    sendInvite: true,
  };

  try {
    const docProfile = await onboardDoctor(doctorData, admin._id);
    console.log('Doctor created, status:', docProfile.status);

    const user = await User.findById(docProfile.user);
    console.log('User status after invite:', user.status);

    // Extract token - wait, the token is not returned, it's sent via email. 
    // We can get the resetTokenHash and simulate token check if we had the token.
    // Let's generate our own token instead for testing, or patch it.
    
    // Instead of resetting password via service, let's manually fetch the user and simulate the password reset.
    // wait, we can't get the unhashed token. 
    // Let's just create a token and set it manually for the test.
    const { generateRandomToken, hashToken } = require('../src/utils/token');
    const token = generateRandomToken();
    user.resetTokenHash = hashToken(token);
    user.resetTokenExpires = Date.now() + 100000;
    await user.save();

    console.log('Simulating resetPassword...');
    await resetPassword(token, 'NewPass123!');

    const updatedUser = await User.findById(docProfile.user);
    console.log('Updated user status:', updatedUser.status);
    console.log('Updated user passwordHash exists:', !!updatedUser.passwordHash);

    const updatedProfile = await DoctorProfile.findById(docProfile._id);
    console.log('Updated profile status:', updatedProfile.status);

  } catch (err) {
    console.error('Test failed', err);
  } finally {
    await mongoose.disconnect();
    await replSet.stop();
  }
}

run();

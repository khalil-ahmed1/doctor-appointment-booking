const User = require('../models/User');
const DoctorProfile = require('../models/DoctorProfile');
const Subscription = require('../models/Subscription');
const Setting = require('../models/Setting');
const ApiError = require('../utils/ApiError');
const { generateRandomToken, hashToken } = require('../utils/token');
const emailService = require('./email.service');
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
const slugify = require('slugify');

const generateUniqueSlug = async (fullName) => {
  const baseSlug = slugify(fullName, { lower: true, strict: true });
  let slug = baseSlug;
  let counter = 1;
  while (await DoctorProfile.exists({ slug })) {
    slug = `${baseSlug}-${counter}`;
    counter++;
  }
  return slug;
};

const onboardDoctor = async (doctorData, adminId) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const {
      fullName, email, phone, password, sendInvite,
      specializations, qualifications, experienceYears, registration,
      languages, gender, bio, clinic, fees, types, payout
    } = doctorData;

    // 1. Check existing user
    const existingUser = await User.findOne({ $or: [{ email }, { phone }] }).session(session);
    if (existingUser) {
      throw new ApiError(409, 'CONFLICT', 'User with this email or phone already exists');
    }

    // 2. Prepare Auth
    let passwordHash;
    let resetToken = null;
    let resetTokenHash = null;
    let resetTokenExpires = null;

    if (password) {
      passwordHash = await bcrypt.hash(password, 12);
    } else if (sendInvite) {
      resetToken = generateRandomToken();
      resetTokenHash = hashToken(resetToken);
      resetTokenExpires = Date.now() + 72 * 60 * 60 * 1000; // 72 hours
    } else {
      // Generate random password if neither provided
      const randomPassword = generateRandomToken().substring(0, 12);
      passwordHash = await bcrypt.hash(randomPassword, 12);
    }

    // 3. Create User
    const user = new User({
      name: fullName,
      email,
      phone,
      passwordHash,
      role: 'DOCTOR',
      status: sendInvite ? 'INVITED' : 'ACTIVE',
      gender,
      emailVerified: true, // Admin created
      resetTokenHash,
      resetTokenExpires,
    });
    await user.save({ session });

    // 4. Create DoctorProfile
    const slug = await generateUniqueSlug(fullName);
    
    if (clinic && clinic.location && typeof clinic.location.lng !== 'undefined' && typeof clinic.location.lat !== 'undefined') {
      clinic.location = {
        type: 'Point',
        coordinates: [clinic.location.lng, clinic.location.lat],
      };
    }

    const doctorProfile = new DoctorProfile({
      user: user._id,
      fullName,
      slug,
      gender,
      bio,
      experienceYears,
      specializations,
      qualifications,
      registration,
      languages,
      clinic,
      fees,
      types,
      payout,
      status: sendInvite ? 'INVITED' : 'ACTIVE',
      onboardedAt: new Date(),
      onboardedBy: adminId,
    });

    // 5. Subscription Setup
    const setting = await Setting.findOne({ key: 'trialDays' }).session(session);
    const trialDays = setting ? parseInt(setting.value, 10) : 7;
    const endsAt = new Date();
    endsAt.setDate(endsAt.getDate() + trialDays);

    doctorProfile.subscription = {
      status: 'TRIAL',
      endsAt,
      trialUsed: true,
    };
    await doctorProfile.save({ session });
    
    user.doctorProfile = doctorProfile._id;
    await user.save({ session });

    // 6. Create Subscription Record
    const subscription = new Subscription({
      doctor: doctorProfile._id,
      type: 'TRIAL',
      source: 'ADMIN',
      startsAt: new Date(),
      endsAt,
      createdBy: adminId,
      reason: 'Initial Onboarding Trial',
    });
    await subscription.save({ session });

    await session.commitTransaction();
    session.endSession();

    // 7. Send Invite Email (non-blocking)
    if (sendInvite && resetToken) {
      emailService.sendEmail(
        email,
        'Welcome to the Platform - Set Your Password',
        'doctorInvite',
        { name: fullName, token: resetToken, trialEndDate: endsAt.toISOString() }
      ).catch(console.error); // Catch to prevent failure after tx commit
    }

    return doctorProfile;
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    throw error;
  }
};

const getDoctors = async (query = {}) => {
  const { page = 1, limit = 12, status, isPublished, search } = query;
  
  const filter = {};
  if (status) filter.status = status;
  if (isPublished !== undefined) filter.isPublished = isPublished === 'true';
  
  if (search) {
    filter.$text = { $search: search };
  }

  const skip = (page - 1) * limit;

  const doctors = await DoctorProfile.find(filter)
    .populate('user', 'email phone')
    .populate('specializations', 'name')
    .skip(skip)
    .limit(parseInt(limit, 10))
    .sort({ createdAt: -1 });
    
  const total = await DoctorProfile.countDocuments(filter);

  return {
    doctors,
    meta: {
      page: parseInt(page, 10),
      limit: parseInt(limit, 10),
      total,
    }
  };
};

const getDoctorById = async (id) => {
  const doctor = await DoctorProfile.findById(id)
    .populate('user', 'email phone status')
    .populate('specializations')
    .populate('onboardedBy', 'name');
    
  if (!doctor) {
    throw new ApiError(404, 'NOT_FOUND', 'Doctor not found');
  }
  return doctor;
};

const updateDoctor = async (id, updateData) => {
  const doctor = await DoctorProfile.findById(id);
  if (!doctor) {
    throw new ApiError(404, 'NOT_FOUND', 'Doctor not found');
  }

  // Nested object updates require careful merging to avoid overwriting unprovided fields
  // Using lodash merge could be good, but we can also use Mongoose set
  
  if (updateData.clinic && updateData.clinic.location && typeof updateData.clinic.location.lng !== 'undefined' && typeof updateData.clinic.location.lat !== 'undefined') {
    updateData.clinic.location = {
      type: 'Point',
      coordinates: [updateData.clinic.location.lng, updateData.clinic.location.lat],
    };
  }

  doctor.set(updateData);
  await doctor.save();
  return doctor;
};

const updateDoctorStatus = async (id, status) => {
  const doctor = await DoctorProfile.findById(id);
  if (!doctor) {
    throw new ApiError(404, 'NOT_FOUND', 'Doctor not found');
  }

  const user = await User.findById(doctor.user);
  
  doctor.status = status;
  if (user) {
    // Sync User status if it's ACTIVE, but do not sync SUSPENDED since User enum doesn't support it 
    // and suspended doctors can still log in.
    if (status === 'ACTIVE') {
      user.status = 'ACTIVE';
    }
    await user.save();
  }
  
  await doctor.save();
  return doctor;
};

const updateDoctorPublish = async (id, isPublished) => {
  const doctor = await DoctorProfile.findById(id);
  if (!doctor) {
    throw new ApiError(404, 'NOT_FOUND', 'Doctor not found');
  }

  doctor.isPublished = isPublished;
  await doctor.save();
  return doctor;
};

module.exports = {
  onboardDoctor,
  getDoctors,
  getDoctorById,
  updateDoctor,
  updateDoctorStatus,
  updateDoctorPublish,
};

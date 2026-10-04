const DoctorProfile = require('../models/DoctorProfile');
const ApiError = require('../utils/ApiError');
const { uploadImage, deleteImage } = require('./upload.service');

const getDoctorProfileByUser = async (userId) => {
  const profile = await DoctorProfile.findOne({ user: userId })
    .populate('user', 'firstName lastName avatarUrl')
    .populate('specializations');
  if (!profile) {
    throw new ApiError(404, 'NOT_FOUND', 'Doctor profile not found');
  }
  return profile;
};

const updateProfile = async (userId, data) => {
  const profile = await getDoctorProfileByUser(userId);

  // Update allowed fields
  if (data.headline !== undefined) profile.headline = data.headline;
  if (data.bio !== undefined) profile.bio = data.bio;
  if (data.experienceYears !== undefined) profile.experienceYears = data.experienceYears;
  if (data.gender !== undefined) profile.gender = data.gender;
  if (data.specializations !== undefined) profile.specializations = data.specializations;
  if (data.languages !== undefined) profile.languages = data.languages;
  if (data.services !== undefined) profile.services = data.services;
  if (data.awards !== undefined) profile.awards = data.awards;
  if (data.videoUrl !== undefined) profile.videoUrl = data.videoUrl;
  if (data.social !== undefined) profile.social = data.social;
  if (data.qualifications !== undefined) profile.qualifications = data.qualifications;

  await profile.save();
  return profile.populate('specializations');
};

const updateProfilePicture = async (userId, imageBuffer, originalName) => {
  // const profile = await getDoctorProfileByUser(userId);

  const imageUrl = await uploadImage(imageBuffer, originalName, 'profile');

  // We are overriding the avatarUrl on the User model as well if needed, but the PRD says
  // profile picture is under `avatarUrl` in User, wait, the DoctorProfile schema does not have `avatarUrl` or `profilePicture`.
  // Let me check PRD / models.
  // Wait, let's look at `User` model for `avatarUrl`.
  const User = require('../models/User');
  const user = await User.findById(userId);
  if (!user) throw new ApiError(404, 'NOT_FOUND', 'User not found');

  // Delete old picture if exists
  if (user.avatarUrl) {
    await deleteImage(user.avatarUrl);
  }

  user.avatarUrl = imageUrl;
  await user.save();

  return imageUrl;
};

const deleteProfilePicture = async (userId) => {
  const User = require('../models/User');
  const user = await User.findById(userId);
  if (!user) throw new ApiError(404, 'NOT_FOUND', 'User not found');

  if (user.avatarUrl) {
    await deleteImage(user.avatarUrl);
    user.avatarUrl = null;
    await user.save();
  }
};

const addGalleryImage = async (userId, imageBuffer, originalName, caption, order) => {
  const profile = await getDoctorProfileByUser(userId);

  if (profile.gallery && profile.gallery.length >= 12) {
    throw new ApiError(422, 'LIMIT_EXCEEDED', 'Maximum 12 gallery images allowed');
  }

  const imageUrl = await uploadImage(imageBuffer, originalName, 'gallery');

  const nextOrder = order !== undefined ? order : profile.gallery.length + 1;

  profile.gallery.push({
    url: imageUrl,
    caption: caption || '',
    order: nextOrder,
  });

  await profile.save();
  return profile.gallery;
};

const updateGalleryImage = async (userId, imageId, caption, order) => {
  const profile = await getDoctorProfileByUser(userId);

  const image = profile.gallery.id(imageId);
  if (!image) {
    throw new ApiError(404, 'NOT_FOUND', 'Image not found in gallery');
  }

  if (caption !== undefined) image.caption = caption;
  if (order !== undefined) image.order = order;

  await profile.save();
  return profile.gallery;
};

const deleteGalleryImage = async (userId, imageId) => {
  const profile = await getDoctorProfileByUser(userId);

  const image = profile.gallery.id(imageId);
  if (!image) {
    throw new ApiError(404, 'NOT_FOUND', 'Image not found in gallery');
  }

  await deleteImage(image.url);
  profile.gallery.pull(imageId);

  await profile.save();
  return profile.gallery;
};

const updateClinic = async (userId, clinicData) => {
  const profile = await getDoctorProfileByUser(userId);

  const { lat, lng, ...rest } = clinicData;

  profile.clinic = {
    ...profile.clinic,
    ...rest,
    location: {
      type: 'Point',
      coordinates: [lng, lat],
    },
  };

  await profile.save();
  return profile.clinic;
};

const updateFees = async (userId, feesData) => {
  const profile = await getDoctorProfileByUser(userId);

  if (feesData.normal !== undefined) profile.fees.normal = feesData.normal;
  if (feesData.premium !== undefined) profile.fees.premium = feesData.premium;
  if (feesData.homeVisit !== undefined) profile.fees.homeVisit = feesData.homeVisit;

  await profile.save();
  return profile.fees;
};

const updateTypes = async (userId, typesData) => {
  const profile = await getDoctorProfileByUser(userId);

  if (typesData.normal) {
    if (typesData.normal.enabled !== undefined) {
      if (typesData.normal.enabled && (profile.fees.normal || 0) <= 0) {
        throw new ApiError(400, 'FEE_NOT_SET', 'Normal fee must be set before enabling');
      }
      profile.types.normal.enabled = typesData.normal.enabled;
    }
    if (typesData.normal.dailyTokenLimit !== undefined)
      profile.types.normal.dailyTokenLimit = typesData.normal.dailyTokenLimit;
    if (typesData.normal.walkInHoursText !== undefined)
      profile.types.normal.walkInHoursText = typesData.normal.walkInHoursText;
  }

  if (typesData.premium) {
    if (typesData.premium.enabled !== undefined) {
      if (typesData.premium.enabled && (profile.fees.premium || 0) <= 0) {
        throw new ApiError(400, 'FEE_NOT_SET', 'Premium fee must be set before enabling');
      }
      // Note: checking working days/windows will be done in F-14 / F-15
      profile.types.premium.enabled = typesData.premium.enabled;
    }
  }

  if (typesData.homeVisit) {
    if (typesData.homeVisit.enabled !== undefined) {
      if (typesData.homeVisit.enabled && (profile.fees.homeVisit || 0) <= 0) {
        throw new ApiError(400, 'FEE_NOT_SET', 'Home Visit fee must be set before enabling');
      }
      profile.types.homeVisit.enabled = typesData.homeVisit.enabled;
    }
    if (typesData.homeVisit.serviceArea) {
      if (typesData.homeVisit.serviceArea.mode !== undefined)
        profile.types.homeVisit.serviceArea.mode = typesData.homeVisit.serviceArea.mode;
      if (typesData.homeVisit.serviceArea.radiusKm !== undefined)
        profile.types.homeVisit.serviceArea.radiusKm = typesData.homeVisit.serviceArea.radiusKm;
      if (typesData.homeVisit.serviceArea.pincodes !== undefined)
        profile.types.homeVisit.serviceArea.pincodes = typesData.homeVisit.serviceArea.pincodes;
    }
  }

  await profile.save();
  return profile.types;
};

const getDashboardKPIs = async (userId) => {
  const profile = await getDoctorProfileByUser(userId);
  const Appointment = require('../models/Appointment');
  const Payment = require('../models/Payment');
  const dayjs = require('dayjs');

  const todayDateStr = dayjs().format('YYYY-MM-DD');
  const startOfMonth = dayjs().startOf('month').toDate();

  // 1. Today's counts
  const todayAppointments = await Appointment.find({ doctor: profile._id, dateStr: todayDateStr });

  let todayConfirmed = 0;
  let todayCompleted = 0;
  let todayPending = 0;

  todayAppointments.forEach((app) => {
    if (['CONFIRMED', 'CHECKED_IN', 'EN_ROUTE', 'IN_PROGRESS'].includes(app.status))
      todayConfirmed++;
    if (app.status === 'COMPLETED') todayCompleted++;
    if (app.status === 'PENDING_PAYMENT') todayPending++;
  });

  // 2. Upcoming appointments (next 7 days)
  const upcomingAppointmentsCount = await Appointment.countDocuments({
    doctor: profile._id,
    status: { $in: ['CONFIRMED', 'CHECKED_IN', 'EN_ROUTE', 'IN_PROGRESS'] },
    dateStr: { $gte: todayDateStr, $lte: dayjs().add(7, 'day').format('YYYY-MM-DD') },
  });

  // 3. Normal queue size
  const normalQueueSize = await Appointment.countDocuments({
    doctor: profile._id,
    type: 'NORMAL',
    status: 'CONFIRMED', // Tokens in queue
    validUntil: { $gte: new Date() },
  });

  // 4. This month's earnings (net to doctor)
  const thisMonthAppointments = await Appointment.find({
    doctor: profile._id,
    dateStr: { $gte: dayjs(startOfMonth).format('YYYY-MM-DD') }, // approximate filter
  }).select('_id');

  const appointmentIds = thisMonthAppointments.map((a) => a._id);

  const thisMonthPayments = await Payment.find({
    appointment: { $in: appointmentIds },
    createdAt: { $gte: startOfMonth },
    status: 'CAPTURED',
  });

  let thisMonthEarnings = 0;
  thisMonthPayments.forEach((p) => {
    if (p.transfers && p.transfers.length > 0) {
      // Sum successful transfers
      p.transfers.forEach((t) => {
        if (t.status !== 'failed') {
          thisMonthEarnings += t.amount;
        }
      });
    } else if (p.breakdown && p.breakdown.feeBearer === 'PATIENT') {
      // Fallback if transfer hasn't processed yet but fee is PATIENT
      const amount = p.breakdown.consultationFee - (p.breakdown.platformCommission || 0);
      if (amount > 0) thisMonthEarnings += amount;
    } else if (p.breakdown && p.breakdown.feeBearer === 'DOCTOR') {
      // Fallback for DOCTOR estimation
      const actualFee = p.breakdown.actualGatewayFee || 0;
      const actualTax = p.breakdown.actualGatewayGst || 0;
      const amount =
        p.breakdown.total - actualFee - actualTax - (p.breakdown.platformCommission || 0);
      if (amount > 0) thisMonthEarnings += amount;
    }
  });

  return {
    today: {
      confirmed: todayConfirmed,
      completed: todayCompleted,
      pending: todayPending,
    },
    upcomingAppointmentsCount,
    normalQueueSize,
    thisMonthEarnings,
    payoutStatus: profile.payout?.linkedAccountStatus || 'PENDING',
    subscriptionStatus: {
      status: profile.subscriptionSummary?.status || 'TRIAL',
      endsAt: profile.subscriptionSummary?.endsAt,
      planName: profile.subscriptionSummary?.planName,
    },
  };
};

const getDoctorAppointments = async (userId, queryParams) => {
  const profile = await getDoctorProfileByUser(userId);
  const Appointment = require('../models/Appointment');

  const { type, status, startDate, endDate, search, page = 1, limit = 10 } = queryParams;

  const filter = { doctor: profile._id };

  if (type) filter.type = type;
  if (status) filter.status = status;

  if (startDate || endDate) {
    filter.dateStr = {};
    if (startDate) filter.dateStr.$gte = startDate;
    if (endDate) filter.dateStr.$lte = endDate;
  }

  if (search) {
    const searchRegex = new RegExp(search, 'i');
    filter.$or = [
      { bookingCode: searchRegex },
      { 'patientDetails.name': searchRegex },
      { 'patientDetails.phone': searchRegex },
    ];
  }

  const skip = (page - 1) * limit;

  const [appointments, total] = await Promise.all([
    Appointment.find(filter)
      .populate('patient', 'name email avatarUrl')
      .sort({ dateStr: 1, startTime: 1, tokenSeq: 1 })
      .skip(skip)
      .limit(limit),
    Appointment.countDocuments(filter),
  ]);

  return {
    appointments,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  };
};

const getNormalQueue = async (userId) => {
  const profile = await getDoctorProfileByUser(userId);
  const Appointment = require('../models/Appointment');

  // Fetch active normal queue tokens
  const queue = await Appointment.find({
    doctor: profile._id,
    type: 'NORMAL',
    status: { $in: ['CONFIRMED', 'CHECKED_IN', 'IN_PROGRESS'] },
    validUntil: { $gte: new Date() },
  })
    .populate('patient', 'name email avatarUrl')
    .sort({ tokenSeq: 1 });

  return queue;
};

const getEarnings = async (userId, queryParams) => {
  const profile = await getDoctorProfileByUser(userId);
  const Appointment = require('../models/Appointment');
  const Payment = require('../models/Payment');

  const { startDate, endDate, page = 1, limit = 10 } = queryParams;

  const apptFilter = { doctor: profile._id };
  if (startDate || endDate) {
    apptFilter.dateStr = {};
    if (startDate) apptFilter.dateStr.$gte = startDate;
    if (endDate) apptFilter.dateStr.$lte = endDate;
  }

  const appointments = await Appointment.find(apptFilter).select(
    '_id bookingCode type dateStr startTime patientDetails',
  );
  const appointmentMap = {};
  const appointmentIds = appointments.map((a) => {
    appointmentMap[a._id.toString()] = a;
    return a._id;
  });

  const paymentFilter = {
    appointment: { $in: appointmentIds },
    status: { $in: ['CAPTURED', 'REFUNDED', 'PARTIALLY_REFUNDED'] },
  };

  const skip = (page - 1) * limit;

  const [payments, total] = await Promise.all([
    Payment.find(paymentFilter).sort({ createdAt: -1 }).skip(skip).limit(limit),
    Payment.countDocuments(paymentFilter),
  ]);

  const transactions = payments.map((p) => {
    const appt = appointmentMap[p.appointment.toString()];

    // Calculate net to doctor
    let netToDoctor = 0;
    let transferStatus = 'PENDING';
    let settlementId = null;

    if (p.transfers && p.transfers.length > 0) {
      const latestTransfer = p.transfers[p.transfers.length - 1];
      if (latestTransfer.status !== 'failed') {
        netToDoctor = latestTransfer.amount;
        transferStatus = latestTransfer.status;
        settlementId = latestTransfer.razorpayTransferId;
      }
    } else {
      if (p.breakdown.feeBearer === 'PATIENT') {
        netToDoctor = p.breakdown.consultationFee - (p.breakdown.platformCommission || 0);
      } else {
        const fee = p.breakdown.actualGatewayFee || Math.round(p.breakdown.total * 0.02);
        const tax = p.breakdown.actualGatewayGst || Math.round(fee * 0.18);
        netToDoctor = p.breakdown.total - fee - tax - (p.breakdown.platformCommission || 0);
      }
    }

    const isRefunded = p.status === 'REFUNDED';
    if (isRefunded) {
      netToDoctor = -netToDoctor;
      transferStatus = 'REFUNDED';
    }

    return {
      id: p._id,
      bookingCode: appt ? appt.bookingCode : 'N/A',
      type: appt ? appt.type : 'N/A',
      patientName: appt?.patientDetails?.name || 'N/A',
      date: p.createdAt,
      gross: p.breakdown?.consultationFee || 0,
      totalPaidByPatient: p.breakdown?.total || 0,
      gatewayFee: p.breakdown?.actualGatewayFee || 0,
      gstOnFee: p.breakdown?.actualGatewayGst || 0,
      platformCommission: p.breakdown?.platformCommission || 0,
      netToDoctor,
      transferStatus,
      settlementId,
      isRefunded,
    };
  });

  return {
    transactions,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  };
};

const exportEarningsCSV = async (userId, queryParams) => {
  // Same logic as getEarnings but no pagination
  const { startDate, endDate } = queryParams;
  const { transactions } = await getEarnings(userId, {
    startDate,
    endDate,
    page: 1,
    limit: 100000,
  });

  const { Parser } = require('json2csv');
  const fields = [
    'bookingCode',
    'date',
    'type',
    'patientName',
    'gross',
    'totalPaidByPatient',
    'gatewayFee',
    'gstOnFee',
    'platformCommission',
    'netToDoctor',
    'transferStatus',
    'settlementId',
  ];

  const opts = { fields };

  try {
    const parser = new Parser(opts);
    const csv = parser.parse(
      transactions.map((t) => ({
        ...t,
        date: t.date.toISOString(),
        gross: (t.gross / 100).toFixed(2),
        totalPaidByPatient: (t.totalPaidByPatient / 100).toFixed(2),
        gatewayFee: (t.gatewayFee / 100).toFixed(2),
        gstOnFee: (t.gstOnFee / 100).toFixed(2),
        platformCommission: (t.platformCommission / 100).toFixed(2),
        netToDoctor: (t.netToDoctor / 100).toFixed(2),
      })),
    );
    return csv;
  } catch (err) {
    throw new ApiError(500, 'SERVER_ERROR', 'Could not generate CSV');
  }
};

module.exports = {
  getDoctorProfileByUser,
  updateProfile,
  updateProfilePicture,
  deleteProfilePicture,
  addGalleryImage,
  updateGalleryImage,
  deleteGalleryImage,
  updateClinic,
  updateFees,
  updateTypes,
  getDashboardKPIs,
  getDoctorAppointments,
  getNormalQueue,
  getEarnings,
  exportEarningsCSV,
};

const Subscription = require('../models/Subscription');
const DoctorProfile = require('../models/DoctorProfile');
const Setting = require('../models/Setting');
const ApiError = require('../utils/ApiError');
const dayjs = require('dayjs');

const getGraceDays = async () => {
  const setting = await Setting.findOne({ key: 'graceDays' });
  return setting && setting.value !== undefined ? Number(setting.value) : 2;
};

/**
 * Computes and updates the doctor's subscription status based on current time and subscription records.
 * State Machine:
 * - TRIAL/PAID with endsAt > now -> ACTIVE or TRIAL
 * - endsAt < now but now < endsAt + graceDays -> GRACE
 * - else -> EXPIRED
 * Note: SUSPENDED is a manual admin state and should not be automatically overridden unless admin reacts.
 * If status is SUSPENDED, we just update the endsAt but don't change the status.
 */
const computeAndUpdateSubscriptionState = async (doctorId) => {
  const doctor = await DoctorProfile.findById(doctorId);
  if (!doctor) throw new ApiError(404, 'NOT_FOUND', 'Doctor not found');

  // If suspended by admin, we don't automatically reactivate/expire them.
  // Wait, if it's suspended and time passes, does it stay suspended? Yes.
  // We can still compute what it "should" be and maybe update if it's not suspended.

  // Find the latest active/future subscription by endsAt
  const latestSub = await Subscription.findOne({ doctor: doctorId }).sort({
    endsAt: -1,
    createdAt: -1,
  });

  if (!latestSub) {
    return doctor;
  }

  const now = dayjs();
  const endsAt = dayjs(latestSub.endsAt);
  const graceDays = await getGraceDays();

  let newStatus = doctor.subscription.status;

  if (newStatus !== 'SUSPENDED') {
    if (now.isBefore(endsAt) || now.isSame(endsAt)) {
      newStatus = latestSub.type === 'TRIAL' ? 'TRIAL' : 'ACTIVE';
    } else if (now.isBefore(endsAt.add(graceDays, 'day'))) {
      newStatus = 'GRACE';
    } else {
      newStatus = 'EXPIRED';
    }
  }

  // Always update endsAt and planName to reflect the latest state
  doctor.subscription.status = newStatus;
  doctor.subscription.endsAt = latestSub.endsAt;

  if (latestSub.plan) {
    const Plan = require('../models/Plan');
    const plan = await Plan.findById(latestSub.plan);
    doctor.subscription.planName = plan ? plan.name : 'Unknown Plan';
  } else if (latestSub.type === 'TRIAL') {
    doctor.subscription.planName = '7-Day Trial';
  } else {
    doctor.subscription.planName = 'Manual Grant';
  }

  await doctor.save();
  return doctor;
};

const getSubscriptions = async (query) => {
  const { doctorId, page = 1, limit = 20 } = query;
  const filter = {};
  if (doctorId) filter.doctor = doctorId;

  const skip = (page - 1) * limit;
  const subscriptions = await Subscription.find(filter)
    .populate('doctor', 'fullName slug')
    .populate('plan', 'name code')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(Number(limit));

  const total = await Subscription.countDocuments(filter);

  return {
    subscriptions,
    meta: {
      page: Number(page),
      limit: Number(limit),
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
};

module.exports = {
  computeAndUpdateSubscriptionState,
  getSubscriptions,
};

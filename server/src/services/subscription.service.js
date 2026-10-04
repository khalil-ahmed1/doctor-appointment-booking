const Subscription = require('../models/Subscription');
const DoctorProfile = require('../models/DoctorProfile');
const Setting = require('../models/Setting');
const Plan = require('../models/Plan');
const Payment = require('../models/Payment');
const Counter = require('../models/Counter');
const razorpayService = require('./razorpay.service');
const pdfService = require('./pdf.service');
const uploadService = require('./upload.service');
const ApiError = require('../utils/ApiError');
const dayjs = require('dayjs');
const AuditLog = require('../models/AuditLog');
const notificationService = require('./notification.service');

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

const createSubscriptionOrder = async (doctorId, planId) => {
  const plan = await Plan.findById(planId);
  if (!plan || !plan.isActive) {
    throw new ApiError(404, 'NOT_FOUND', 'Plan not found or inactive');
  }

  const amount = plan.price;
  const gst = Math.round(amount * (plan.gstPercent / 100));
  const total = amount + gst;

  const order = await razorpayService.createOrder(total, `sub_${doctorId}_${Date.now()}`);

  const payment = await Payment.create({
    type: 'SUBSCRIPTION',
    razorpayOrderId: order.id,
    amount: total,
    currency: 'INR',
    status: 'CREATED',
    doctor: doctorId,
    plan: planId,
    breakdown: {
      total: total,
    },
  });

  return {
    orderId: order.id,
    amount: total,
    currency: 'INR',
    paymentId: payment._id,
    plan,
  };
};

const getNextInvoiceNo = async () => {
  const counter = await Counter.findOneAndUpdate(
    { key: 'invoiceNo' },
    { $inc: { value: 1 } },
    { new: true, upsert: true },
  );
  return `INV-${new Date().getFullYear()}-${String(counter.value).padStart(6, '0')}`;
};

const finalizeSubscriptionPayment = async (razorpayOrderId, razorpayPaymentId) => {
  const payment = await Payment.findOne({ razorpayOrderId });
  if (!payment) throw new ApiError(404, 'NOT_FOUND', 'Payment not found');

  if (payment.status === 'CAPTURED') {
    return { success: true, message: 'Already verified' };
  }

  const planId = payment.plan;
  const doctorId = payment.doctor;

  const plan = await Plan.findById(planId);
  if (!plan) throw new ApiError(404, 'NOT_FOUND', 'Plan not found');

  const latestSub = await Subscription.findOne({ doctor: doctorId }).sort({
    endsAt: -1,
    createdAt: -1,
  });

  const now = dayjs();
  let startsAt = now;
  if (latestSub && dayjs(latestSub.endsAt).isAfter(now)) {
    startsAt = dayjs(latestSub.endsAt);
  }

  const endsAt = startsAt.add(plan.durationDays, 'day');

  const amount = plan.price;
  const gst = Math.round(amount * (plan.gstPercent / 100));
  const total = amount + gst;
  const invoiceNo = await getNextInvoiceNo();

  const subscription = new Subscription({
    doctor: doctorId,
    plan: planId,
    type: 'PAID',
    source: 'RAZORPAY',
    startsAt: startsAt.toDate(),
    endsAt: endsAt.toDate(),
    amount,
    gst,
    total,
    payment: payment._id,
    invoiceNo,
  });

  const doctor = await DoctorProfile.findById(doctorId);
  const pdfBuffer = await pdfService.generateInvoicePDF(subscription, doctor);
  const pdfUrl = await uploadService.uploadPDF(pdfBuffer, `INV_${invoiceNo}`);
  subscription.invoiceUrl = pdfUrl;

  await subscription.save();

  payment.status = 'CAPTURED';
  payment.razorpayPaymentId = razorpayPaymentId;
  payment.subscription = subscription._id;
  await payment.save();

  await computeAndUpdateSubscriptionState(doctorId);

  return subscription;
};

const verifySubscriptionPayment = async (doctorId, body) => {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = body;

  const isValid = razorpayService.verifySignature(
    razorpay_order_id,
    razorpay_payment_id,
    razorpay_signature,
  );
  if (!isValid) {
    throw new ApiError(400, 'PAYMENT_FAILED', 'Invalid signature');
  }

  return await finalizeSubscriptionPayment(razorpay_order_id, razorpay_payment_id);
};

const manualSubscriptionUpdate = async (body, adminId) => {
  const { action, doctorId, days, endDate, planId, reason } = body;

  const doctor = await DoctorProfile.findById(doctorId).populate('user');
  if (!doctor) throw new ApiError(404, 'NOT_FOUND', 'Doctor not found');

  const latestSub = await Subscription.findOne({ doctor: doctorId }).sort({
    endsAt: -1,
    createdAt: -1,
  });

  let newSubscription = null;

  if (action === 'SUSPEND') {
    doctor.subscription.status = 'SUSPENDED';
    await doctor.save();

    await AuditLog.create({
      actor: adminId,
      action: 'SUBSCRIPTION_SUSPENDED',
      entityId: doctorId,
      entityType: 'DoctorProfile',
      note: reason,
    });

    await notificationService.sendAdminManualSubscriptionUpdate(doctor.user, {
      action: 'SUSPENDED',
      reason,
    });

    return { status: 'SUSPENDED' };
  }

  if (action === 'REACTIVATE') {
    doctor.subscription.status = 'ACTIVE';
    await doctor.save();

    await AuditLog.create({
      actor: adminId,
      action: 'SUBSCRIPTION_REACTIVATED',
      entityId: doctorId,
      entityType: 'DoctorProfile',
      note: reason,
    });

    await computeAndUpdateSubscriptionState(doctorId);

    await notificationService.sendAdminManualSubscriptionUpdate(doctor.user, {
      action: 'REACTIVATED',
      reason,
    });

    return await DoctorProfile.findById(doctorId);
  }

  let startsAt = dayjs();
  if (latestSub && dayjs(latestSub.endsAt).isAfter(startsAt)) {
    startsAt = dayjs(latestSub.endsAt);
  }

  let finalEndsAt = startsAt;
  let assignedPlan = null;
  let type = 'ADMIN_GRANT';

  if (action === 'GRANT_DAYS') {
    finalEndsAt = startsAt.add(days, 'day');
  } else if (action === 'SET_END_DATE') {
    finalEndsAt = dayjs(endDate);
    if (finalEndsAt.isBefore(dayjs())) {
      throw new ApiError(400, 'VALIDATION_ERROR', 'End date cannot be in the past');
    }
  } else if (action === 'CHANGE_PLAN') {
    const plan = await Plan.findById(planId);
    if (!plan) throw new ApiError(404, 'NOT_FOUND', 'Plan not found');
    finalEndsAt = startsAt.add(plan.durationDays, 'day');
    assignedPlan = plan._id;
  }

  newSubscription = await Subscription.create({
    doctor: doctorId,
    plan: assignedPlan,
    type,
    source: 'ADMIN',
    startsAt: startsAt.toDate(),
    endsAt: finalEndsAt.toDate(),
    amount: 0,
    gst: 0,
    total: 0,
    notes: reason,
  });

  await AuditLog.create({
    actor: adminId,
    action: 'SUBSCRIPTION_MANUAL_UPDATE',
    entityId: newSubscription._id,
    entityType: 'Subscription',
    note: reason,
    after: { action, days, endDate, planId },
  });

  await computeAndUpdateSubscriptionState(doctorId);

  await notificationService.sendAdminManualSubscriptionUpdate(doctor.user, {
    action,
    reason,
    endsAt: finalEndsAt.toDate(),
  });

  return newSubscription;
};

module.exports = {
  computeAndUpdateSubscriptionState,
  getSubscriptions,
  createSubscriptionOrder,
  verifySubscriptionPayment,
  finalizeSubscriptionPayment,
  manualSubscriptionUpdate,
};

const asyncHandler = require('../utils/asyncHandler');
const doctorService = require('../services/doctor.service');
const ApiError = require('../utils/ApiError');

const getProfile = asyncHandler(async (req, res) => {
  const profile = await doctorService.getDoctorProfileByUser(req.user._id);
  res.status(200).json({ success: true, data: profile });
});

const updateProfile = asyncHandler(async (req, res) => {
  const profile = await doctorService.updateProfile(req.user._id, req.body);
  res.status(200).json({ success: true, data: profile });
});

const updateProfilePicture = asyncHandler(async (req, res) => {
  if (!req.file) {
    throw new ApiError(400, 'NO_FILE', 'Please upload a file');
  }

  const imageUrl = await doctorService.updateProfilePicture(
    req.user._id,
    req.file.buffer,
    req.file.originalname,
  );
  res.status(200).json({ success: true, data: { avatarUrl: imageUrl } });
});

const deleteProfilePicture = asyncHandler(async (req, res) => {
  await doctorService.deleteProfilePicture(req.user._id);
  res.status(200).json({ success: true, data: {} });
});

const addGalleryImage = asyncHandler(async (req, res) => {
  if (!req.file) {
    throw new ApiError(400, 'NO_FILE', 'Please upload a file');
  }

  const { caption, order } = req.body;
  const gallery = await doctorService.addGalleryImage(
    req.user._id,
    req.file.buffer,
    req.file.originalname,
    caption,
    order ? parseInt(order, 10) : undefined,
  );
  res.status(200).json({ success: true, data: gallery });
});

const updateGalleryImage = asyncHandler(async (req, res) => {
  const { imageId } = req.params;
  const { caption, order } = req.body;
  const gallery = await doctorService.updateGalleryImage(req.user._id, imageId, caption, order);
  res.status(200).json({ success: true, data: gallery });
});

const deleteGalleryImage = asyncHandler(async (req, res) => {
  const { imageId } = req.params;
  const gallery = await doctorService.deleteGalleryImage(req.user._id, imageId);
  res.status(200).json({ success: true, data: gallery });
});

const updateClinic = asyncHandler(async (req, res) => {
  const clinic = await doctorService.updateClinic(req.user._id, req.body);
  res.status(200).json({ success: true, data: clinic });
});

const updateFees = asyncHandler(async (req, res) => {
  const fees = await doctorService.updateFees(req.user._id, req.body);
  res.status(200).json({ success: true, data: fees });
});

const updateTypes = asyncHandler(async (req, res) => {
  const types = await doctorService.updateTypes(req.user._id, req.body);
  res.status(200).json({ success: true, data: types });
});

const getDashboardKPIs = asyncHandler(async (req, res) => {
  const kpis = await doctorService.getDashboardKPIs(req.user._id);
  res.status(200).json({ success: true, data: kpis });
});

const getAppointments = asyncHandler(async (req, res) => {
  const appointments = await doctorService.getDoctorAppointments(req.user._id, req.query);
  res.status(200).json({ success: true, data: appointments });
});

const getNormalQueue = asyncHandler(async (req, res) => {
  const queue = await doctorService.getNormalQueue(req.user._id);
  res.status(200).json({ success: true, data: queue });
});

const updateAppointmentStatus = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { status, reason } = req.body;
  const appointmentService = require('../services/appointment.service');

  const appointment = await appointmentService.transition(id, status, req.user, reason);
  res.status(200).json({ success: true, data: appointment });
});

const updateAppointmentNote = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { note } = req.body;

  const Appointment = require('../models/Appointment');
  const DoctorProfile = require('../models/DoctorProfile');

  const doctor = await DoctorProfile.findOne({ user: req.user._id });
  if (!doctor) throw new ApiError(404, 'NOT_FOUND', 'Doctor profile not found');

  const appointment = await Appointment.findOneAndUpdate(
    { _id: id, doctor: doctor._id },
    { doctorNotes: note },
    { new: true },
  );

  if (!appointment) throw new ApiError(404, 'NOT_FOUND', 'Appointment not found');

  res.status(200).json({ success: true, data: appointment });
});

const rescheduleAppointment = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { dateStr, startTime } = req.body;
  const appointmentService = require('../services/appointment.service');

  const appointment = await appointmentService.rescheduleAppointment(
    id,
    req.user,
    dateStr,
    startTime,
  );
  res.status(200).json({ success: true, data: appointment });
});

const getEarnings = asyncHandler(async (req, res) => {
  const earnings = await doctorService.getEarnings(req.user._id, req.query);
  res.status(200).json({ success: true, data: earnings });
});

const exportEarningsCSV = asyncHandler(async (req, res) => {
  const csv = await doctorService.exportEarningsCSV(req.user._id, req.query);
  res.header('Content-Type', 'text/csv');
  res.attachment('earnings_ledger.csv');
  res.send(csv);
});

const createSubscriptionOrder = asyncHandler(async (req, res) => {
  const subscriptionService = require('../services/subscription.service');
  const doctor = await doctorService.getDoctorProfileByUser(req.user._id);
  const data = await subscriptionService.createSubscriptionOrder(doctor._id, req.body.planId);
  res.status(200).json({ success: true, data });
});

const verifySubscriptionPayment = asyncHandler(async (req, res) => {
  const subscriptionService = require('../services/subscription.service');
  const doctor = await doctorService.getDoctorProfileByUser(req.user._id);
  const subscription = await subscriptionService.verifySubscriptionPayment(doctor._id, req.body);
  res.status(200).json({ success: true, data: subscription });
});

const getSubscriptions = asyncHandler(async (req, res) => {
  const subscriptionService = require('../services/subscription.service');
  const doctor = await doctorService.getDoctorProfileByUser(req.user._id);
  const result = await subscriptionService.getSubscriptions({
    ...req.query,
    doctorId: doctor._id,
  });
  res.status(200).json({
    success: true,
    data: result.subscriptions,
    meta: result.meta,
  });
});

module.exports = {
  getProfile,
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
  getAppointments,
  getNormalQueue,
  updateAppointmentStatus,
  updateAppointmentNote,
  rescheduleAppointment,
  getEarnings,
  exportEarningsCSV,
  createSubscriptionOrder,
  verifySubscriptionPayment,
  getSubscriptions,
};

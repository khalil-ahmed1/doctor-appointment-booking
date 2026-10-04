const asyncHandler = require('../utils/asyncHandler');
const adminService = require('../services/admin.service');
const planService = require('../services/plan.service');
const subscriptionService = require('../services/subscription.service');
const appointmentService = require('../services/appointment.service');
const paymentService = require('../services/payment.service');
const ApiError = require('../utils/ApiError');

const onboardDoctor = asyncHandler(async (req, res) => {
  const doctorProfile = await adminService.onboardDoctor(req.body, req.user._id);
  res.status(201).json({
    success: true,
    data: doctorProfile,
  });
});

const getDoctors = asyncHandler(async (req, res) => {
  const result = await adminService.getDoctors(req.query);
  res.status(200).json({
    success: true,
    data: result.doctors,
    meta: result.meta,
  });
});

const getDoctorById = asyncHandler(async (req, res) => {
  const doctor = await adminService.getDoctorById(req.params.id);
  res.status(200).json({
    success: true,
    data: doctor,
  });
});

const updateDoctor = asyncHandler(async (req, res) => {
  const doctor = await adminService.updateDoctor(req.params.id, req.body);
  res.status(200).json({
    success: true,
    data: doctor,
  });
});

const updateDoctorStatus = asyncHandler(async (req, res) => {
  const doctor = await adminService.updateDoctorStatus(req.params.id, req.body.status);
  res.status(200).json({
    success: true,
    data: doctor,
  });
});

const updateDoctorPublish = asyncHandler(async (req, res) => {
  const doctor = await adminService.updateDoctorPublish(req.params.id, req.body.isPublished);
  res.status(200).json({
    success: true,
    data: doctor,
  });
});

const getPatients = asyncHandler(async (req, res) => {
  const result = await adminService.getPatients(req.query);
  res.status(200).json({
    success: true,
    data: result.patients,
    meta: result.meta,
  });
});

const getPatientById = asyncHandler(async (req, res) => {
  const patient = await adminService.getPatientById(req.params.id);
  res.status(200).json({
    success: true,
    data: patient,
  });
});

const updatePatient = asyncHandler(async (req, res) => {
  const patient = await adminService.updatePatient(req.params.id, req.body);
  res.status(200).json({
    success: true,
    data: patient,
  });
});

const updatePatientBlockStatus = asyncHandler(async (req, res) => {
  const patient = await adminService.updatePatientBlockStatus(req.params.id, req.body.status);
  res.status(200).json({
    success: true,
    data: patient,
  });
});

const createPlan = asyncHandler(async (req, res) => {
  const plan = await planService.createPlan(req.body);
  res.status(201).json({
    success: true,
    data: plan,
  });
});

const getPlans = asyncHandler(async (req, res) => {
  const plans = await planService.getPlans(req.query);
  res.status(200).json({
    success: true,
    data: plans,
  });
});

const getPlanById = asyncHandler(async (req, res) => {
  const plan = await planService.getPlanById(req.params.id);
  res.status(200).json({
    success: true,
    data: plan,
  });
});

const updatePlan = asyncHandler(async (req, res) => {
  const plan = await planService.updatePlan(req.params.id, req.body);
  res.status(200).json({
    success: true,
    data: plan,
  });
});

const deletePlan = asyncHandler(async (req, res) => {
  const plan = await planService.deletePlan(req.params.id);
  res.status(200).json({
    success: true,
    data: plan,
  });
});

const getSubscriptions = asyncHandler(async (req, res) => {
  const result = await subscriptionService.getSubscriptions(req.query);
  res.status(200).json({
    success: true,
    data: result.subscriptions,
    meta: result.meta,
  });
});

const manualSubscriptionUpdate = asyncHandler(async (req, res) => {
  const result = await subscriptionService.manualSubscriptionUpdate(req.body, req.user._id);
  res.status(200).json({
    success: true,
    data: result,
  });
});

const getAppointments = asyncHandler(async (req, res) => {
  const result = await adminService.getAppointments(req.query);
  res.status(200).json({
    success: true,
    data: result.appointments,
    meta: result.meta,
  });
});

const getAppointmentById = asyncHandler(async (req, res) => {
  const appointment = await adminService.getAppointmentById(req.params.id);
  res.status(200).json({
    success: true,
    data: appointment,
  });
});

const cancelAppointment = asyncHandler(async (req, res) => {
  const appointment = await appointmentService.transition(
    req.params.id,
    'CANCELLED_BY_ADMIN',
    req.user,
    req.body.reason
  );
  res.status(200).json({
    success: true,
    data: appointment,
  });
});

const rescheduleAppointment = asyncHandler(async (req, res) => {
  const { dateStr, startTime } = req.body;
  const appointment = await appointmentService.rescheduleAppointment(
    req.params.id,
    req.user,
    dateStr,
    startTime
  );
  res.status(200).json({
    success: true,
    data: appointment,
  });
});

const getPayments = asyncHandler(async (req, res) => {
  const result = await adminService.getPayments(req.query);
  res.status(200).json({
    success: true,
    data: result.payments,
    meta: result.meta,
  });
});

const retryTransfer = asyncHandler(async (req, res) => {
  const payment = await paymentService.retryTransfer(req.params.id);
  res.status(200).json({
    success: true,
    data: payment,
    message: 'Transfer retry initiated',
  });
});

const manualRefund = asyncHandler(async (req, res) => {
  const payment = await paymentService.manualRefund(req.params.id, req.body.reason);
  res.status(200).json({
    success: true,
    data: payment,
    message: 'Manual refund initiated',
  });
});

const getDashboardKPIs = asyncHandler(async (req, res) => {
  const kpis = await adminService.getDashboardKPIs();
  res.status(200).json({
    success: true,
    data: kpis,
  });
});

const createSpecialization = asyncHandler(async (req, res) => {
  const specialization = await adminService.createSpecialization(req.body);
  res.status(201).json({
    success: true,
    data: specialization,
  });
});

const getSpecializations = asyncHandler(async (req, res) => {
  const specializations = await adminService.getSpecializations();
  res.status(200).json({
    success: true,
    data: specializations,
  });
});

const getSpecializationById = asyncHandler(async (req, res) => {
  const specialization = await adminService.getSpecializationById(req.params.id);
  res.status(200).json({
    success: true,
    data: specialization,
  });
});

const updateSpecialization = asyncHandler(async (req, res) => {
  const specialization = await adminService.updateSpecialization(req.params.id, req.body);
  res.status(200).json({
    success: true,
    data: specialization,
  });
});

const deleteSpecialization = asyncHandler(async (req, res) => {
  await adminService.deleteSpecialization(req.params.id);
  res.status(200).json({
    success: true,
    message: 'Specialization deleted',
  });
});

const getSettings = asyncHandler(async (req, res) => {
  const settings = await adminService.getSettings();
  res.status(200).json({
    success: true,
    data: settings,
  });
});

const updateSettings = asyncHandler(async (req, res) => {
  const settings = await adminService.updateSettings(req.body);
  res.status(200).json({
    success: true,
    data: settings,
  });
});

const getAuditLogs = asyncHandler(async (req, res) => {
  const result = await adminService.getAuditLogs(req.query);
  res.status(200).json({
    success: true,
    data: result.logs,
    meta: result.meta,
  });
});

const getEmailLogs = asyncHandler(async (req, res) => {
  const result = await adminService.getEmailLogs(req.query);
  res.status(200).json({
    success: true,
    data: result.logs,
    meta: result.meta,
  });
});

module.exports = {
  onboardDoctor,
  getDoctors,
  getDoctorById,
  updateDoctor,
  updateDoctorStatus,
  updateDoctorPublish,
  getPatients,
  getPatientById,
  updatePatient,
  updatePatientBlockStatus,
  createPlan,
  getPlans,
  getPlanById,
  updatePlan,
  deletePlan,
  getSubscriptions,
  manualSubscriptionUpdate,
  getAppointments,
  getAppointmentById,
  cancelAppointment,
  rescheduleAppointment,
  getPayments,
  retryTransfer,
  manualRefund,
  getDashboardKPIs,
  createSpecialization,
  getSpecializations,
  getSpecializationById,
  updateSpecialization,
  deleteSpecialization,
  getSettings,
  updateSettings,
  getAuditLogs,
  getEmailLogs,
};

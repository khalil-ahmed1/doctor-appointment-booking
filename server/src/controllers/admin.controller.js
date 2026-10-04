const asyncHandler = require('../utils/asyncHandler');
const adminService = require('../services/admin.service');
const planService = require('../services/plan.service');
const subscriptionService = require('../services/subscription.service');

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
};

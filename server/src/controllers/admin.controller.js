const asyncHandler = require('../utils/asyncHandler');
const adminService = require('../services/admin.service');

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

module.exports = {
  onboardDoctor,
  getDoctors,
  getDoctorById,
  updateDoctor,
  updateDoctorStatus,
  updateDoctorPublish,
};

const asyncHandler = require('../utils/asyncHandler');
const publicService = require('../services/public.service');
const ApiError = require('../utils/ApiError');

const searchDoctors = asyncHandler(async (req, res) => {
  const result = await publicService.searchDoctors(req.query);
  res.status(200).json({
    success: true,
    data: result,
  });
});

const getDoctorBySlug = asyncHandler(async (req, res) => {
  const doctor = await publicService.getDoctorBySlug(req.params.slug);
  if (!doctor) {
    throw new ApiError(404, 'DOCTOR_NOT_FOUND', 'Doctor not found or not available for booking');
  }
  res.status(200).json({
    success: true,
    data: doctor,
  });
});

module.exports = {
  searchDoctors,
  getDoctorBySlug,
};

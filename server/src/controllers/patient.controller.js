const asyncHandler = require('../utils/asyncHandler');
const Appointment = require('../models/Appointment');
const User = require('../models/User');
const DoctorProfile = require('../models/DoctorProfile');
const Payment = require('../models/Payment');

const getMyAppointments = asyncHandler(async (req, res) => {
  const appointments = await Appointment.find({ patient: req.user.id })
    .populate('doctor', 'fullName clinic slug profilePicture specializations')
    .sort({ createdAt: -1 });

  res.status(200).json({ success: true, data: appointments });
});

const getMyDoctors = asyncHandler(async (req, res) => {
  const appointments = await Appointment.find({ patient: req.user.id }).select('doctor');
  const doctorIds = [...new Set(appointments.map(a => a.doctor.toString()))];
  
  const doctors = await DoctorProfile.find({ _id: { $in: doctorIds } })
    .select('fullName slug profilePicture specializations clinic fees');

  res.status(200).json({ success: true, data: doctors });
});

const getMyPayments = asyncHandler(async (req, res) => {
  const appointments = await Appointment.find({ patient: req.user.id }).select('_id');
  const apptIds = appointments.map(a => a._id);
  const payments = await Payment.find({ appointment: { $in: apptIds } })
    .populate({
      path: 'appointment',
      select: 'bookingCode doctor type dateStr startTime',
      populate: { path: 'doctor', select: 'fullName clinic' }
    })
    .sort({ createdAt: -1 });

  res.status(200).json({ success: true, data: payments });
});

const updateProfile = asyncHandler(async (req, res) => {
  const { name, phone, dob, gender, savedAddresses, notificationPrefs } = req.body;
  
  const user = await User.findByIdAndUpdate(
    req.user.id,
    { name, phone, dob, gender, savedAddresses, notificationPrefs },
    { new: true, runValidators: true }
  ).select('-passwordHash -refreshTokens');

  res.status(200).json({ success: true, data: user });
});

module.exports = {
  getMyAppointments,
  getMyDoctors,
  getMyPayments,
  updateProfile,
};

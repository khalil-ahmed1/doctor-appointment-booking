const asyncHandler = require('../utils/asyncHandler');
const bookingService = require('../services/booking.service');

const holdSlot = asyncHandler(async (req, res) => {
  const { doctorId, type, dateStr, startTime, endTime, idempotencyKey, patientDetails, addressSnapshot } = req.body;
  const appointment = await bookingService.holdSlot(
    req.user.id,
    doctorId,
    type,
    dateStr,
    startTime,
    endTime,
    idempotencyKey,
    patientDetails,
    addressSnapshot
  );

  res.status(200).json({
    success: true,
    data: appointment,
  });
});

const downloadReceipt = asyncHandler(async (req, res) => {
  const Appointment = require('../models/Appointment');
  const Payment = require('../models/Payment');
  const { generateReceiptPDF } = require('../services/pdf.service');

  const appointment = await Appointment.findById(req.params.id).populate('doctor');
  if (!appointment) return res.status(404).json({ success: false, message: 'Appointment not found' });

  // Ensure ownership: patient or admin
  if (req.user.role === 'PATIENT' && appointment.patient.toString() !== req.user.id) {
     return res.status(403).json({ success: false, message: 'Forbidden' });
  }

  const payment = await Payment.findOne({ appointment: appointment._id });
  
  const pdfBuffer = await generateReceiptPDF(appointment, payment);
  
  res.set({
    'Content-Type': 'application/pdf',
    'Content-Disposition': `attachment; filename="Receipt-${appointment.bookingCode}.pdf"`,
    'Content-Length': pdfBuffer.length,
  });
  
  res.end(pdfBuffer);
});

module.exports = { holdSlot, downloadReceipt };

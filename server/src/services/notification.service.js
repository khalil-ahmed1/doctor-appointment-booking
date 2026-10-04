const { sendEmail } = require('./email.service');
const { generateReceiptPDF } = require('./pdf.service');
const Appointment = require('../models/Appointment');
const Payment = require('../models/Payment');
const User = require('../models/User');
const env = require('../config/env');
const logger = require('../utils/logger');

const sendBookingConfirmation = async (appointmentId) => {
  try {
    const appointment = await Appointment.findById(appointmentId).populate('doctor').populate('patient');
    if (!appointment) return;

    const payment = await Payment.findOne({ appointment: appointment._id });
    
    // 1. Generate PDF Receipt
    let pdfBuffer = null;
    try {
      pdfBuffer = await generateReceiptPDF(appointment, payment);
    } catch (pdfErr) {
      logger.error(`Failed to generate PDF for ${appointmentId}: ${pdfErr.message}`);
    }

    // 2. Prepare patient email data
    const patientName = appointment.patientDetails?.name || appointment.patient?.name || 'Patient';
    const doctorName = appointment.doctor?.fullName;
    const clinicAddress = appointment.doctor?.clinic?.name ? `${appointment.doctor.clinic.name}, ${appointment.doctor.clinic.city}` : '';
    const amount = appointment.fee?.total ? (appointment.fee.total / 100).toFixed(2) : '0.00';

    const patientEmailData = {
      patientName,
      doctorName,
      bookingCode: appointment.bookingCode,
      type: appointment.type,
      dateStr: appointment.dateStr,
      startTime: appointment.startTime,
      tokenLabel: appointment.tokenLabel,
      amount,
      clinicAddress,
    };

    const attachments = pdfBuffer ? [{
      filename: `Receipt-${appointment.bookingCode}.pdf`,
      content: pdfBuffer,
      contentType: 'application/pdf',
    }] : [];

    // Send to Patient
    if (appointment.patient?.email) {
      await sendEmail(
        appointment.patient.email,
        `Booking Confirmed: Dr. ${doctorName}`,
        'BOOKING_CONFIRMED',
        patientEmailData,
        attachments
      );
    }

    // 3. Send to Doctor
    const doctorUser = await User.findOne({ doctorProfile: appointment.doctor._id });
    if (doctorUser?.email) {
      await sendEmail(
        doctorUser.email,
        `New Booking: ${appointment.bookingCode}`,
        'NEW_BOOKING_DOCTOR',
        {
          doctorName,
          patientName,
          bookingCode: appointment.bookingCode,
          type: appointment.type,
          dateStr: appointment.dateStr,
          startTime: appointment.startTime,
          tokenLabel: appointment.tokenLabel,
          dashboardUrl: `${env.CLIENT_URL}/doctor/dashboard`,
        }
      );
    }
  } catch (error) {
    logger.error(`Error in sendBookingConfirmation: ${error.message}`);
  }
};

module.exports = {
  sendBookingConfirmation,
};

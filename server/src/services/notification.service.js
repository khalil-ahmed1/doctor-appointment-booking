const { sendEmail } = require('./email.service');
const { generateReceiptPDF } = require('./pdf.service');
const Appointment = require('../models/Appointment');
const Payment = require('../models/Payment');
const User = require('../models/User');
const Notification = require('../models/Notification');
const env = require('../config/env');
const logger = require('../utils/logger');

const sendBookingConfirmation = async (appointmentId) => {
  try {
    const appointment = await Appointment.findById(appointmentId)
      .populate('doctor')
      .populate('patient');
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
    const clinicAddress = appointment.doctor?.clinic?.name
      ? `${appointment.doctor.clinic.name}, ${appointment.doctor.clinic.city}`
      : '';
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

    const attachments = pdfBuffer
      ? [
          {
            filename: `Receipt-${appointment.bookingCode}.pdf`,
            content: pdfBuffer,
            contentType: 'application/pdf',
          },
        ]
      : [];

    // Send to Patient
    if (appointment.patient?.email) {
      await sendEmail(
        appointment.patient.email,
        `Booking Confirmed: Dr. ${doctorName}`,
        'BOOKING_CONFIRMED',
        patientEmailData,
        attachments,
      );

      await Notification.create({
        user: appointment.patient._id,
        type: 'BOOKING',
        title: 'Booking Confirmed',
        message: `Your appointment with Dr. ${doctorName} on ${appointment.dateStr || ''} is confirmed. Booking ID: ${appointment.bookingCode}`,
        link: '/patient/dashboard',
        relatedId: appointment._id,
      });
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
        },
      );

      await Notification.create({
        user: doctorUser._id,
        type: 'BOOKING',
        title: 'New Appointment Booking',
        message: `New booking from ${patientName} on ${appointment.dateStr || ''}. Booking ID: ${appointment.bookingCode}`,
        link: '/doctor/dashboard',
        relatedId: appointment._id,
      });
    }
  } catch (error) {
    logger.error(`Error in sendBookingConfirmation: ${error.message}`);
  }
};

const sendAppointmentCancellation = async (appointmentId) => {
  try {
    const appointment = await Appointment.findById(appointmentId)
      .populate('doctor')
      .populate('patient');
    if (!appointment || !appointment.patient?.email) return;

    const patientName = appointment.patientDetails?.name || appointment.patient?.name || 'Patient';
    const doctorName = appointment.doctor?.fullName;
    const amount = appointment.fee?.total ? (appointment.fee.total / 100).toFixed(2) : '0.00';
    const reason = appointment.cancellation?.reason || 'Doctor cancelled the appointment';

    const patientEmailData = {
      patientName,
      doctorName,
      bookingCode: appointment.bookingCode,
      dateStr: appointment.dateStr,
      startTime: appointment.startTime,
      tokenLabel: appointment.tokenLabel,
      amount,
      reason,
    };

    await sendEmail(
      appointment.patient.email,
      `Appointment Cancelled: Dr. ${doctorName}`,
      'BOOKING_CANCELLED',
      patientEmailData,
    );

    await Notification.create({
      user: appointment.patient._id,
      type: 'BOOKING',
      title: 'Appointment Cancelled',
      message: `Your appointment with Dr. ${doctorName} on ${appointment.dateStr || ''} was cancelled. Reason: ${reason}`,
      link: '/patient/dashboard',
      relatedId: appointment._id,
    });
  } catch (error) {
    logger.error(`Error in sendAppointmentCancellation: ${error.message}`);
  }
};

const sendAppointmentReschedule = async (appointmentId) => {
  try {
    const appointment = await Appointment.findById(appointmentId)
      .populate('doctor')
      .populate('patient');
    if (!appointment || !appointment.patient?.email) return;

    const patientName = appointment.patientDetails?.name || appointment.patient?.name || 'Patient';
    const doctorName = appointment.doctor?.fullName;

    const patientEmailData = {
      patientName,
      doctorName,
      bookingCode: appointment.bookingCode,
      oldDateStr: appointment.rescheduledFrom?.dateStr,
      oldStartTime: appointment.rescheduledFrom?.startTime,
      newDateStr: appointment.dateStr,
      newStartTime: appointment.startTime,
    };

    await sendEmail(
      appointment.patient.email,
      `Appointment Rescheduled: Dr. ${doctorName}`,
      'BOOKING_RESCHEDULED',
      patientEmailData,
    );

    await Notification.create({
      user: appointment.patient._id,
      type: 'BOOKING',
      title: 'Appointment Rescheduled',
      message: `Your appointment with Dr. ${doctorName} has been rescheduled to ${appointment.dateStr || ''} at ${appointment.startTime || ''}.`,
      link: '/patient/dashboard',
      relatedId: appointment._id,
    });
  } catch (error) {
    logger.error(`Error in sendAppointmentReschedule: ${error.message}`);
  }
};

const sendAppointmentReminder = async (appointment, customNote = '') => {
  try {
    if (!appointment || !appointment.patient?.email) return;

    const patientName = appointment.patientDetails?.name || appointment.patient?.name || 'Patient';
    const doctorName = appointment.doctor?.fullName;

    const patientEmailData = {
      patientName,
      doctorName,
      bookingCode: appointment.bookingCode,
      type: appointment.type,
      dateStr: appointment.dateStr,
      startTime: appointment.startTime,
      tokenLabel: appointment.tokenLabel,
      customNote,
    };

    await sendEmail(
      appointment.patient.email,
      `Reminder: Appointment with Dr. ${doctorName}`,
      'APPOINTMENT_REMINDER',
      patientEmailData,
    );

    await Notification.create({
      user: appointment.patient._id,
      type: 'BOOKING',
      title: 'Appointment Reminder',
      message: `Reminder for your upcoming appointment with Dr. ${doctorName} on ${appointment.dateStr || ''}.`,
      link: '/patient/dashboard',
      relatedId: appointment._id,
    });
  } catch (error) {
    logger.error(`Error in sendAppointmentReminder: ${error.message}`);
  }
};

const sendSubscriptionReminder = async (doctorProfileId, message) => {
  try {
    const doctorUser = await User.findOne({ doctorProfile: doctorProfileId }).populate(
      'doctorProfile',
    );
    if (!doctorUser || !doctorUser.email) return;

    const doctorName = doctorUser.doctorProfile?.fullName || 'Doctor';

    const emailData = {
      doctorName,
      message,
      dashboardUrl: `${env.CLIENT_URL}/doctor/dashboard`,
    };

    await sendEmail(
      doctorUser.email,
      `Subscription Notice: Dr. ${doctorName}`,
      'SUBSCRIPTION_REMINDER',
      emailData,
    );

    await Notification.create({
      user: doctorUser._id,
      type: 'SYSTEM',
      title: 'Subscription Notice',
      message: message,
      link: '/doctor/dashboard',
      relatedId: doctorProfileId,
    });
  } catch (error) {
    logger.error(`Error in sendSubscriptionReminder: ${error.message}`);
  }
};

const sendAdminManualSubscriptionUpdate = async (doctorUser, details) => {
  try {
    if (!doctorUser || !doctorUser.email) return;

    const doctorName = doctorUser.doctorProfile?.fullName || 'Doctor';
    const message = `Your subscription has been manually updated by the admin. Action: ${details.action}. Reason: ${details.reason}.`;

    const emailData = {
      doctorName,
      message,
      dashboardUrl: `${env.CLIENT_URL}/doctor/dashboard`,
    };

    // Reusing the SUBSCRIPTION_REMINDER template for simplicity
    await sendEmail(
      doctorUser.email,
      `Subscription Update: Dr. ${doctorName}`,
      'SUBSCRIPTION_REMINDER',
      emailData,
    );

    await Notification.create({
      user: doctorUser._id,
      type: 'SYSTEM',
      title: 'Admin Subscription Update',
      message: message,
      link: '/doctor/dashboard',
      relatedId: doctorUser.doctorProfile?._id || doctorUser._id,
    });
  } catch (error) {
    logger.error(`Error in sendAdminManualSubscriptionUpdate: ${error.message}`);
  }
};

module.exports = {
  sendBookingConfirmation,
  sendAppointmentCancellation,
  sendAppointmentReschedule,
  sendAppointmentReminder,
  sendSubscriptionReminder,
  sendAdminManualSubscriptionUpdate,
};

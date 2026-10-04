const env = require('../config/env');

const templates = {
  verifyEmail: (data) => {
    const { name, token } = data;
    const url = `${env.CLIENT_URL}/verify-email/${token}`;
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Verify your email address</h2>
        <p>Hi ${name},</p>
        <p>Thank you for registering. Please click the button below to verify your email address:</p>
        <a href="${url}" style="display: inline-block; padding: 10px 20px; color: #fff; background-color: #007bff; text-decoration: none; border-radius: 5px;">Verify Email</a>
        <p>If you did not create an account, no further action is required.</p>
        <p>The link is valid for 24 hours.</p>
      </div>
    `;
  },

  resetPassword: (data) => {
    const { token } = data;
    const url = `${env.CLIENT_URL}/reset-password/${token}`;
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Reset your password</h2>
        <p>You requested a password reset. Click the button below to set a new password:</p>
        <a href="${url}" style="display: inline-block; padding: 10px 20px; color: #fff; background-color: #28a745; text-decoration: none; border-radius: 5px;">Reset Password</a>
        <p>If you did not request a password reset, you can safely ignore this email.</p>
        <p>The link is valid for 30 minutes.</p>
      </div>
    `;
  },

  doctorInvite: (data) => {
    const { name, token, trialEndDate } = data;
    const url = `${env.CLIENT_URL}/reset-password/${token}`; // or specialized set-password route
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Welcome to the Platform, Dr. ${name}!</h2>
        <p>Your account has been created by the administrator.</p>
        <p>You have been granted a free trial until ${new Date(trialEndDate).toLocaleDateString()}.</p>
        <p>Please click the button below to set your password and access your dashboard:</p>
        <a href="${url}" style="display: inline-block; padding: 10px 20px; color: #fff; background-color: #17a2b8; text-decoration: none; border-radius: 5px;">Set Password</a>
        <p>This link is valid for 72 hours.</p>
      </div>
    `;
  },

  BOOKING_CONFIRMED: (data) => {
    const {
      patientName,
      doctorName,
      bookingCode,
      type,
      dateStr,
      startTime,
      tokenLabel,
      amount,
      clinicAddress,
      supportEmail,
    } = data;
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Booking Confirmed</h2>
        <p>Hi ${patientName},</p>
        <p>Your ${type} appointment with <strong>Dr. ${doctorName}</strong> is confirmed.</p>
        <p><strong>Booking ID:</strong> ${bookingCode}</p>
        <p><strong>Date:</strong> ${dateStr} ${startTime ? `at ${startTime}` : ''}</p>
        ${tokenLabel ? `<p><strong>Queue Token:</strong> ${tokenLabel}</p>` : ''}
        <p><strong>Amount Paid:</strong> INR ${amount}</p>
        ${clinicAddress ? `<p><strong>Clinic Address:</strong> ${clinicAddress}</p>` : ''}
        <p>A receipt has been attached to this email.</p>
        <p><small>Note: Appointments cannot be cancelled by patients online. Please contact the clinic for assistance or support at ${supportEmail || 'support@example.com'}.</small></p>
      </div>
    `;
  },

  NEW_BOOKING_DOCTOR: (data) => {
    const {
      doctorName,
      patientName,
      bookingCode,
      type,
      dateStr,
      startTime,
      tokenLabel,
      dashboardUrl,
    } = data;
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>New Appointment Booking</h2>
        <p>Hello Dr. ${doctorName},</p>
        <p>You have a new ${type} booking.</p>
        <p><strong>Patient:</strong> ${patientName}</p>
        <p><strong>Booking ID:</strong> ${bookingCode}</p>
        <p><strong>Date:</strong> ${dateStr} ${startTime ? `at ${startTime}` : ''}</p>
        ${tokenLabel ? `<p><strong>Token:</strong> ${tokenLabel}</p>` : ''}
        <p><a href="${dashboardUrl}" style="display: inline-block; padding: 10px 20px; color: #fff; background-color: #28a745; text-decoration: none; border-radius: 5px;">View Dashboard</a></p>
      </div>
    `;
  },

  BOOKING_CANCELLED: (data) => {
    const { patientName, doctorName, bookingCode, dateStr, startTime, tokenLabel, amount, reason } =
      data;

    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Booking Cancelled</h2>
        <p>Hi ${patientName},</p>
        <p>Your appointment with <strong>Dr. ${doctorName}</strong> on ${dateStr} ${startTime ? `at ${startTime}` : ''} ${tokenLabel ? `(Token: ${tokenLabel})` : ''} has been cancelled.</p>
        <p><strong>Booking ID:</strong> ${bookingCode}</p>
        <p><strong>Reason:</strong> ${reason}</p>
        <p>Your refund of INR ${amount} has been initiated and will reflect in your original payment method in 5-7 working days.</p>
        <p>We apologize for the inconvenience.</p>
      </div>
    `;
  },

  BOOKING_RESCHEDULED: (data) => {
    const {
      patientName,
      doctorName,
      bookingCode,
      oldDateStr,
      oldStartTime,
      newDateStr,
      newStartTime,
    } = data;

    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Booking Rescheduled</h2>
        <p>Hi ${patientName},</p>
        <p>Your appointment with <strong>Dr. ${doctorName}</strong> has been rescheduled by the clinic.</p>
        <p><strong>Booking ID:</strong> ${bookingCode}</p>
        <p><strong>Old Slot:</strong> ${oldDateStr} at ${oldStartTime}</p>
        <p><strong>New Slot:</strong> ${newDateStr} at ${newStartTime}</p>
        <p>No further action is required from your side. We apologize for the change in schedule.</p>
      </div>
    `;
  },

  APPOINTMENT_REMINDER: (data) => {
    const {
      patientName,
      doctorName,
      bookingCode,
      type,
      dateStr,
      startTime,
      tokenLabel,
      customNote,
    } = data;
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Appointment Reminder</h2>
        <p>Hi ${patientName},</p>
        <p>This is a reminder for your upcoming ${type} appointment with <strong>Dr. ${doctorName}</strong>.</p>
        <p><strong>Booking ID:</strong> ${bookingCode}</p>
        <p><strong>Date:</strong> ${dateStr} ${startTime ? `at ${startTime}` : ''}</p>
        ${tokenLabel ? `<p><strong>Token:</strong> ${tokenLabel}</p>` : ''}
        ${customNote ? `<p><em>${customNote}</em></p>` : ''}
        <p>Thank you!</p>
      </div>
    `;
  },
};

const getTemplate = (templateName, data) => {
  if (!templates[templateName]) {
    throw new Error(`Template ${templateName} not found`);
  }
  return templates[templateName](data);
};

module.exports = { getTemplate };

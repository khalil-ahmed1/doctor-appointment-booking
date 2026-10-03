const env = require('../config/env');

const templates = {
  verifyEmail: (data) => {
    const { name, token } = data;
    const url = `${env.CLIENT_URL}/verify-email?token=${token}`;
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
    const url = `${env.CLIENT_URL}/reset-password?token=${token}`;
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
    const url = `${env.CLIENT_URL}/reset-password?token=${token}`; // or specialized set-password route
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
};

const getTemplate = (templateName, data) => {
  if (!templates[templateName]) {
    throw new Error(`Template ${templateName} not found`);
  }
  return templates[templateName](data);
};

module.exports = { getTemplate };

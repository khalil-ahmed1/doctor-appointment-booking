const nodemailer = require('nodemailer');
const env = require('../config/env');
const logger = require('../utils/logger');
const EmailLog = require('../models/EmailLog');
const { getTemplate } = require('../templates/emailTemplates');

const transporter = nodemailer.createTransport({
  host: env.SMTP_HOST,
  port: env.SMTP_PORT,
  auth:
    env.SMTP_USER && env.SMTP_PASS
      ? {
          user: env.SMTP_USER,
          pass: env.SMTP_PASS,
        }
      : undefined,
});

/**
 * Send an email using templates and log it to the database
 * @param {string} to - Recipient email
 * @param {string} subject - Email subject
 * @param {string} templateName - Name of the template in emailTemplates.js
 * @param {object} data - Data to inject into the template
 */
const sendEmail = async (to, subject, templateName, data = {}, attachments = []) => {
  let emailLog;
  try {
    // 1. Create PENDING log
    emailLog = await EmailLog.create({
      to,
      subject,
      template: templateName,
      data,
      status: 'PENDING',
    });

    // 2. Generate HTML
    const html = getTemplate(templateName, data);

    // 3. Send email
    await transporter.sendMail({
      from: env.EMAIL_FROM,
      to,
      subject,
      html,
      attachments,
    });

    // 4. Update log to SENT
    emailLog.status = 'SENT';
    emailLog.sentAt = new Date();
    await emailLog.save();

    logger.info(`Email sent successfully to ${to} [Template: ${templateName}]`);
    return true;
  } catch (error) {
    logger.error(`Failed to send email to ${to}: ${error.message}`);

    // Update log to FAILED
    if (emailLog) {
      emailLog.status = 'FAILED';
      emailLog.error = error.message;
      await emailLog.save();
    }

    // We intentionally don't throw to avoid breaking the caller's transaction
    // Failed emails will be retried by the background job
    return false;
  }
};

module.exports = {
  sendEmail,
};

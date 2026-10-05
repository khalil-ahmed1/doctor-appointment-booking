const cron = require('node-cron');
const dayjs = require('dayjs');
const utc = require('dayjs/plugin/utc');
const timezone = require('dayjs/plugin/timezone');
const customParseFormat = require('dayjs/plugin/customParseFormat');
dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.extend(customParseFormat);

const Appointment = require('../models/Appointment');
const { sendAppointmentReminder } = require('../services/notification.service');
const logger = require('../utils/logger');

const startReminderJobs = () => {
  // Run every 5 minutes
  cron.schedule('*/5 * * * *', async () => {
    try {
      const now = dayjs().tz('Asia/Kolkata');

      // 1. Premium & Home Visit Reminders
      // Fetch only appointments starting within the next 25 hours to optimize DB query
      const upcomingAppointments = await Appointment.find({
        status: 'CONFIRMED',
        type: { $in: ['PREMIUM', 'HOME_VISIT'] },
        startAt: { $lte: new Date(Date.now() + 25 * 60 * 60 * 1000) },
        $or: [{ 'remindersSent.r24h': false }, { 'remindersSent.r2h': false }],
      }).populate('patient doctor');

      for (const apt of upcomingAppointments) {
        if (!apt.dateStr || !apt.startTime) continue;

        const aptTime = dayjs.tz(
          `${apt.dateStr} ${apt.startTime}`,
          'YYYY-MM-DD HH:mm',
          'Asia/Kolkata',
        );
        const diffHours = aptTime.diff(now, 'hour', true);

        if (diffHours < 0) continue; // Past appointment

        let needsSave = false;

        // 24h reminder
        if (!apt.remindersSent.r24h && diffHours <= 24 && diffHours > 2) {
          await sendAppointmentReminder(
            apt,
            'This is a friendly reminder for your appointment tomorrow.',
          );
          apt.remindersSent.r24h = true;
          needsSave = true;
        }

        // 2h reminder
        if (!apt.remindersSent.r2h && diffHours <= 2) {
          const note =
            apt.type === 'HOME_VISIT'
              ? 'This is a reminder for your appointment in 2 hours. Please keep your phone reachable and address accessible.'
              : 'This is a reminder for your appointment in 2 hours.';
          await sendAppointmentReminder(apt, note);

          apt.remindersSent.r24h = true;
          apt.remindersSent.r2h = true;
          needsSave = true;
        }

        if (needsSave) {
          await apt.save();
        }
      }

      // 2. Normal Appointments Reminders
      const normalAppointments = await Appointment.find({
        status: 'CONFIRMED',
        type: 'NORMAL',
        $or: [{ 'remindersSent.normalEvening': false }, { 'remindersSent.normalLastDay': false }],
      }).populate('patient doctor');

      for (const apt of normalAppointments) {
        let needsSave = false;

        // Evening of booking day (6 PM)
        const bookingDay = dayjs(apt.createdAt).tz('Asia/Kolkata');
        const isBookingDay = now.format('YYYY-MM-DD') === bookingDay.format('YYYY-MM-DD');
        if (!apt.remindersSent.normalEvening && isBookingDay && now.hour() >= 18) {
          await sendAppointmentReminder(
            apt,
            `Reminder: You have a pending Normal Queue token (${apt.tokenLabel || ''}).`,
          );
          apt.remindersSent.normalEvening = true;
          needsSave = true;
        }



        if (needsSave) {
          await apt.save();
        }
      }
    } catch (error) {
      logger.error(`Error in reminder sweep job: ${error.message}`);
    }
  });

  logger.info('Reminder cron jobs scheduled');
};

module.exports = { startReminderJobs };

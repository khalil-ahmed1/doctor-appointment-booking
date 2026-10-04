const cron = require('node-cron');
const dayjs = require('dayjs');
const utc = require('dayjs/plugin/utc');
const timezone = require('dayjs/plugin/timezone');
const DoctorProfile = require('../models/DoctorProfile');
const Subscription = require('../models/Subscription');
const Setting = require('../models/Setting');
const { computeAndUpdateSubscriptionState } = require('../services/subscription.service');
const { sendSubscriptionReminder } = require('../services/notification.service');
const logger = require('../utils/logger');

dayjs.extend(utc);
dayjs.extend(timezone);

const getGraceDays = async () => {
  const setting = await Setting.findOne({ key: 'graceDays' });
  return setting && setting.value !== undefined ? Number(setting.value) : 2;
};

// Hourly Job: Update subscription state (e.g. ACTIVE -> GRACE, GRACE -> EXPIRED)
const transitionSubscriptions = async () => {
  try {
    const doctors = await DoctorProfile.find({ 'subscription.status': { $ne: 'SUSPENDED' } });
    for (const doc of doctors) {
      try {
        await computeAndUpdateSubscriptionState(doc._id);
      } catch (err) {
        logger.error(`Error transitioning subscription for doctor ${doc._id}: ${err.message}`);
      }
    }
  } catch (err) {
    logger.error(`Error in transitionSubscriptions job: ${err.message}`);
  }
};

// Daily Job: Send expiry notifications at 09:00 IST
const sendSubscriptionReminders = async () => {
  try {
    const doctors = await DoctorProfile.find({ 'subscription.status': { $ne: 'SUSPENDED' } });
    const graceDays = await getGraceDays();
    const now = dayjs().tz('Asia/Kolkata').startOf('day');

    for (const doc of doctors) {
      const latestSub = await Subscription.findOne({ doctor: doc._id }).sort({
        endsAt: -1,
        createdAt: -1,
      });

      if (!latestSub) continue;

      const endsAt = dayjs(latestSub.endsAt).tz('Asia/Kolkata').startOf('day');
      const diffDays = endsAt.diff(now, 'day');

      let reminderTag = null;
      let message = '';

      if (diffDays === 2 && latestSub.type === 'TRIAL') {
        reminderTag = 'TRIAL_BEFORE_2';
        message = 'Your free trial ends soon. Please renew your plan to stay visible to patients.';
      } else if (diffDays === 1 && latestSub.type === 'TRIAL') {
        reminderTag = 'TRIAL_BEFORE_1';
        message =
          'Your free trial ends tomorrow. Please renew your plan to stay visible to patients.';
      } else if (diffDays === 7 && latestSub.type !== 'TRIAL') {
        reminderTag = 'PAID_BEFORE_7';
        message = `Your plan expires on ${endsAt.format('DD MMM YYYY')}. Renew now to maintain your listing.`;
      } else if (diffDays === 3 && latestSub.type !== 'TRIAL') {
        reminderTag = 'PAID_BEFORE_3';
        message = `Your plan expires on ${endsAt.format('DD MMM YYYY')}. Renew now to maintain your listing.`;
      } else if (diffDays === 1 && latestSub.type !== 'TRIAL') {
        reminderTag = 'PAID_BEFORE_1';
        message = `Your plan expires tomorrow. Renew now to maintain your listing.`;
      } else if (diffDays === 0) {
        reminderTag = 'EXPIRY_DAY';
        message = 'Your plan expires today. Renew to continue receiving new bookings.';
      } else if (diffDays < 0) {
        const daysPast = Math.abs(diffDays);
        if (daysPast <= graceDays) {
          reminderTag = `GRACE_DAY_${daysPast}`;
          const daysLeft = graceDays - daysPast;
          message = `Grace period: ${daysLeft} days left. After this, your profile will be hidden from patients.`;
        } else {
          const expiredDays = daysPast - graceDays;
          if (expiredDays === 1 || expiredDays === 3 || expiredDays === 7) {
            reminderTag = `EXPIRED_DAY_${expiredDays}`;
            message =
              'Your profile is currently hidden due to an expired subscription. Renew to resume receiving bookings.';
          }
        }
      }

      if (reminderTag && !latestSub.remindersSent.includes(reminderTag)) {
        try {
          await sendSubscriptionReminder(doc._id, message);
          latestSub.remindersSent.push(reminderTag);
          await latestSub.save();
        } catch (err) {
          logger.error(`Error sending subscription reminder for doctor ${doc._id}: ${err.message}`);
        }
      }
    }
  } catch (err) {
    logger.error(`Error in sendSubscriptionReminders job: ${err.message}`);
  }
};

const startSubscriptionJobs = () => {
  // Run every hour
  cron.schedule('0 * * * *', async () => {
    logger.info('Running hourly transitionSubscriptions job...');
    await transitionSubscriptions();
  });

  // Run at 09:00 IST daily
  // Timezone options can be passed to cron.schedule
  cron.schedule(
    '0 9 * * *',
    async () => {
      logger.info('Running daily sendSubscriptionReminders job...');
      await sendSubscriptionReminders();
    },
    {
      timezone: 'Asia/Kolkata',
    },
  );

  logger.info('Subscription cron jobs scheduled');
};

module.exports = {
  transitionSubscriptions,
  sendSubscriptionReminders,
  startSubscriptionJobs,
};

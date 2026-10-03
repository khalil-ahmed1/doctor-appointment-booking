const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const env = require('./config/env');
const logger = require('./utils/logger');
const User = require('./models/User');
const Plan = require('./models/Plan');
const Specialization = require('./models/Specialization');
const Setting = require('./models/Setting');

const seed = async () => {
  try {
    await mongoose.connect(env.MONGO_URI);
    logger.info('Connected to MongoDB for seeding');

    // 1. Seed Super Admin
    if (!env.ADMIN_EMAIL || !env.ADMIN_PASSWORD) {
      logger.warn(
        'ADMIN_EMAIL and ADMIN_PASSWORD not defined in env. Skipping Super Admin creation.',
      );
    } else {
      const adminExists = await User.findOne({ email: env.ADMIN_EMAIL.toLowerCase() });
      if (!adminExists) {
        const passwordHash = await bcrypt.hash(env.ADMIN_PASSWORD, 12);
        await User.create({
          name: 'Super Admin',
          email: env.ADMIN_EMAIL.toLowerCase(),
          phone: '0000000000',
          passwordHash,
          role: 'ADMIN',
          status: 'ACTIVE',
          emailVerified: true,
        });
        logger.info(`Super Admin created with email: ${env.ADMIN_EMAIL}`);
      } else {
        logger.info('Super Admin already exists.');
      }
    }

    // 2. Seed Plans
    const plans = [
      {
        name: 'Monthly',
        code: 'PLAN_MONTHLY',
        durationDays: 30,
        price: 99900,
        gstPercent: 18,
        isActive: true,
        displayOrder: 1,
        features: ['Premium listing', 'Unlimited appointments'],
      },
      {
        name: 'Quarterly',
        code: 'PLAN_QUARTERLY',
        durationDays: 90,
        price: 279900,
        gstPercent: 18,
        isActive: true,
        displayOrder: 2,
        features: ['Premium listing', 'Unlimited appointments', 'Save 6%'],
      },
      {
        name: 'Yearly',
        code: 'PLAN_YEARLY',
        durationDays: 365,
        price: 999900,
        gstPercent: 18,
        isActive: true,
        displayOrder: 3,
        features: ['Premium listing', 'Unlimited appointments', 'Save 16%'],
      },
    ];
    for (const plan of plans) {
      await Plan.updateOne({ code: plan.code }, { $set: plan }, { upsert: true });
    }
    logger.info('Plans seeded.');

    // 3. Seed Specializations
    const specializations = [
      { name: 'Cardiologist', slug: 'cardiologist', isActive: true },
      { name: 'Dermatologist', slug: 'dermatologist', isActive: true },
      { name: 'Neurologist', slug: 'neurologist', isActive: true },
      { name: 'Orthopedic', slug: 'orthopedic', isActive: true },
      { name: 'Pediatrician', slug: 'pediatrician', isActive: true },
      { name: 'General Physician', slug: 'general-physician', isActive: true },
    ];
    for (const spec of specializations) {
      await Specialization.updateOne({ slug: spec.slug }, { $set: spec }, { upsert: true });
    }
    logger.info('Specializations seeded.');

    // 4. Seed Settings
    const settings = [
      { key: 'trialDays', value: 7, description: 'Default trial period for new doctors' },
      { key: 'holdMinutes', value: 10, description: 'Time a slot is held during payment' },
      { key: 'normalValidityDays', value: 2, description: 'Days a normal token is valid for' },
      { key: 'graceDays', value: 2, description: 'Grace period after subscription expires' },
      {
        key: 'advanceBookingDaysMax',
        value: 30,
        description: 'Max days in advance a slot can be booked',
      },
      { key: 'maxActiveHoldsPerUser', value: 2, description: 'Max pending payment holds per user' },
      {
        key: 'feeBearer',
        value: 'PATIENT',
        description: 'Who pays the gateway fee (PATIENT or DOCTOR)',
      },
      { key: 'gatewayFeePercent', value: 2, description: 'Razorpay fee percentage' },
      { key: 'gstOnFeePercent', value: 18, description: 'GST on gateway fee' },
      { key: 'platformCommissionPercent', value: 0, description: 'Platform commission' },
      {
        key: 'refundFeeBearer',
        value: 'PLATFORM',
        description: 'Who bears the gateway fee on refund',
      },
    ];
    for (const setting of settings) {
      await Setting.updateOne({ key: setting.key }, { $set: setting }, { upsert: true });
    }
    logger.info('Settings seeded.');

    process.exit(0);
  } catch (error) {
    logger.error({ err: error }, 'Seeding failed');
    process.exit(1);
  }
};

seed();

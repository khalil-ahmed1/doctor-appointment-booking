const express = require('express');
const path = require('path');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const mongoSanitize = require('express-mongo-sanitize');

const cookieParser = require('cookie-parser');
const env = require('./config/env');
const errorHandler = require('./middlewares/error');
const logger = require('./utils/logger');

const app = express();

// Security HTTP headers
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  }),
);

// CORS
app.use(
  cors({
    origin: env.CLIENT_URL,
    credentials: true,
  }),
);

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 mins
  max: 1000,
  message: 'Too many requests from this IP, please try again later',
});
app.use('/api', limiter);

// Webhook routes (must be before body parsers to keep raw body)
const webhookRoutes = require('./routes/webhook.routes');
app.use('/api/v1/webhooks', webhookRoutes);

// Body parser
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));
app.use(cookieParser());

// Data sanitization against NoSQL query injection
// In Express 5, req.query is read-only, so the default middleware of express-mongo-sanitize throws an error.
// We manually sanitize the objects in-place instead.
app.use((req, res, next) => {
  if (req.body) mongoSanitize.sanitize(req.body);
  if (req.params) mongoSanitize.sanitize(req.params);
  if (req.query) mongoSanitize.sanitize(req.query);
  next();
});

// Prevent parameter pollution
// app.use(hpp()); // Disabled due to Express 5 compatibility issues with req.query

// Logging middleware
app.use((req, res, next) => {
  if (req.originalUrl !== '/api/v1/healthz') {
    logger.info(`${req.method} ${req.url}`);
  }
  next();
});

// Static files
app.use(express.static(path.join(__dirname, '..', 'public')));

// Routes
const authRoutes = require('./routes/auth.routes');
const adminRoutes = require('./routes/admin.routes');
const publicRoutes = require('./routes/public.routes');
const doctorRoutes = require('./routes/doctor.routes');
const appointmentRoutes = require('./routes/appointment.routes');
const paymentRoutes = require('./routes/payment.routes');
const patientRoutes = require('./routes/patient.routes');
const notificationRoutes = require('./routes/notification.routes');

// Health route
app.get('/api/v1/healthz', (req, res) => {
  res.status(200).json({ success: true, data: { status: 'ok', timestamp: new Date() } });
});

app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/admin', adminRoutes);
app.use('/api/v1/doctor', doctorRoutes);
app.use('/api/v1/appointments', appointmentRoutes);
app.use('/api/v1/payments', paymentRoutes);
app.use('/api/v1/patients', patientRoutes);
app.use('/api/v1/notifications', notificationRoutes);
app.use('/api/v1', publicRoutes);

// Global Error Handler
app.use(errorHandler);

module.exports = app;

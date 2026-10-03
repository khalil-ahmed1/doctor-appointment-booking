const mongoose = require('mongoose');
const app = require('./app');
const env = require('./config/env');
const logger = require('./utils/logger');

let server;

mongoose
  .connect(env.MONGO_URI)
  .then(() => {
    logger.info('Connected to MongoDB');
    server = app.listen(env.PORT, () => {
      logger.info(`Server is running on port ${env.PORT} in ${env.NODE_ENV} mode`);
    });
  })
  .catch((err) => {
    logger.error({ err }, 'Failed to connect to MongoDB');
    process.exit(1);
  });

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  logger.error({ err }, 'UNHANDLED REJECTION! Shutting down...');
  if (server) {
    server.close(() => {
      process.exit(1);
    });
  } else {
    process.exit(1);
  }
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  logger.error({ err }, 'UNCAUGHT EXCEPTION! Shutting down...');
  process.exit(1);
});

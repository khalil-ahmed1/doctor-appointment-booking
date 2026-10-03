const logger = require('../utils/logger');
const ApiError = require('../utils/ApiError');

// eslint-disable-next-line no-unused-vars
const errorHandler = (err, req, res, next) => {
  let error = err;

  if (!(error instanceof ApiError)) {
    const statusCode = error.statusCode || 500;
    const message = error.message || 'Internal Server Error';
    error = new ApiError(statusCode, 'INTERNAL_ERROR', message, []);
  }

  if (error.statusCode === 500) {
    logger.error({ err }, 'Unhandled exception');
  } else {
    logger.debug(`[Error] ${error.code}: ${error.message}`);
  }

  res.status(error.statusCode).json({
    success: false,
    error: {
      code: error.code,
      message: error.message,
      details: error.details,
    },
  });
};

module.exports = errorHandler;

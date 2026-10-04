const ApiError = require('../utils/ApiError');

const validate = (schema) => (req, res, next) => {
  try {
    const parsed = schema.parse({
      body: req.body,
      query: req.query,
      params: req.params,
    });

    // Assign validated and stripped data back to request
    req.body = parsed.body;

    // In Express 5 req.query and req.params are getters, so we overwrite the property
    if (parsed.query) {
      Object.defineProperty(req, 'query', {
        value: parsed.query,
        writable: true,
        configurable: true,
      });
    }

    if (parsed.params) {
      Object.defineProperty(req, 'params', {
        value: parsed.params,
        writable: true,
        configurable: true,
      });
    }

    next();
  } catch (err) {
    next(new ApiError(422, 'VALIDATION_ERROR', 'Invalid request data', err.errors));
  }
};

module.exports = validate;

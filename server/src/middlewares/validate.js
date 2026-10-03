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
    
    // In Express 5 req.query and req.params are getters, so we mutate the objects instead of reassigning
    if (parsed.query) {
      Object.keys(req.query).forEach(key => delete req.query[key]);
      Object.assign(req.query, parsed.query);
    }
    
    if (parsed.params) {
      Object.keys(req.params).forEach(key => delete req.params[key]);
      Object.assign(req.params, parsed.params);
    }
    
    next();
  } catch (err) {
    next(new ApiError(422, 'VALIDATION_ERROR', 'Invalid request data', err.errors));
  }
};

module.exports = validate;

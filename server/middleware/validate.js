const { validationResult } = require('express-validator');
const ApiResponse = require('../utils/ApiResponse');

/**
 * validate — General middleware to check express-validator validation chains.
 * Blocks invalid request payloads before they reach controllers or database queries.
 */
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const extractedErrors = errors.array().map((err) => ({
      field: err.path || err.param,
      message: err.msg,
      value: err.value,
    }));

    return ApiResponse.error(res, {
      statusCode: 400,
      message: errors.array()[0]?.msg || 'Validation failed',
      errors: extractedErrors,
    });
  }
  next();
};

module.exports = validate;

const logger = require('../utils/logger');
const ApiResponse = require('../utils/ApiResponse');

const errorHandler = (err, req, res, next) => {
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Internal Server Error';
  let errors = null;

  // Log error with request metadata
  logger.error(`[${req.method}] ${req.originalUrl} - ${message}`, {
    requestId: req.id,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
  });

  // Handle specific Mongoose error types
  if (err.name === 'CastError') {
    statusCode = 400;
    message = `Invalid format for resource parameter: ${err.path}`;
  } else if (err.code === 11000) {
    statusCode = 409;
    const field = Object.keys(err.keyValue)[0];
    message = `A resource with this ${field} already exists.`;
  } else if (err.name === 'ValidationError') {
    statusCode = 400;
    errors = Object.values(err.errors).map((e) => e.message);
    message = 'Validation failed for request parameters.';
  } else if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = 'Malformed or invalid authentication token.';
  }

  return ApiResponse.error(res, {
    statusCode,
    message,
    errors,
  });
};

module.exports = { errorHandler };

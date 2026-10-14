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

  // ── Sequelize error type mapping ──────────────────────────────────────────
  if (err.name === 'SequelizeUniqueConstraintError') {
    statusCode = 409;
    const field = err.errors && err.errors[0] ? err.errors[0].path : 'field';
    message = `A resource with this ${field} already exists.`;
    errors = err.errors ? err.errors.map((e) => e.message) : null;
  } else if (err.name === 'SequelizeValidationError') {
    statusCode = 400;
    message = 'Validation failed for request parameters.';
    errors = err.errors ? err.errors.map((e) => e.message) : null;
  } else if (err.name === 'SequelizeDatabaseError') {
    statusCode = 500;
    message = process.env.NODE_ENV === 'production'
      ? 'A database error occurred. Please try again.'
      : err.message;
  } else if (err.name === 'SequelizeForeignKeyConstraintError') {
    statusCode = 400;
    message = 'Referenced resource does not exist or cannot be deleted while in use.';
  } else if (err.name === 'SequelizeConnectionError' || err.name === 'SequelizeConnectionRefusedError') {
    statusCode = 503;
    message = 'Database connection unavailable. Please try again shortly.';
  // ── Legacy JWT error mapping ───────────────────────────────────────────────
  } else if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = 'Malformed or invalid authentication token.';
  } else if (err.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Access token is expired. Please log in again.';
  }

  return ApiResponse.error(res, {
    statusCode,
    message,
    errors,
  });
};

module.exports = { errorHandler };

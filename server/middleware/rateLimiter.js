const rateLimit = require('express-rate-limit');
const ApiResponse = require('../utils/ApiResponse');

const isDev = process.env.NODE_ENV !== 'production';

// Strict rate limiter for Auth endpoints (login, register)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: isDev ? 500 : 30,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    return ApiResponse.error(res, {
      statusCode: 429,
      message: 'Too many authentication attempts from this IP. Please try again after 15 minutes.',
    });
  },
});

// General rate limiter for standard public & API endpoints
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isDev ? 10000 : 2500, // Generous limit for dev & dashboard polling
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // Skip rate limiting in development on localhost or for admin dashboard routes
    if (isDev) return true;
    if (req.path.startsWith('/admin') || req.baseUrl.includes('/admin')) return true;
    // Exempt payment callback route
    if (req.path.includes('/payment/callback') || (req.baseUrl && req.baseUrl.includes('/payment/callback'))) return true;
    return false;
  },
  handler: (req, res) => {
    return ApiResponse.error(res, {
      statusCode: 429,
      message: 'Too many requests. Please slow down.',
    });
  },
});

// Limiter for Sensitive Actions (order placement, status updates)
const sensitiveLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: isDev ? 500 : 100,
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    if (isDev) return true;
    // Exempt payment callback route
    if (req.path.includes('/payment/callback') || (req.baseUrl && req.baseUrl.includes('/payment/callback'))) return true;
    return false;
  },
  handler: (req, res) => {
    return ApiResponse.error(res, {
      statusCode: 429,
      message: 'Rate limit exceeded for sensitive actions. Please wait a few minutes.',
    });
  },
});

// Generous dedicated rate limiter for Paytm payment gateway callbacks
const paymentCallbackLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: isDev ? 2000 : 500, // Generous limit so gateway callbacks/retries are not blocked
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    return ApiResponse.error(res, {
      statusCode: 429,
      message: 'Too many payment callback requests. Please retry shortly.',
    });
  },
});

// Reasonable rate limiter for polling payment status endpoint
const paymentStatusLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: isDev ? 500 : 60, // 60 requests/min accommodates 2s polling window
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    return ApiResponse.error(res, {
      statusCode: 429,
      message: 'Too many payment status checks. Please wait a moment.',
    });
  },
});

module.exports = {
  authLimiter,
  apiLimiter,
  sensitiveLimiter,
  paymentCallbackLimiter,
  paymentStatusLimiter,
};


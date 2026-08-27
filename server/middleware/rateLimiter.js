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
  skip: () => isDev,
  handler: (req, res) => {
    return ApiResponse.error(res, {
      statusCode: 429,
      message: 'Rate limit exceeded for sensitive actions. Please wait a few minutes.',
    });
  },
});

module.exports = { authLimiter, apiLimiter, sensitiveLimiter };


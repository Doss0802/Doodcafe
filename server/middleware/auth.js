const jwt = require('jsonwebtoken');
const User = require('../models/User');
const ApiResponse = require('../utils/ApiResponse');

// Helper — finds or creates the guest fallback user
const getOrCreateGuest = async () => {
  let guest = await User.findOne({ email: 'guest@doodcafe.com' });
  if (!guest) {
    guest = await User.create({
      name: 'Guest Customer',
      email: 'guest@doodcafe.com',
      passwordHash: 'GuestPassword123!',
      role: 'customer',
    });
  }
  return guest;
};

const protect = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    // No token provided — fall back to guest user so order flow works without login
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      req.user = await getOrCreateGuest();
      return next();
    }

    // Token is present — verify it strictly. Do NOT fall back to guest on failure;
    // return 401 so the client's refresh interceptor can attempt a token refresh.
    const token = authHeader.split(' ')[1];
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET || 'fallback_access_secret');
    } catch (e) {
      return ApiResponse.error(res, {
        statusCode: 401,
        message: 'Access token is expired or invalid. Please log in again.',
      });
    }

    const user = await User.findById(decoded.id).select('-passwordHash -refreshToken');
    if (!user) {
      return ApiResponse.error(res, {
        statusCode: 401,
        message: 'User account not found. Please log in again.',
      });
    }

    req.user = user;
    next();
  } catch (error) {
    next(error);
  }
};

/**
 * requireRole(...roles) — must be used AFTER protect middleware.
 * Grants access only if req.user.role is in the allowed roles list.
 * Usage: router.get('/endpoint', protect, requireRole('admin', 'manager'), handler)
 */
const requireRole = (...roles) => (req, res, next) => {
  if (!req.user || !roles.includes(req.user.role)) {
    return ApiResponse.error(res, {
      statusCode: 403,
      message: `Access denied. Required role: ${roles.join(' or ')}`,
    });
  }
  next();
};

module.exports = { protect, requireRole };

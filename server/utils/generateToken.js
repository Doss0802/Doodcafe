const jwt = require('jsonwebtoken');

// Guard: Fail fast if JWT secrets are not configured — never allow a known fallback in production
if (!process.env.JWT_ACCESS_SECRET) {
  throw new Error('FATAL: JWT_ACCESS_SECRET is not set in environment variables.');
}
if (!process.env.JWT_REFRESH_SECRET) {
  throw new Error('FATAL: JWT_REFRESH_SECRET is not set in environment variables.');
}

/**
 * Generate Access Token with short lifetime and token versioning payload
 */
const generateAccessToken = (user, tokenVersion = 0, role = 'customer') => {
  let payload;
  if (user && typeof user === 'object' && !Array.isArray(user)) {
    payload = {
      id: user.id,
      role: user.role || 'customer',
      tokenVersion: user.tokenVersion !== undefined ? user.tokenVersion : tokenVersion,
    };
  } else {
    payload = { id: user, role, tokenVersion };
  }

  return jwt.sign(
    payload,
    process.env.JWT_ACCESS_SECRET,
    { expiresIn: process.env.JWT_ACCESS_EXPIRES || '15m' }
  );
};

/**
 * Generate Refresh Token with 7-day lifetime and token versioning payload
 */
const generateRefreshToken = (user, tokenVersion = 0, role = 'customer') => {
  let payload;
  if (user && typeof user === 'object' && !Array.isArray(user)) {
    payload = {
      id: user.id,
      role: user.role || 'customer',
      tokenVersion: user.tokenVersion !== undefined ? user.tokenVersion : tokenVersion,
    };
  } else {
    payload = { id: user, role, tokenVersion };
  }

  return jwt.sign(
    payload,
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: process.env.JWT_REFRESH_EXPIRES || '7d' }
  );
};

/**
 * Set Refresh Token in secure HttpOnly cookie
 */
const setRefreshCookie = (res, token) => {
  const isProduction = process.env.NODE_ENV === 'production';
  res.cookie('refreshToken', token, {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'strict' : 'lax',
    path: '/api/v1/auth/refresh',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  });
};

/**
 * Clear Refresh Cookie on Logout
 */
const clearRefreshCookie = (res) => {
  const isProduction = process.env.NODE_ENV === 'production';
  res.clearCookie('refreshToken', {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'strict' : 'lax',
    path: '/api/v1/auth/refresh',
  });
};

module.exports = {
  generateAccessToken,
  generateRefreshToken,
  setRefreshCookie,
  clearRefreshCookie,
};

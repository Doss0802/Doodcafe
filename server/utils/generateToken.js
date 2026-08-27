const jwt = require('jsonwebtoken');

/**
 * Generate Access Token with short lifetime and token versioning payload
 */
const generateAccessToken = (userId, tokenVersion = 0, role = 'customer') => {
  return jwt.sign(
    { id: userId, tokenVersion, role },
    process.env.JWT_ACCESS_SECRET || 'fallback_access_secret',
    { expiresIn: process.env.JWT_ACCESS_EXPIRES || '15m' }
  );
};

/**
 * Generate Refresh Token with 7-day lifetime and token versioning payload
 */
const generateRefreshToken = (userId, tokenVersion = 0, role = 'customer') => {
  return jwt.sign(
    { id: userId, tokenVersion, role },
    process.env.JWT_REFRESH_SECRET || 'fallback_refresh_secret',
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

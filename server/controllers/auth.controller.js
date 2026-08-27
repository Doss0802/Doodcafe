const { validationResult } = require('express-validator');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const ApiResponse = require('../utils/ApiResponse');
const AppError = require('../utils/AppError');
const {
  generateAccessToken,
  generateRefreshToken,
  setRefreshCookie,
  clearRefreshCookie,
} = require('../utils/generateToken');

// @desc   Register a new user
// @route  POST /api/v1/auth/register
// @access Public
const register = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return ApiResponse.error(res, {
        statusCode: 400,
        message: 'Validation failed',
        errors: errors.array().map((e) => e.msg),
      });
    }

    const { name, email, password, phone } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return ApiResponse.error(res, {
        statusCode: 409,
        message: 'Email address is already registered',
      });
    }

    // Initialization workflow: If no admin user exists in DB, grant 'admin' role to the first registrant
    const adminCount = await User.countDocuments({ role: 'admin' });
    const assignedRole = adminCount === 0 ? 'admin' : 'customer';

    const user = await User.create({
      name,
      email,
      passwordHash: password,
      phone,
      role: assignedRole,
      tokenVersion: 0,
    });

    const accessToken  = generateAccessToken(user._id, user.tokenVersion, user.role);
    const refreshToken = generateRefreshToken(user._id, user.tokenVersion, user.role);

    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false });

    setRefreshCookie(res, refreshToken);

    return ApiResponse.success(res, {
      statusCode: 201,
      message: 'Registration successful',
      data: {
        accessToken,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          phone: user.phone || null,
          role: user.role,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc   Login user with lockout protection
// @route  POST /api/v1/auth/login
// @access Public
const login = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return ApiResponse.error(res, {
        statusCode: 400,
        message: 'Validation failed',
        errors: errors.array().map((e) => e.msg),
      });
    }

    const { email, password } = req.body;

    const user = await User.findOne({ email }).select('+passwordHash +refreshToken +failedLoginAttempts +lockUntil +tokenVersion');
    if (!user) {
      return ApiResponse.error(res, {
        statusCode: 401,
        message: 'Invalid email or password',
      });
    }

    // Check account lockout
    if (user.isLocked) {
      const remainingMinutes = Math.ceil((user.lockUntil - Date.now()) / 60000);
      return ApiResponse.error(res, {
        statusCode: 423, // Locked
        message: `Account is temporarily locked due to multiple failed login attempts. Try again in ${remainingMinutes} minute(s).`,
      });
    }

    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      await user.incFailedLogin();
      return ApiResponse.error(res, {
        statusCode: 401,
        message: 'Invalid email or password',
      });
    }

    // Reset failed login count on success
    if (user.failedLoginAttempts > 0) {
      await user.resetFailedLogin();
    }

    const accessToken  = generateAccessToken(user._id, user.tokenVersion || 0, user.role);
    const refreshToken = generateRefreshToken(user._id, user.tokenVersion || 0, user.role);

    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false });

    setRefreshCookie(res, refreshToken);

    return ApiResponse.success(res, {
      statusCode: 200,
      message: 'Login successful',
      data: {
        accessToken,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          phone: user.phone || null,
          role: user.role,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc   Refresh access token with token versioning
// @route  POST /api/v1/auth/refresh
// @access Public (Requires refresh cookie)
const refreshToken = async (req, res, next) => {
  try {
    const token = req.cookies.refreshToken;
    if (!token) {
      return ApiResponse.error(res, {
        statusCode: 401,
        message: 'No refresh token cookie provided',
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET || 'fallback_refresh_secret');
    const user = await User.findById(decoded.id).select('+refreshToken +tokenVersion');

    if (!user || user.refreshToken !== token || (decoded.tokenVersion !== undefined && decoded.tokenVersion !== user.tokenVersion)) {
      clearRefreshCookie(res);
      return ApiResponse.error(res, {
        statusCode: 403,
        message: 'Invalid or revoked refresh token',
      });
    }

    const newAccessToken  = generateAccessToken(user._id, user.tokenVersion, user.role);
    const newRefreshToken = generateRefreshToken(user._id, user.tokenVersion, user.role);

    user.refreshToken = newRefreshToken;
    await user.save({ validateBeforeSave: false });

    setRefreshCookie(res, newRefreshToken);

    return ApiResponse.success(res, {
      statusCode: 200,
      message: 'Token refreshed',
      data: { accessToken: newAccessToken },
    });
  } catch (error) {
    clearRefreshCookie(res);
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return ApiResponse.error(res, {
        statusCode: 403,
        message: 'Expired or invalid refresh token',
      });
    }
    next(error);
  }
};

// @desc   Logout current device
// @route  POST /api/v1/auth/logout
// @access Private
const logout = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id).select('+refreshToken');
    if (user) {
      user.refreshToken = undefined;
      await user.save({ validateBeforeSave: false });
    }
    clearRefreshCookie(res);
    return ApiResponse.success(res, {
      statusCode: 200,
      message: 'Logged out successfully',
    });
  } catch (error) {
    next(error);
  }
};

// @desc   Logout all devices (increments tokenVersion)
// @route  POST /api/v1/auth/logout-all
// @access Private
const logoutAllDevices = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id).select('+tokenVersion +refreshToken');
    if (user) {
      user.tokenVersion = (user.tokenVersion || 0) + 1;
      user.refreshToken = undefined;
      await user.save({ validateBeforeSave: false });
    }
    clearRefreshCookie(res);
    return ApiResponse.success(res, {
      statusCode: 200,
      message: 'Logged out from all devices successfully',
    });
  } catch (error) {
    next(error);
  }
};

// @desc   Get authenticated user profile
// @route  GET /api/v1/auth/me
// @access Private
const getMe = async (req, res, next) => {
  try {
    // Use lean() for a plain JS object — Mongoose documents silently drop
    // undefined fields during JSON serialization (e.g. phone if not stored).
    const user = await User.findById(req.user._id).select('name email phone').lean();
    if (!user) {
      return ApiResponse.error(res, { statusCode: 404, message: 'User not found.' });
    }
    return ApiResponse.success(res, {
      statusCode: 200,
      data: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          phone: user.phone ?? null,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};


module.exports = {
  register,
  login,
  refreshToken,
  logout,
  logoutAllDevices,
  getMe,
};

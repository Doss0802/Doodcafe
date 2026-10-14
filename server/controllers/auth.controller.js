const { validationResult } = require('express-validator');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
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

    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      return ApiResponse.error(res, {
        statusCode: 409,
        message: 'Email address is already registered',
      });
    }

    // Convert old MongoDB hash triggers to use strict bcrypt.hash(password, 10)
    const hashedPassword = await bcrypt.hash(password, 10);

    // Initialization workflow: If no admin user exists in DB, grant 'admin' role to the first registrant
    const adminCount = await User.count({ where: { role: 'admin' } });
    const assignedRole = adminCount === 0 ? 'admin' : 'customer';

    // Create user cleanly via Sequelize
    const newUser = await User.create({ name, email, password: hashedPassword, role: 'customer' });
    if (phone) {
      newUser.phone = phone;
    }
    if (assignedRole === 'admin') {
      newUser.role = 'admin';
    }

    const accessToken  = generateAccessToken(newUser);
    const refreshToken = generateRefreshToken(newUser);

    newUser.refreshToken = refreshToken;
    await newUser.save();

    setRefreshCookie(res, refreshToken);

    return ApiResponse.success(res, {
      statusCode: 201,
      message: 'Registration successful',
      data: {
        accessToken,
        user: {
          id: newUser.id,
          name: newUser.name,
          email: newUser.email,
          phone: newUser.phone || null,
          role: newUser.role,
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

    const user = await User.findOne({ 
      where: { email },
      attributes: ['id', 'name', 'email', 'password', 'role'] 
    });
    if (!user) {
      return ApiResponse.error(res, {
        statusCode: 401,
        message: 'Invalid email or password',
      });
    }

    // Check account lockout
    if (user.isLocked) {
      const remainingMinutes = Math.ceil((new Date(user.lockUntil).getTime() - Date.now()) / 60000);
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

    const accessToken  = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    user.refreshToken = refreshToken;
    await user.save();

    setRefreshCookie(res, refreshToken);

    return ApiResponse.success(res, {
      statusCode: 200,
      message: 'Login successful',
      data: {
        accessToken,
        user: {
          id: user.id,
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

    const decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET);
    const user = await User.findByPk(decoded.id);

    if (!user || user.refreshToken !== token || (decoded.tokenVersion !== undefined && decoded.tokenVersion !== user.tokenVersion)) {
      clearRefreshCookie(res);
      return ApiResponse.error(res, {
        statusCode: 403,
        message: 'Invalid or revoked refresh token',
      });
    }

    const newAccessToken  = generateAccessToken(user);
    const newRefreshToken = generateRefreshToken(user);

    user.refreshToken = newRefreshToken;
    await user.save();

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
    const userId = req.user?.id || req.user?._id;
    if (userId) {
      const user = await User.findByPk(userId);
      if (user) {
        user.refreshToken = null;
        await user.save();
      }
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
    const userId = req.user?.id || req.user?._id;
    if (userId) {
      const user = await User.findByPk(userId);
      if (user) {
        user.tokenVersion = (user.tokenVersion || 0) + 1;
        user.refreshToken = null;
        await user.save();
      }
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
    const userId = req.user?.id || req.user?._id;
    const user = await User.findByPk(userId, {
      attributes: ['id', 'name', 'email', 'phone', 'role'],
    });
    if (!user) {
      return ApiResponse.error(res, { statusCode: 404, message: 'User not found.' });
    }
    return ApiResponse.success(res, {
      statusCode: 200,
      data: {
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          phone: user.phone ?? null,
          role: user.role || 'customer',
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

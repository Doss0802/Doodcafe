const express = require('express');
const User = require('../models/User');
const ApiResponse = require('../utils/ApiResponse');
const { protect } = require('../middleware/auth');

const router = express.Router();

// All /users routes require authentication
router.use(protect);

// @desc   Get authenticated user's profile (name, email, phone)
// @route  GET /api/v1/users/profile
// @access Private
router.get('/profile', async (req, res, next) => {
  try {
    const userId = req.user.id || req.user._id;
    const user = await User.findByPk(userId, {
      attributes: ['id', 'name', 'email', 'phone', 'role'],
    });
    if (!user) {
      return ApiResponse.error(res, { statusCode: 404, message: 'User not found.' });
    }
    return ApiResponse.success(res, {
      statusCode: 200,
      data: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone || null,
        role: user.role || 'customer',
      },
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;

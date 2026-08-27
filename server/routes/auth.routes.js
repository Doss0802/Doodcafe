const express = require('express');
const { body } = require('express-validator');
const { register, login, refreshToken, logout, logoutAllDevices, getMe } = require('../controllers/auth.controller');
const { protect } = require('../middleware/auth');
const { authLimiter } = require('../middleware/rateLimiter');

const router = express.Router();

const registerValidation = [
  body('name').trim().notEmpty().withMessage('Name is required').isLength({ max: 60 }),
  body('email').isEmail().withMessage('Valid email address is required').normalizeEmail(),
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain at least one uppercase letter, one lowercase letter, and one number'),
  body('phone').optional().isMobilePhone('en-IN').withMessage('Valid Indian mobile number is required'),
];

const loginValidation = [
  body('email').isEmail().withMessage('Valid email address is required').normalizeEmail(),
  body('password').notEmpty().withMessage('Password is required'),
];

router.post('/register', authLimiter, registerValidation, register);
router.post('/login', authLimiter, loginValidation, login);
router.post('/refresh', refreshToken);
router.post('/logout', protect, logout);
router.post('/logout-all', protect, logoutAllDevices);
router.get('/me', protect, getMe);

module.exports = router;

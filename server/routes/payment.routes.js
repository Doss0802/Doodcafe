const express = require('express');
const { protect } = require('../middleware/auth');
const { sensitiveLimiter } = require('../middleware/rateLimiter');
const {
  initiatePayment,
  handlePaymentCallback,
  getPaymentStatus,
} = require('../controllers/payment.controller');

const router = express.Router();

// @route  POST /api/payment/initiate
// @access Private (authenticated user)
router.post('/initiate', sensitiveLimiter, protect, initiatePayment);

// @route  POST /api/payment/callback
// @access Public (no JWT - called by Paytm servers or user redirect)
router.post('/callback', handlePaymentCallback);

// @route  GET /api/payment/status/:orderId
// @access Public / Authenticated (polling from checkout frontend)
router.get('/status/:orderId', getPaymentStatus);

module.exports = router;

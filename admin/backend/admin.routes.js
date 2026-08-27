const express = require('express');
const { param, body, query } = require('express-validator');
const {
  getOverviewKPIs,
  getDashboardTrends,
  getTopSellingItems,
  getLiveOrders,
  updateOrderStatus,
} = require('./admin.controller');
const { protect } = require('../../server/middleware/auth');
const { sensitiveLimiter } = require('../../server/middleware/rateLimiter');

const router = express.Router();

// Allow admin/authenticated requests
router.use(protect);

/**
 * @route   GET /api/admin/kpis
 * @desc    Get overview aggregated metrics (Daily, Weekly, Monthly, All-time)
 */
router.get('/kpis', getOverviewKPIs);

/**
 * @route   GET /api/admin/trends?period=daily|weekly|monthly
 * @desc    Get revenue and gross profit trends with COGS
 */
router.get(
  '/trends',
  [query('period').optional().isIn(['daily', 'weekly', 'monthly']).withMessage('Period must be daily, weekly, or monthly')],
  getDashboardTrends
);

/**
 * @route   GET /api/admin/top-items?limit=8
 * @desc    Get top-selling dishes aggregated from customer orders collection
 */
router.get('/top-items', getTopSellingItems);

/**
 * @route   GET /api/admin/live-orders?status=all|pending|preparing|ready
 * @desc    Get customer orders stream with customer details
 */
router.get('/live-orders', getLiveOrders);

/**
 * @route   PATCH /api/admin/orders/:id/status
 * @desc    Update order status
 */
router.patch(
  '/orders/:id/status',
  sensitiveLimiter,
  [
    param('id').isMongoId().withMessage('Invalid order ID'),
    body('status')
      .isIn(['pending', 'confirmed', 'preparing', 'ready', 'delivered', 'cancelled'])
      .withMessage('Invalid order status'),
  ],
  updateOrderStatus
);

module.exports = router;

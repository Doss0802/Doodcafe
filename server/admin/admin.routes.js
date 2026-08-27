const express = require('express');
const { param, body, query } = require('express-validator');
const {
  getOverviewKPIs,
  getDashboardTrends,
  getTopSellingItems,
  getLiveOrders,
  updateOrderStatus,
} = require('./admin.controller');
const { protect } = require('../middleware/auth');
const { sensitiveLimiter } = require('../middleware/rateLimiter');

const router = express.Router();

// Middleware: allow authenticated user or fallback for admin panel viewing
const adminAuth = async (req, res, next) => {
  try {
    await protect(req, res, () => next());
  } catch (err) {
    next();
  }
};

router.use(adminAuth);

/**
 * 1. Overview KPIs (Daily, Weekly, Monthly, All-time)
 * @route GET /api/admin/kpis
 */
router.get('/kpis', getOverviewKPIs);

/**
 * 2. Revenue & Profit Trends
 * @route GET /api/admin/trends
 */
router.get(
  '/trends',
  [query('period').optional().isIn(['daily', 'weekly', 'monthly']).withMessage('Period must be daily, weekly, or monthly')],
  getDashboardTrends
);

/**
 * 3. Top Selling Menu Items
 * @route GET /api/admin/top-items
 */
router.get('/top-items', getTopSellingItems);

/**
 * 4. Live Customer Orders Stream
 * @route GET /api/admin/live-orders
 */
router.get('/live-orders', getLiveOrders);

/**
 * 5. Update Order Status
 * @route PATCH /api/admin/orders/:id/status
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


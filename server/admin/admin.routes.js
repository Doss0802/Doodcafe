const express = require('express');
const { param, body, query } = require('express-validator');
const {
  getOverviewKPIs,
  getDashboardTrends,
  getTopSellingItems,
  getLiveOrders,
  updateOrderStatus,
  getMenuSettings,
  updateMenuSettings,
  getMenuManagerItems,
  updateMenuItemAdmin,
} = require('./admin.controller');
const { protect, requireRole } = require('../middleware/auth');
const { sensitiveLimiter } = require('../middleware/rateLimiter');
const validate = require('../middleware/validate');

const router = express.Router();

// Middleware: protect all routes
router.use(protect);

/**
 * 1. Live Customer Orders Stream (Admin + Manager + Staff)
 * @route GET /api/admin/live-orders
 */
router.get(
  '/live-orders',
  requireRole('admin', 'manager', 'staff'),
  [
    query('status')
      .optional()
      .isIn(['all', 'pending', 'confirmed', 'preparing', 'ready', 'delivered', 'cancelled', 'handed_over'])
      .withMessage('Invalid order status'),
  ],
  validate,
  getLiveOrders
);

/**
 * 2. Update Order Status (Admin + Manager + Staff)
 * @route PATCH /api/admin/orders/:id/status
 */
router.patch(
  '/orders/:id/status',
  requireRole('admin', 'manager', 'staff'),
  sensitiveLimiter,
  [
    param('id').notEmpty().withMessage('Invalid order ID'),
    body('status')
      .isIn(['pending', 'confirmed', 'preparing', 'ready', 'delivered', 'cancelled', 'handed_over'])
      .withMessage('Invalid order status'),
  ],
  validate,
  updateOrderStatus
);

// All subsequent routes require Admin role ONLY (staff receives 403)
router.use(requireRole('admin', 'manager'));

/**
 * 3. Overview KPIs (Daily, Weekly, Monthly, All-time)
 * @route GET /api/admin/kpis
 */
router.get('/kpis', getOverviewKPIs);

/**
 * 4. Revenue & Profit Trends
 * @route GET /api/admin/trends
 */
router.get(
  '/trends',
  [query('period').optional().isIn(['daily', 'weekly', 'monthly']).withMessage('Period must be daily, weekly, or monthly')],
  validate,
  getDashboardTrends
);

/**
 * 5. Top Selling Menu Items
 * @route GET /api/admin/top-items
 */
router.get(
  '/top-items',
  [query('limit').optional().isInt({ min: 1, max: 50 }).withMessage('Limit must be between 1 and 50')],
  validate,
  getTopSellingItems
);

/**
 * 6. Get Global Menu Settings (Price Visibility)
 * @route GET /api/v1/admin/menu-settings
 */
router.get('/menu-settings', getMenuSettings);

/**
 * 7. Update Global Menu Settings (Price Visibility Toggle)
 * @route PATCH /api/v1/admin/menu-settings
 */
router.patch(
  '/menu-settings',
  [body('show_prices_to_public').isBoolean().withMessage('show_prices_to_public must be a boolean')],
  validate,
  updateMenuSettings
);

/**
 * 8. List All Menu Items (Admin Manager View)
 * @route GET /api/v1/admin/menu-items
 */
router.get(
  '/menu-items',
  [
    query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
    query('category').optional().trim().isLength({ max: 60 }),
  ],
  validate,
  getMenuManagerItems
);

/**
 * 9. Inline Update a Menu Item (Price + Image + Toggles)
 * @route PATCH /api/v1/admin/menu-items/:id
 */
router.patch(
  '/menu-items/:id',
  sensitiveLimiter,
  [
    param('id').notEmpty().withMessage('Invalid menu item ID'),
    body('price').optional().isFloat({ min: 0 }).withMessage('Price must be a non-negative number'),
    body('imageUrl').optional().isString().trim(),
    body('image').optional().isString(),
    body('name').optional().trim().isLength({ min: 1, max: 80 }),
    body('description').optional().trim().isLength({ max: 300 }),
    body('available').optional().isBoolean(),
    body('isBestseller').optional().isBoolean(),
    body('isVeg').optional().isBoolean(),
    body('preparationTime').optional().isInt({ min: 1, max: 120 }),
    body('show_prices_to_public').optional().isBoolean(),
  ],
  validate,
  updateMenuItemAdmin
);

module.exports = router;

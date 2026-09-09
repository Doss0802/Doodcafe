const express = require('express');
const { body, param, query } = require('express-validator');
const {
  getDashboardAnalytics,
  getFinanceDetails,
  createFinance,
  getInventory,
  upsertInventory,
  updateStock,
} = require('../controllers/dashboard.controller');
const { protect } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { sensitiveLimiter } = require('../middleware/rateLimiter');

const adminOnly = (req, res, next) => {
  if (!req.user || !['admin', 'manager'].includes(req.user.role)) {
    return res.status(403).json({ success: false, message: 'Access restricted to admins and managers.' });
  }
  next();
};

const router = express.Router();

// All dashboard routes require authentication + admin/manager role
router.use(protect, adminOnly);

// ─── Analytics (Prefix-Sum + Multi-Key DSA) ─────────────────────────────────
router.get('/analytics', getDashboardAnalytics);

// ─── Finance Transactions ───────────────────────────────────────────────────
router.get(
  '/finances',
  [
    query('type').optional().isIn(['income', 'expense']).withMessage('Type must be income or expense'),
    query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  ],
  validate,
  getFinanceDetails
);

router.post(
  '/finances',
  sensitiveLimiter,
  [
    body('type').isIn(['income', 'expense']).withMessage('Type must be income or expense'),
    body('category').trim().notEmpty().isLength({ max: 50 }).withMessage('Category is required and must not exceed 50 characters'),
    body('amount').isFloat({ min: 0.01 }).withMessage('Amount must be a positive number'),
    body('description').optional().trim().isLength({ max: 300 }).withMessage('Description cannot exceed 300 characters'),
    body('reference').optional().trim().isLength({ max: 100 }).withMessage('Reference cannot exceed 100 characters'),
  ],
  validate,
  createFinance
);

// ─── Inventory Management ───────────────────────────────────────────────────
router.get(
  '/inventory',
  [
    query('category').optional().trim().isLength({ max: 50 }).withMessage('Category parameter too long'),
    query('lowStock').optional().isBoolean().withMessage('lowStock must be a boolean'),
  ],
  validate,
  getInventory
);

router.post(
  '/inventory',
  sensitiveLimiter,
  [
    body('name').trim().notEmpty().isLength({ max: 80 }).withMessage('Item name is required and cannot exceed 80 characters'),
    body('sku').trim().notEmpty().isLength({ max: 30 }).matches(/^[A-Z0-9-]+$/).withMessage('SKU must contain only uppercase letters, numbers, and hyphens'),
    body('category').trim().notEmpty().isLength({ max: 50 }).withMessage('Category is required and cannot exceed 50 characters'),
    body('quantity').isFloat({ min: 0 }).withMessage('Quantity must be non-negative'),
    body('unit').trim().notEmpty().isLength({ max: 20 }).withMessage('Unit is required and cannot exceed 20 characters'),
    body('costPerUnit').isFloat({ min: 0 }).withMessage('Cost per unit must be non-negative'),
    body('reorderLevel').optional().isFloat({ min: 0 }).withMessage('Reorder level must be non-negative'),
    body('notes').optional().trim().isLength({ max: 500 }).withMessage('Notes cannot exceed 500 characters'),
  ],
  validate,
  upsertInventory
);

router.patch(
  '/inventory/:id/stock',
  sensitiveLimiter,
  [
    param('id').isMongoId().withMessage('Invalid inventory item ID'),
    body('adjustment').isNumeric().withMessage('Adjustment must be a number'),
  ],
  validate,
  updateStock
);

module.exports = router;

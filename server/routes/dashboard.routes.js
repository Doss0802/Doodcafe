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
const adminOnly = (req, res, next) => {
  if (!req.user || !['admin', 'manager'].includes(req.user.role)) {
    return res.status(403).json({ success: false, message: 'Access restricted to admins and managers.' });
  }
  next();
};
const { sensitiveLimiter } = require('../middleware/rateLimiter');

const router = express.Router();

// All dashboard routes require authentication + admin/manager role
router.use(protect, adminOnly);

// ─── Analytics (Prefix-Sum + Multi-Key DSA) ─────────────────────────────────
router.get('/analytics', getDashboardAnalytics);

// ─── Finance Transactions ───────────────────────────────────────────────────
router.get('/finances', getFinanceDetails);

router.post(
  '/finances',
  sensitiveLimiter,
  [
    body('type').isIn(['income', 'expense']).withMessage('Type must be income or expense'),
    body('category').notEmpty().withMessage('Category is required'),
    body('amount').isFloat({ min: 0.01 }).withMessage('Amount must be a positive number'),
  ],
  createFinance
);

// ─── Inventory Management ───────────────────────────────────────────────────
router.get('/inventory', getInventory);

router.post(
  '/inventory',
  sensitiveLimiter,
  [
    body('name').trim().notEmpty().withMessage('Item name is required'),
    body('sku').trim().notEmpty().withMessage('SKU is required'),
    body('category').notEmpty().withMessage('Category is required'),
    body('quantity').isFloat({ min: 0 }).withMessage('Quantity must be non-negative'),
    body('unit').notEmpty().withMessage('Unit is required'),
    body('costPerUnit').isFloat({ min: 0 }).withMessage('Cost per unit must be non-negative'),
  ],
  upsertInventory
);

router.patch(
  '/inventory/:id/stock',
  sensitiveLimiter,
  [
    param('id').isMongoId().withMessage('Invalid inventory item ID'),
    body('adjustment').isNumeric().withMessage('Adjustment must be a number'),
  ],
  updateStock
);

module.exports = router;

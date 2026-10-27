const express = require('express');
const { param, query } = require('express-validator');
const {
  getStaffOrders,
  lookupTakeawayOrder,
  markOrderHandedOver,
} = require('../controllers/staff.controller');
const { protect, requireRole } = require('../middleware/auth');
const validate = require('../middleware/validate');

const router = express.Router();

// Middleware: Protected and accessible to admin, manager, and staff
router.use(protect, requireRole('admin', 'manager', 'staff'));

/**
 * @route  GET /api/v1/staff/orders
 * @desc   Fetch today's orders (takeaway or dine-in)
 */
router.get(
  '/orders',
  [
    query('type').optional().isIn(['takeaway', 'dine-in']).withMessage('Type must be takeaway or dine-in'),
    query('status').optional().isString().withMessage('Status must be a string'),
    query('paymentStatus').optional().isIn(['all', 'paid', 'pending', 'cod']).withMessage('Invalid paymentStatus'),
  ],
  validate,
  getStaffOrders
);

/**
 * @route  GET /api/v1/staff/orders/lookup/:billNumber
 * @desc   Lookup takeaway order by bill number
 */
router.get(
  '/orders/lookup/:billNumber',
  [param('billNumber').trim().notEmpty().withMessage('Bill number cannot be empty')],
  validate,
  lookupTakeawayOrder
);

/**
 * @route  PATCH /api/v1/staff/orders/:id/handover
 * @desc   Mark takeaway order as handed over
 */
router.get(
  '/orders/:id/handover',
  // Defensive: return 405 Method Not Allowed if accessed via GET
  (req, res) => res.status(405).json({ success: false, message: 'Use PATCH to mark an order as handed over' })
);

router.patch(
  '/orders/:id/handover',
  [param('id').isUUID().withMessage('Invalid order ID format')],
  validate,
  markOrderHandedOver
);

module.exports = router;

const express = require('express');
const { body, param, query } = require('express-validator');
const {
  getStaffOrders,
  lookupTakeawayOrder,
  markOrderHandedOver,
  markOrderPaid,
  updateStaffOrderStatus,
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
    query('paymentStatus').optional().isIn(['all', 'paid', 'pending', 'cod', 'failed']).withMessage('Invalid paymentStatus'),
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

/**
 * @route  PATCH /api/v1/staff/orders/:id/pay
 * @desc   Mark order as paid (admin, manager, staff)
 */
router.patch(
  '/orders/:id/pay',
  [param('id').isUUID().withMessage('Invalid order ID format')],
  validate,
  markOrderPaid
);

/**
 * @route  PATCH /api/v1/staff/orders/:id/status
 * @desc   Update order kitchen status (Start Preparing, Mark Ready, etc.)
 */
router.patch(
  '/orders/:id/status',
  [
    param('id').isUUID().withMessage('Invalid order ID format'),
    body('status')
      .isIn(['pending', 'confirmed', 'preparing', 'ready', 'delivered', 'cancelled', 'handed_over'])
      .withMessage('Invalid status lifecycle value'),
  ],
  validate,
  updateStaffOrderStatus
);

module.exports = router;

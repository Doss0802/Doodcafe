const express = require('express');
const { body, param } = require('express-validator');
const { placeOrder, getMyOrders, getOrderById, cancelOrder } = require('../controllers/order.controller');
const { protect } = require('../middleware/auth');
const { sensitiveLimiter } = require('../middleware/rateLimiter');

const router = express.Router();

const orderValidation = [
  body('items').isArray({ min: 1 }).withMessage('Items must be a non-empty array'),
  body('items.*.menuItemId')
    .optional({ nullable: true, checkFalsy: true })
    .custom((val) => {
      if (!val) return true; // absent or falsy — controller resolves by name
      const mongoose = require('mongoose');
      if (!mongoose.Types.ObjectId.isValid(val)) {
        throw new Error('menuItemId must be a valid MongoDB ID if provided');
      }
      return true;
    }),
  body('items.*.quantity').optional().isInt({ min: 1 }).withMessage('Quantity must be at least 1'),
  body('orderType').optional().isIn(['takeaway', 'delivery']).withMessage('Invalid order type. Only takeaway and delivery are supported.'),
  body('paymentMode').optional().isIn(['cash', 'upi']).withMessage('Invalid payment mode. Only cash and upi are supported.'),
  body('customer_location').optional().isString(),
  body('deliveryAddress').optional().isString(),
  body('coordinates').optional().isObject(),
];

const idValidation = [
  param('id').isMongoId().withMessage('Invalid order ID format'),
];

router.use(protect);

router.post('/', sensitiveLimiter, orderValidation, placeOrder);
router.get('/my', getMyOrders);
router.get('/my-orders', getMyOrders); // alias — matches user-facing API path
router.get('/:id', idValidation, getOrderById);
router.patch('/:id/cancel', sensitiveLimiter, idValidation, cancelOrder);

module.exports = router;

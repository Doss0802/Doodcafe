const express = require('express');
const { body, param, query } = require('express-validator');
const { placeOrder, getMyOrders, getOrderById, cancelOrder } = require('../controllers/order.controller');
const { protect } = require('../middleware/auth');
const { sensitiveLimiter } = require('../middleware/rateLimiter');
const validate = require('../middleware/validate');

const router = express.Router();

const orderValidation = [
  body('items').isArray({ min: 1 }).withMessage('Items must be a non-empty array'),
  body('items.*.menuItemId')
    .optional({ nullable: true, checkFalsy: true })
    .custom((val) => {
      if (!val) return true;
      if (typeof val !== 'string' || val.trim().length === 0) {
        throw new Error('menuItemId must be a valid ID if provided');
      }
      return true;
    }),
  body('items.*.name')
    .optional()
    .trim()
    .isLength({ max: 80 })
    .withMessage('Item name cannot exceed 80 characters'),
  body('items.*.quantity')
    .optional()
    .isInt({ min: 1, max: 99 })
    .withMessage('Quantity must be between 1 and 99'),
  body('items.*.price')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Price cannot be negative'),
  body('orderType')
    .optional()
    .isIn(['takeaway', 'delivery'])
    .withMessage('Invalid order type. Only takeaway and delivery are supported.'),
  body('paymentMode')
    .optional()
    .isIn(['cash', 'upi'])
    .withMessage('Invalid payment mode. Only cash and upi are supported.'),
  body('customer_location')
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage('Customer location cannot exceed 200 characters'),
  body('deliveryAddress')
    .optional()
    .trim()
    .isLength({ max: 250 })
    .withMessage('Delivery address cannot exceed 250 characters'),
  body('specialInstructions')
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage('Special instructions cannot exceed 200 characters'),
  body('coordinates')
    .optional()
    .isObject()
    .withMessage('Coordinates must be an object'),
  body('coordinates.lat')
    .optional()
    .isFloat({ min: -90, max: 90 })
    .withMessage('Latitude must be between -90 and 90'),
  body('coordinates.lng')
    .optional()
    .isFloat({ min: -180, max: 180 })
    .withMessage('Longitude must be between -180 and 180'),
];

const idValidation = [
  param('id').isMongoId().withMessage('Invalid order ID format'),
];

const paginationValidation = [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
];

router.use(protect);

router.post('/', sensitiveLimiter, orderValidation, validate, placeOrder);
router.get('/my', paginationValidation, validate, getMyOrders);
router.get('/my-orders', paginationValidation, validate, getMyOrders);
router.get('/:id', idValidation, validate, getOrderById);
router.patch('/:id/cancel', sensitiveLimiter, idValidation, validate, cancelOrder);

module.exports = router;

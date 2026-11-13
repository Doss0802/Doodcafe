const express = require('express');
const { body, param, query } = require('express-validator');
const {
  getPublicOffers,
  getAllOffersAdmin,
  createOffer,
  updateOffer,
  removeOffer,
} = require('../controllers/offer.controller');
const { protect, requireRole } = require('../middleware/auth');
const validate = require('../middleware/validate');

const router = express.Router();

// ── Shared validation for create / update ──────────────────────
const offerBodyValidation = [
  body('title')
    .trim()
    .notEmpty()
    .withMessage('Title is required')
    .isLength({ max: 80 })
    .withMessage('Title must be at most 80 characters'),
  body('description')
    .optional({ nullable: true, checkFalsy: true })
    .trim()
    .isLength({ max: 300 })
    .withMessage('Description must be at most 300 characters'),
  body('offerType')
    .notEmpty()
    .withMessage('Offer type is required')
    .isIn(['dine-in', 'delivery'])
    .withMessage('offerType must be dine-in or delivery'),
  body('endAt')
    .optional({ nullable: true, checkFalsy: true })
    .isISO8601()
    .withMessage('endAt must be a valid date')
    .custom((value, { req }) => {
      if (value && req.body.startAt) {
        if (new Date(value) <= new Date(req.body.startAt)) {
          throw new Error('endAt must be after startAt');
        }
      }
      return true;
    }),
  body('startAt')
    .optional({ nullable: true, checkFalsy: true })
    .isISO8601()
    .withMessage('startAt must be a valid date'),
];

/**
 * PUBLIC: GET /api/offers?type=dine-in|delivery
 */
router.get(
  '/',
  [
    query('type')
      .optional()
      .isIn(['dine-in', 'delivery'])
      .withMessage('type must be dine-in or delivery'),
  ],
  validate,
  getPublicOffers
);

/**
 * ADMIN: GET /api/offers/admin — all offers with status
 */
router.get('/admin', protect, requireRole('admin', 'manager'), getAllOffersAdmin);

/**
 * ADMIN: POST /api/offers — create offer
 */
router.post(
  '/',
  protect,
  requireRole('admin', 'manager'),
  offerBodyValidation,
  validate,
  createOffer
);

/**
 * ADMIN: PUT /api/offers/:id — update offer
 */
router.put(
  '/:id',
  protect,
  requireRole('admin', 'manager'),
  [
    param('id').notEmpty().withMessage('Offer ID required'),
    ...offerBodyValidation,
  ],
  validate,
  updateOffer
);

/**
 * ADMIN: DELETE /api/offers/:id — remove offer
 */
router.delete(
  '/:id',
  protect,
  requireRole('admin', 'manager'),
  [param('id').notEmpty().withMessage('Offer ID required')],
  validate,
  removeOffer
);

module.exports = router;

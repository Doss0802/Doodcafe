const express = require('express');
const { body, param } = require('express-validator');
const {
  createEventBooking,
  getBookedSlots,
  getAdminEventBookings,
  cancelEventBooking,
} = require('../controllers/eventBooking.controller');
const { protect, requireRole } = require('../middleware/auth');
const validate = require('../middleware/validate');

const router = express.Router();

/**
 * PUBLIC: GET /api/event-bookings/booked
 * Returns upcoming booked slots with no personal data
 */
router.get('/booked', getBookedSlots);

/**
 * PUBLIC: POST /api/event-bookings
 * Create a new event booking
 */
router.post(
  '/',
  [
    body('name').trim().notEmpty().withMessage('Customer name is required').isLength({ max: 100 }),
    body('phone')
      .trim()
      .notEmpty()
      .withMessage('Phone number is required')
      .matches(/^[6-9]\d{9}$/)
      .withMessage('Invalid 10-digit Indian mobile number'),
    body('eventDate').notEmpty().withMessage('Event date is required').isDate().withMessage('Invalid date format'),
    body('startTime')
      .notEmpty()
      .withMessage('Start time is required')
      .matches(/^\d{2}:\d{2}$/)
      .withMessage('Invalid time format (HH:MM)'),
    body('endTime')
      .notEmpty()
      .withMessage('End time is required')
      .matches(/^\d{2}:\d{2}$/)
      .withMessage('Invalid time format (HH:MM)'),
    body('eventName').trim().notEmpty().withMessage('Event name is required').isLength({ max: 150 }),
    body('notes').optional().trim().isLength({ max: 500 }),
  ],
  validate,
  createEventBooking
);

/**
 * ADMIN: GET /api/admin/event-bookings
 * Full list with personal data (admin only)
 */
router.get('/admin', protect, requireRole('admin', 'manager'), getAdminEventBookings);

/**
 * ADMIN: PATCH /api/admin/event-bookings/:id/cancel
 * Cancel a booking
 */
router.patch(
  '/admin/:id/cancel',
  protect,
  requireRole('admin', 'manager'),
  [param('id').notEmpty().withMessage('Booking ID required')],
  validate,
  cancelEventBooking
);

module.exports = router;


const { Op } = require('sequelize');
const EventBooking = require('../models/EventBooking');
const ApiResponse = require('../utils/ApiResponse');

/**
 * PUBLIC: GET /api/event-bookings/booked
 * Returns active booked slots with NO personal data
 */
const getBookedSlots = async (req, res, next) => {
  try {
    const slots = await EventBooking.findAll({
      where: {
        status: 'booked',
      },
      attributes: ['id', 'eventDate', 'startTime', 'endTime', 'eventName', 'status'],
      order: [
        ['eventDate', 'ASC'],
        ['startTime', 'ASC'],
      ],
    });

    return ApiResponse.success(res, {
      statusCode: 200,
      message: 'Booked slots fetched successfully',
      data: slots,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PUBLIC: POST /api/event-bookings
 * Create a new event booking with overlap conflict detection
 */
const createEventBooking = async (req, res, next) => {
  try {
    const { name, phone, eventDate, startTime, endTime, eventName, notes } = req.body;

    if (startTime >= endTime) {
      return ApiResponse.error(res, {
        statusCode: 400,
        message: 'Start time must be before end time',
      });
    }

    // Check for overlapping bookings on the same date with status 'booked'
    const existingBookings = await EventBooking.findAll({
      where: {
        eventDate,
        status: 'booked',
      },
    });

    const toMinutes = (timeStr) => {
      const [h, m] = timeStr.split(':').map(Number);
      return h * 60 + m;
    };

    const newStart = toMinutes(startTime);
    const newEnd = toMinutes(endTime);

    const hasConflict = existingBookings.some((b) => {
      const bStart = toMinutes(b.startTime);
      const bEnd = toMinutes(b.endTime);
      return newStart < bEnd && newEnd > bStart;
    });

    if (hasConflict) {
      return ApiResponse.error(res, {
        statusCode: 409,
        message: 'This time slot overlaps with an existing booking on this date. Please choose another time.',
      });
    }

    const booking = await EventBooking.create({
      name: name.trim(),
      phone: phone.trim(),
      eventDate,
      startTime,
      endTime,
      eventName: eventName.trim(),
      notes: notes ? notes.trim() : null,
      status: 'booked',
    });

    return ApiResponse.success(res, {
      statusCode: 201,
      message: 'Event booked successfully',
      data: booking,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * ADMIN: GET /api/event-bookings/admin
 * Returns all bookings with customer details (admin only)
 */
const getAdminEventBookings = async (req, res, next) => {
  try {
    const bookings = await EventBooking.findAll({
      order: [
        ['eventDate', 'DESC'],
        ['startTime', 'ASC'],
      ],
    });

    return ApiResponse.success(res, {
      statusCode: 200,
      message: 'All event bookings fetched successfully',
      data: bookings,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * ADMIN: PATCH /api/event-bookings/admin/:id/cancel
 * Cancel an event booking
 */
const cancelEventBooking = async (req, res, next) => {
  try {
    const { id } = req.params;

    const booking = await EventBooking.findByPk(id);
    if (!booking) {
      return ApiResponse.error(res, {
        statusCode: 404,
        message: 'Event booking not found',
      });
    }

    await booking.update({ status: 'cancelled' });

    return ApiResponse.success(res, {
      statusCode: 200,
      message: 'Event booking cancelled successfully',
      data: booking,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getBookedSlots,
  createEventBooking,
  getAdminEventBookings,
  cancelEventBooking,
};

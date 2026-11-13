const { Op } = require('sequelize');
const Offer = require('../models/Offer');
const ApiResponse = require('../utils/ApiResponse');

/**
 * Compute display status for an offer at the current moment (UTC).
 */
function computeStatus(offer) {
  if (!offer.isActive) return 'removed';
  const now = new Date();
  const start = offer.startAt ? new Date(offer.startAt) : null;
  const end = offer.endAt ? new Date(offer.endAt) : null;

  if (end && end <= now) return 'expired';
  if (start && start > now) return 'scheduled';
  return 'live';
}

/**
 * PUBLIC: GET /api/offers?type=dine-in|delivery
 * Returns only currently-live offers (server-side time filter, no cron needed).
 */
const getPublicOffers = async (req, res, next) => {
  try {
    const { type } = req.query;
    const now = new Date();

    const where = {
      isActive: true,
      [Op.and]: [
        // startAt <= now OR startAt is null (post immediately)
        {
          [Op.or]: [
            { startAt: { [Op.lte]: now } },
            { startAt: null },
          ],
        },
        // endAt > now OR endAt is null (never expires)
        {
          [Op.or]: [
            { endAt: { [Op.gt]: now } },
            { endAt: null },
          ],
        },
      ],
    };

    if (type && ['dine-in', 'delivery'].includes(type)) {
      where.offerType = type;
    }

    const offers = await Offer.findAll({
      where,
      order: [['createdAt', 'DESC']],
      attributes: ['id', 'title', 'description', 'imageUrl', 'offerType', 'startAt', 'endAt', 'createdAt'],
    });

    return ApiResponse.success(res, {
      statusCode: 200,
      message: 'Offers fetched successfully',
      data: offers,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * ADMIN: GET /api/offers/admin
 * Returns all offers with computed status field.
 */
const getAllOffersAdmin = async (req, res, next) => {
  try {
    const offers = await Offer.findAll({
      order: [['createdAt', 'DESC']],
    });

    const data = offers.map((o) => ({
      ...o.toJSON(),
      status: computeStatus(o),
    }));

    return ApiResponse.success(res, {
      statusCode: 200,
      message: 'All offers fetched successfully',
      data,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * ADMIN: POST /api/offers
 * Create a new offer.
 */
const createOffer = async (req, res, next) => {
  try {
    const { title, description, imageUrl, offerType, startAt, endAt } = req.body;

    const offer = await Offer.create({
      title: title.trim(),
      description: description ? description.trim() : null,
      imageUrl: imageUrl ? imageUrl.trim() : null,
      offerType,
      startAt: startAt ? new Date(startAt) : null,
      endAt: endAt ? new Date(endAt) : null,
      isActive: true,
    });

    return ApiResponse.success(res, {
      statusCode: 201,
      message: 'Offer created successfully',
      data: { ...offer.toJSON(), status: computeStatus(offer) },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * ADMIN: PUT /api/offers/:id
 * Update an existing offer.
 */
const updateOffer = async (req, res, next) => {
  try {
    const { id } = req.params;
    const offer = await Offer.findByPk(id);

    if (!offer) {
      return ApiResponse.error(res, {
        statusCode: 404,
        message: 'Offer not found',
      });
    }

    const { title, description, imageUrl, offerType, startAt, endAt, isActive } = req.body;

    await offer.update({
      title: title !== undefined ? title.trim() : offer.title,
      description: description !== undefined ? (description ? description.trim() : null) : offer.description,
      imageUrl: imageUrl !== undefined ? (imageUrl ? imageUrl.trim() : null) : offer.imageUrl,
      offerType: offerType !== undefined ? offerType : offer.offerType,
      startAt: startAt !== undefined ? (startAt ? new Date(startAt) : null) : offer.startAt,
      endAt: endAt !== undefined ? (endAt ? new Date(endAt) : null) : offer.endAt,
      isActive: isActive !== undefined ? isActive : offer.isActive,
    });

    return ApiResponse.success(res, {
      statusCode: 200,
      message: 'Offer updated successfully',
      data: { ...offer.toJSON(), status: computeStatus(offer) },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * ADMIN: DELETE /api/offers/:id
 * Hard-delete an offer.
 */
const removeOffer = async (req, res, next) => {
  try {
    const { id } = req.params;
    const offer = await Offer.findByPk(id);

    if (!offer) {
      return ApiResponse.error(res, {
        statusCode: 404,
        message: 'Offer not found',
      });
    }

    await offer.destroy();

    return ApiResponse.success(res, {
      statusCode: 200,
      message: 'Offer removed successfully',
      data: { id },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getPublicOffers,
  getAllOffersAdmin,
  createOffer,
  updateOffer,
  removeOffer,
};

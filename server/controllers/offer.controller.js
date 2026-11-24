const fs = require('fs');
const { Op } = require('sequelize');
const Offer = require('../models/Offer');
const ApiResponse = require('../utils/ApiResponse');
const {
  formatOfferImageUrl,
  normalizeOfferImageUrl,
  deleteOfferImage,
} = require('../middleware/offerUpload');

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

    const data = offers.map((o) => {
      const json = o.toJSON ? o.toJSON() : o;
      return {
        ...json,
        imageUrl: formatOfferImageUrl(json.imageUrl, req),
      };
    });

    return ApiResponse.success(res, {
      statusCode: 200,
      message: 'Offers fetched successfully',
      data,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * ADMIN: GET /api/offers/admin
 * Returns all offers with computed status field and formatted imageUrl.
 */
const getAllOffersAdmin = async (req, res, next) => {
  try {
    const offers = await Offer.findAll({
      order: [['createdAt', 'DESC']],
    });

    const data = offers.map((o) => {
      const json = o.toJSON ? o.toJSON() : o;
      return {
        ...json,
        imageUrl: formatOfferImageUrl(json.imageUrl, req),
        status: computeStatus(o),
      };
    });

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
 * Create a new offer (accepts JSON or multipart/form-data with optional 'image').
 */
const createOffer = async (req, res, next) => {
  try {
    const { title, description, offerType, startAt, endAt } = req.body;
    let imageUrl = req.body.imageUrl;

    if (req.file && req.file.imageUrl) {
      imageUrl = req.file.imageUrl;
    } else if (imageUrl) {
      imageUrl = normalizeOfferImageUrl(imageUrl);
    }

    const offer = await Offer.create({
      title: title ? title.trim() : '',
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
      data: {
        ...offer.toJSON(),
        imageUrl: formatOfferImageUrl(offer.imageUrl, req),
        status: computeStatus(offer),
      },
    });
  } catch (error) {
    // If a new image was uploaded for this request, clean it up on failure
    if (req.file) {
      if (req.file.imageUrl) {
        deleteOfferImage(req.file.imageUrl).catch(() => {});
      } else if (req.file.path) {
        fs.promises.unlink(req.file.path).catch(() => {});
      }
    }
    next(error);
  }
};

/**
 * ADMIN: PUT /api/offers/:id
 * Update an existing offer (accepts JSON or multipart/form-data with optional 'image').
 */
const updateOffer = async (req, res, next) => {
  try {
    const { id } = req.params;
    const offer = await Offer.findByPk(id);

    if (!offer) {
      if (req.file) {
        if (req.file.imageUrl) {
          deleteOfferImage(req.file.imageUrl).catch(() => {});
        } else if (req.file.path) {
          fs.promises.unlink(req.file.path).catch(() => {});
        }
      }
      return ApiResponse.error(res, {
        statusCode: 404,
        message: 'Offer not found',
      });
    }

    const { title, description, offerType, startAt, endAt, isActive } = req.body;

    let newImageUrl = offer.imageUrl;
    const oldImageUrl = offer.imageUrl;

    if (req.file && req.file.imageUrl) {
      newImageUrl = req.file.imageUrl;
    } else if (req.body.imageUrl !== undefined) {
      newImageUrl = req.body.imageUrl ? normalizeOfferImageUrl(req.body.imageUrl) : null;
    }

    await offer.update({
      title: title !== undefined ? title.trim() : offer.title,
      description: description !== undefined ? (description ? description.trim() : null) : offer.description,
      imageUrl: newImageUrl,
      offerType: offerType !== undefined ? offerType : offer.offerType,
      startAt: startAt !== undefined ? (startAt ? new Date(startAt) : null) : offer.startAt,
      endAt: endAt !== undefined ? (endAt ? new Date(endAt) : null) : offer.endAt,
      isActive: isActive !== undefined ? isActive : offer.isActive,
    });

    // If image changed or was removed, clean up old image (Cloudinary or local)
    if (oldImageUrl && oldImageUrl !== newImageUrl) {
      await deleteOfferImage(oldImageUrl);
    }

    return ApiResponse.success(res, {
      statusCode: 200,
      message: 'Offer updated successfully',
      data: {
        ...offer.toJSON(),
        imageUrl: formatOfferImageUrl(offer.imageUrl, req),
        status: computeStatus(offer),
      },
    });
  } catch (error) {
    if (req.file) {
      if (req.file.imageUrl) {
        deleteOfferImage(req.file.imageUrl).catch(() => {});
      } else if (req.file.path) {
        fs.promises.unlink(req.file.path).catch(() => {});
      }
    }
    next(error);
  }
};

/**
 * ADMIN: DELETE /api/offers/:id
 * Hard-delete an offer and clean up its uploaded image file.
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

    const oldImageUrl = offer.imageUrl;
    await offer.destroy();

    // Clean up uploaded image if it was stored on Cloudinary or in /uploads/offers/
    if (oldImageUrl) {
      await deleteOfferImage(oldImageUrl);
    }

    return ApiResponse.success(res, {
      statusCode: 200,
      message: 'Offer removed successfully',
      data: { id },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * ADMIN: POST /api/offers/upload-image
 * Dedicated standalone endpoint for uploading an offer banner image.
 */
const uploadOfferImage = async (req, res) => {
  if (!req.file || !req.file.imageUrl) {
    return ApiResponse.error(res, {
      statusCode: 400,
      message: 'No image file uploaded',
    });
  }

  const imageUrl = req.file.imageUrl;
  const absoluteUrl = formatOfferImageUrl(imageUrl, req);

  return ApiResponse.success(res, {
    statusCode: 200,
    message: 'Offer image uploaded successfully',
    data: {
      imageUrl: absoluteUrl,
      secure_url: req.file.secure_url || absoluteUrl,
      relativeUrl: req.file.filename ? `/uploads/offers/${req.file.filename}` : null,
      filename: req.file.filename || null,
      public_id: req.file.public_id || null,
    },
  });
};

module.exports = {
  getPublicOffers,
  getAllOffersAdmin,
  createOffer,
  updateOffer,
  removeOffer,
  uploadOfferImage,
};

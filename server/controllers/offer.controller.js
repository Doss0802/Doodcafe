const fs = require('fs');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const { Op } = require('sequelize');
const Offer = require('../models/Offer');
const OfferImage = require('../models/OfferImage');
const User = require('../models/User');
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
 * PUBLIC: GET /api/offers/:id/image
 * Streams the offer banner image from offer_images table.
 * Returns:
 * - Content-Type: image/jpeg | image/png | image/webp
 * - Cache-Control: public, max-age=86400 (1 day)
 * - ETag support (returns 304 if client cache matches)
 * - 404 if missing or offer is not live (only live offers served publicly; admins can view)
 */
const getOfferImage = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!id) {
      return ApiResponse.error(res, { statusCode: 404, message: 'Image not found' });
    }

    // Try finding the offer by ID first
    let offer = await Offer.findByPk(id);
    let imageRecord = null;

    if (offer) {
      imageRecord = await OfferImage.findOne({ where: { offerId: offer.id } });
    } else {
      // Check if :id is the image record id itself
      imageRecord = await OfferImage.findByPk(id);
      if (imageRecord && imageRecord.offerId) {
        offer = await Offer.findByPk(imageRecord.offerId);
      }
    }

    if (!imageRecord || !imageRecord.data) {
      return ApiResponse.error(res, { statusCode: 404, message: 'Image not found' });
    }

    // Live offer verification for public requests
    if (offer) {
      const now = new Date();
      const isLive = Boolean(
        offer.isActive &&
        (!offer.startAt || new Date(offer.startAt) <= now) &&
        (!offer.endAt || new Date(offer.endAt) > now)
      );

      if (!isLive) {
        // Allow authenticated admin/manager access
        let isAdmin = false;
        try {
          const authHeader = req.headers.authorization;
          const queryToken = req.query?.token;
          const rawToken = authHeader?.startsWith('Bearer ')
            ? authHeader.split(' ')[1]
            : queryToken;

          if (rawToken && process.env.JWT_ACCESS_SECRET) {
            const decoded = jwt.verify(rawToken, process.env.JWT_ACCESS_SECRET);
            const user = await User.findByPk(decoded.id);
            if (user && ['admin', 'manager'].includes(user.role)) {
              isAdmin = true;
            }
          }
        } catch {}

        if (!isAdmin) {
          return ApiResponse.error(res, { statusCode: 404, message: 'Offer is not live' });
        }
      }
    } else {
      return ApiResponse.error(res, { statusCode: 404, message: 'Offer not found' });
    }

    const dataBuffer = Buffer.isBuffer(imageRecord.data)
      ? imageRecord.data
      : Buffer.from(imageRecord.data);

    const etag = `"${crypto.createHash('md5').update(dataBuffer).digest('hex')}"`;

    res.setHeader('Content-Type', imageRecord.mimeType || 'image/jpeg');
    res.setHeader('Cache-Control', 'public, max-age=86400');
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    res.setHeader('ETag', etag);

    if (req.headers['if-none-match'] === etag) {
      return res.status(304).end();
    }

    return res.status(200).send(dataBuffer);
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

    const offerId = req.file?.targetId || crypto.randomUUID();

    if (req.file) {
      if (req.file.storageType === 'db') {
        imageUrl = `/api/offers/${offerId}/image`;
      } else if (req.file.imageUrl) {
        imageUrl = req.file.imageUrl;
      }
    } else if (imageUrl) {
      imageUrl = normalizeOfferImageUrl(imageUrl);
    }

    const offer = await Offer.create({
      id: offerId,
      title: title ? title.trim() : '',
      description: description ? description.trim() : null,
      imageUrl: imageUrl ? imageUrl.trim() : null,
      offerType,
      startAt: startAt ? new Date(startAt) : null,
      endAt: endAt ? new Date(endAt) : null,
      isActive: true,
    });

    if (req.file && req.file.storageType === 'db' && req.file.processedBuffer) {
      await OfferImage.create({
        offerId: offer.id,
        mimeType: req.file.mimeType || 'image/jpeg',
        data: req.file.processedBuffer,
        size: req.file.size || req.file.processedBuffer.length,
      });
    }

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
      if (req.file.storageType === 'db' && req.file.targetId) {
        OfferImage.destroy({ where: { offerId: req.file.targetId } }).catch(() => {});
      } else if (req.file.imageUrl) {
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

    if (req.file) {
      if (req.file.storageType === 'db') {
        newImageUrl = `/api/offers/${offer.id}/image`;
        await OfferImage.destroy({ where: { offerId: offer.id } });
        await OfferImage.create({
          offerId: offer.id,
          mimeType: req.file.mimeType || 'image/jpeg',
          data: req.file.processedBuffer,
          size: req.file.size || req.file.processedBuffer.length,
        });
      } else if (req.file.imageUrl) {
        newImageUrl = req.file.imageUrl;
      }
    } else if (req.body.imageUrl !== undefined) {
      newImageUrl = req.body.imageUrl ? normalizeOfferImageUrl(req.body.imageUrl) : null;
      if (!newImageUrl) {
        // Image was removed
        await OfferImage.destroy({ where: { offerId: offer.id } });
      }
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
      if (req.file.storageType === 'db' && req.file.targetId) {
        OfferImage.destroy({ where: { offerId: req.file.targetId } }).catch(() => {});
      } else if (req.file.imageUrl) {
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
 * Hard-delete an offer and clean up its uploaded image file and offer_images row.
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

    // Delete image from database offer_images table
    await OfferImage.destroy({ where: { offerId: offer.id } });

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
  if (!req.file || (!req.file.imageUrl && !req.file.processedBuffer)) {
    return ApiResponse.error(res, {
      statusCode: 400,
      message: 'No image file uploaded',
    });
  }

  let imageUrl = req.file.imageUrl;

  if (req.file.storageType === 'db') {
    const imageId = req.file.targetId || crypto.randomUUID();
    imageUrl = `/api/offers/${imageId}/image`;

    await OfferImage.create({
      id: imageId,
      offerId: req.body.offerId || null,
      mimeType: req.file.mimeType || 'image/jpeg',
      data: req.file.processedBuffer,
      size: req.file.size || req.file.processedBuffer.length,
    });
  }

  const absoluteUrl = formatOfferImageUrl(imageUrl, req);

  return ApiResponse.success(res, {
    statusCode: 200,
    message: 'Offer image uploaded successfully',
    data: {
      imageUrl: absoluteUrl,
      secure_url: req.file.secure_url || absoluteUrl,
      relativeUrl: imageUrl,
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
  getOfferImage,
};

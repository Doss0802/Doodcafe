/**
 * ─── Menu Management Router ────────────────────────────────────────────────────
 * Mounted at: /api/menu-management
 * Secured:    JWT verify (protect) + isAdmin role guard on every mutation
 * Sanitized:  express-mongo-sanitize on all inbound payloads
 *
 * Endpoints:
 *   GET    /             — List all items (paginated, admin sees all incl. unavailable)
 *   GET    /categories   — Return Category list for form select
 *   POST   /             — Create new MenuItem document
 *   PUT    /:id          — Update MenuItem fields (name, price, category, imageUrl, flags)
 *   DELETE /:id          — Permanently remove MenuItem via findByIdAndDelete()
 */

const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const mongoSanitize = require('express-mongo-sanitize');
const { body, param, query } = require('express-validator');

const MenuItem = require('../models/MenuItem');
const Category = require('../models/Category');
const { protect, isAdmin } = require('../middleware/auth');
const { uploadSingle } = require('../middleware/upload');
const validate = require('../middleware/validate');
const { sensitiveLimiter } = require('../middleware/rateLimiter');
const ApiResponse = require('../utils/ApiResponse');

// ── Payload sanitization middleware ────────────────────────────────────────────
const sanitize = (req, _res, next) => {
  if (req.body && typeof req.body === 'object') {
    mongoSanitize.sanitize(req.body, { replaceWith: '_' });
  }
  if (req.params && typeof req.params === 'object') {
    mongoSanitize.sanitize(req.params, { replaceWith: '_' });
  }
  next();
};

// ── Shared validation rules ────────────────────────────────────────────────────
const itemBodyValidation = [
  body('name')
    .trim()
    .notEmpty().withMessage('Item name is required')
    .isLength({ max: 80 }).withMessage('Name cannot exceed 80 characters'),
  body('price')
    .notEmpty().withMessage('Price is required')
    .isFloat({ min: 0 }).withMessage('Price must be a non-negative number'),
  body('category')
    .notEmpty().withMessage('Category is required')
    .custom(v => mongoose.Types.ObjectId.isValid(v)).withMessage('Invalid category ID'),
  body('description')
    .optional().trim()
    .isLength({ max: 300 }).withMessage('Description cannot exceed 300 characters'),
  body('imageUrl')
    .optional().trim()
    .isURL({ require_protocol: true }).withMessage('imageUrl must be a valid URL'),
  body('isVeg')
    .optional().isBoolean().toBoolean(),
  body('isBestseller')
    .optional().isBoolean().toBoolean(),
  body('available')
    .optional().isBoolean().toBoolean(),
  body('preparationTime')
    .optional().isInt({ min: 1, max: 240 }).withMessage('Preparation time must be between 1 and 240 minutes'),
];

const updateBodyValidation = [
  body('name')
    .optional().trim()
    .isLength({ min: 1, max: 80 }).withMessage('Name cannot exceed 80 characters'),
  body('price')
    .optional()
    .isFloat({ min: 0 }).withMessage('Price must be a non-negative number'),
  body('category')
    .optional()
    .custom(v => mongoose.Types.ObjectId.isValid(v)).withMessage('Invalid category ID'),
  body('description')
    .optional().trim()
    .isLength({ max: 300 }).withMessage('Description cannot exceed 300 characters'),
  body('imageUrl')
    .optional({ nullable: true })
    .custom(v => !v || /^https?:\/\//i.test(v)).withMessage('imageUrl must be a valid URL'),
  body('isVeg')
    .optional().isBoolean().toBoolean(),
  body('isBestseller')
    .optional().isBoolean().toBoolean(),
  body('available')
    .optional().isBoolean().toBoolean(),
  body('preparationTime')
    .optional().isInt({ min: 1, max: 240 }).withMessage('Preparation time must be between 1 and 240 minutes'),
];

const idParamValidation = [
  param('id').isMongoId().withMessage('Invalid menu item ID format'),
];

// ── Handlers ──────────────────────────────────────────────────────────────────

/**
 * GET /  — Paginated list (admin sees ALL items including unavailable)
 */
const listItems = async (req, res, next) => {
  try {
    const page  = Math.max(1, parseInt(req.query.page)  || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 30));
    const skip  = (page - 1) * limit;

    const filter = {}; // Admin sees everything — no available filter
    const [items, total] = await Promise.all([
      MenuItem.find(filter)
        .populate('category', 'name slug icon')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      MenuItem.countDocuments(filter),
    ]);

    return ApiResponse.success(res, {
      statusCode: 200,
      message: 'Menu items retrieved successfully',
      data: items,
      meta: {
        total,
        pages: Math.ceil(total / limit),
        page,
        limit,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /categories  — Return all active categories for the Add/Edit form select
 */
const listCategories = async (req, res, next) => {
  try {
    const categories = await Category.find({ isActive: true })
      .select('name slug icon')
      .sort({ displayOrder: 1, name: 1 })
      .lean();
    return ApiResponse.success(res, {
      statusCode: 200,
      message: 'Categories retrieved',
      data: categories,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /  — Create a new MenuItem document
 * Accepts multipart/form-data (image file) OR JSON with imageUrl string
 */
const createItem = async (req, res, next) => {
  try {
    const { name, price, category, description, imageUrl, isVeg, isBestseller, available, preparationTime, tags } = req.body;

    // If a file was uploaded via multer, convert buffer → base64 data URL (simple fallback)
    let finalImageUrl = imageUrl || '';
    if (req.file) {
      finalImageUrl = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;
    }

    // Parse tags from comma-separated string or JSON array
    let parsedTags = [];
    if (tags) {
      parsedTags = Array.isArray(tags)
        ? tags.map(t => String(t).trim()).filter(Boolean)
        : String(tags).split(',').map(t => t.trim()).filter(Boolean);
    }

    const item = await MenuItem.create({
      name: name.trim(),
      price: parseFloat(price),
      category,
      description: description?.trim() || '',
      imageUrl: finalImageUrl,
      image: finalImageUrl,
      isVeg: Boolean(isVeg),
      isBestseller: Boolean(isBestseller),
      available: available !== undefined ? Boolean(available) : true,
      preparationTime: parseInt(preparationTime) || 10,
      tags: parsedTags,
    });

    const populated = await item.populate('category', 'name slug icon');

    return ApiResponse.success(res, {
      statusCode: 201,
      message: `Menu item "${item.name}" created successfully`,
      data: populated,
    });
  } catch (error) {
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(e => e.message);
      return ApiResponse.error(res, { statusCode: 400, message: errors.join('. '), errors });
    }
    next(error);
  }
};

/**
 * PUT /:id  — Update MenuItem fields
 * Accepts JSON body or multipart/form-data if replacing image file
 */
const updateItem = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, price, category, description, imageUrl, isVeg, isBestseller, available, preparationTime, tags } = req.body;

    const item = await MenuItem.findById(id);
    if (!item) {
      return ApiResponse.error(res, { statusCode: 404, message: 'Menu item not found' });
    }

    // Apply updates only for fields actually provided
    if (name !== undefined)        item.name        = name.trim();
    if (price !== undefined)       item.price       = parseFloat(price);
    if (category !== undefined)    item.category    = category;
    if (description !== undefined) item.description = description.trim();
    if (isVeg !== undefined)       item.isVeg       = Boolean(isVeg);
    if (isBestseller !== undefined) item.isBestseller = Boolean(isBestseller);
    if (available !== undefined)   item.available   = Boolean(available);
    if (preparationTime !== undefined) item.preparationTime = parseInt(preparationTime) || 10;

    // Image: uploaded file takes priority, then imageUrl string, then keep existing
    if (req.file) {
      const b64 = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;
      item.imageUrl = b64;
      item.image = b64;
    } else if (imageUrl !== undefined) {
      item.imageUrl = imageUrl;
      item.image = imageUrl;
    }

    if (tags !== undefined) {
      item.tags = Array.isArray(tags)
        ? tags.map(t => String(t).trim()).filter(Boolean)
        : String(tags).split(',').map(t => t.trim()).filter(Boolean);
    }

    await item.save();
    const populated = await item.populate('category', 'name slug icon');

    return ApiResponse.success(res, {
      statusCode: 200,
      message: `Menu item "${item.name}" updated successfully`,
      data: populated,
    });
  } catch (error) {
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(e => e.message);
      return ApiResponse.error(res, { statusCode: 400, message: errors.join('. '), errors });
    }
    next(error);
  }
};

/**
 * DELETE /:id  — Permanently remove MenuItem via findByIdAndDelete()
 */
const deleteItem = async (req, res, next) => {
  try {
    const { id } = req.params;
    const item = await MenuItem.findByIdAndDelete(id).lean();
    if (!item) {
      return ApiResponse.error(res, { statusCode: 404, message: 'Menu item not found' });
    }
    return ApiResponse.success(res, {
      statusCode: 200,
      message: `Menu item "${item.name}" removed permanently`,
      data: { _id: id, name: item.name },
    });
  } catch (error) {
    next(error);
  }
};

// ── Route Registrations ────────────────────────────────────────────────────────

// Public-facing GET (admin only — protected behind protect + isAdmin)
router.get('/',
  protect, isAdmin,
  [query('page').optional().isInt({ min: 1 }), query('limit').optional().isInt({ min: 1, max: 100 })],
  validate,
  listItems
);

router.get('/categories',
  protect, isAdmin,
  listCategories
);

// Admin CRUD mutations — JWT + isAdmin + rate limiting + mongo-sanitize + validation
router.post('/',
  protect, isAdmin, sensitiveLimiter,
  uploadSingle('image'),
  sanitize,
  itemBodyValidation,
  validate,
  createItem
);

router.put('/:id',
  protect, isAdmin, sensitiveLimiter,
  uploadSingle('image'),
  sanitize,
  idParamValidation,
  updateBodyValidation,
  validate,
  updateItem
);

router.delete('/:id',
  protect, isAdmin, sensitiveLimiter,
  sanitize,
  idParamValidation,
  validate,
  deleteItem
);

module.exports = router;

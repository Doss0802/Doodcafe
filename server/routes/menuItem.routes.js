const express = require('express');
const mongoose = require('mongoose');
const { body, param, query } = require('express-validator');
const mongoSanitize = require('express-mongo-sanitize');
const MenuItem = require('../models/MenuItem');
const Category = require('../models/Category');
const ApiResponse = require('../utils/ApiResponse');
const { protect, requireRole, isAdmin } = require('../middleware/auth');
const { uploadSingle } = require('../middleware/upload');
const validate = require('../middleware/validate');
const { sensitiveLimiter } = require('../middleware/rateLimiter');

const router = express.Router();

/**
 * @desc   Get all menu items with optional pagination & filtering
 * @route  GET /api/menu-items or GET /api/v1/menu-items
 * @access Public
 */
const getMenuItemsList = async (req, res, next) => {
  try {
    const {
      category,
      search,
      available,
      page = 1,
      limit = 30,
    } = req.query;

    const filter = {};
    if (available === 'false') {
      // admin view: show all items including unavailable
    } else {
      // default: only show available items on customer-facing views; admin needs all
      // Check if admin request — allow all; otherwise only available
      const isAdminReq = req.user && req.user.role === 'admin';
      if (!isAdminReq) filter.available = true;
    }

    if (category && category !== 'all') {
      const cat = await Category.findOne({
        $or: [{ slug: category }, { name: new RegExp(`^${category}$`, 'i') }],
      }).select('_id').lean();
      if (cat) filter.category = cat._id;
    }

    if (search && search.trim()) {
      filter.$or = [
        { name: new RegExp(search.trim(), 'i') },
        { description: new RegExp(search.trim(), 'i') },
      ];
    }

    const pageNum = Math.max(1, parseInt(page, 10));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10)));
    const skip = (pageNum - 1) * limitNum;

    const [total, items] = await Promise.all([
      MenuItem.countDocuments(filter),
      MenuItem.find(filter)
        .populate('category', 'name slug icon')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
    ]);

    return ApiResponse.success(res, {
      statusCode: 200,
      message: 'Menu items fetched successfully',
      data: items,
      meta: {
        total,
        page: pageNum,
        pages: Math.ceil(total / limitNum) || 1,
        limit: limitNum,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc   Get a single menu item by ID
 * @route  GET /api/menu-items/:id
 * @access Public
 */
const getSingleMenuItem = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return ApiResponse.error(res, { statusCode: 400, message: 'Invalid menu item ID format' });
    }

    const item = await MenuItem.findById(id)
      .populate('category', 'name slug icon')
      .lean();

    if (!item) {
      return ApiResponse.error(res, { statusCode: 404, message: 'Menu item not found' });
    }

    return ApiResponse.success(res, {
      statusCode: 200,
      message: 'Menu item fetched successfully',
      data: item,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Optional JWT auth — populates req.user if valid Bearer token is present,
 * but does NOT block the request if token is absent or invalid.
 * Used on public GET routes to detect admin access without requiring login.
 */
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const jwt = require('jsonwebtoken');
      const User = require('../models/User');
      const token = authHeader.split(' ')[1];
      try {
        const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
        const user = await User.findById(decoded.id).select('role').lean();
        if (user) req.user = user;
      } catch (_) {
        // Invalid/expired token — continue as guest
      }
    }
    next();
  } catch (error) {
    next();
  }
};

/**
 * Payload sanitization guard against NoSQL query injections
 */
const sanitizePayload = (req, res, next) => {
  if (req.body && typeof req.body === 'object') {
    mongoSanitize.sanitize(req.body, { replaceWith: '_' });
  }
  if (req.params && typeof req.params === 'object') {
    mongoSanitize.sanitize(req.params, { replaceWith: '_' });
  }
  next();
};

/**
 * Validation rules for menu item creation.
 * Sanitizes input text, escapes HTML/script tags, and validates boundaries.
 */
const createMenuItemValidation = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Item name is required')
    .isLength({ min: 1, max: 80 })
    .withMessage('Item name must be between 1 and 80 characters')
    .escape(),
  body('description')
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ max: 300 })
    .withMessage('Description cannot exceed 300 characters')
    .escape(),
  body('price')
    .notEmpty()
    .withMessage('Price is required')
    .isFloat({ min: 0 })
    .withMessage('Price must be a non-negative number')
    .toFloat(),
  body('category')
    .trim()
    .notEmpty()
    .withMessage('Category is required')
    .escape(),
  body('preparationTime')
    .optional({ checkFalsy: true })
    .isInt({ min: 1, max: 180 })
    .withMessage('Preparation time must be between 1 and 180 minutes')
    .toInt(),
  body('isVeg')
    .optional()
    .toBoolean(),
  body('isBestseller')
    .optional()
    .toBoolean(),
  body('available')
    .optional()
    .toBoolean(),
  body('show_prices_to_public')
    .optional()
    .toBoolean(),
  body('imageUrl')
    .optional({ checkFalsy: true })
    .isString()
    .trim(),
];

/**
 * Validation rules for menu item update.
 */
const updateMenuItemValidation = [
  param('id')
    .isMongoId()
    .withMessage('Invalid menu item ID format'),
  body('name')
    .optional()
    .trim()
    .isLength({ min: 1, max: 80 })
    .withMessage('Item name must be between 1 and 80 characters')
    .escape(),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 300 })
    .withMessage('Description cannot exceed 300 characters')
    .escape(),
  body('price')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Price must be a non-negative number')
    .toFloat(),
  body('category')
    .optional()
    .trim()
    .escape(),
  body('preparationTime')
    .optional()
    .isInt({ min: 1, max: 180 })
    .withMessage('Preparation time must be between 1 and 180 minutes')
    .toInt(),
  body('isVeg')
    .optional()
    .toBoolean(),
  body('isBestseller')
    .optional()
    .toBoolean(),
  body('available')
    .optional()
    .toBoolean(),
  body('imageUrl')
    .optional({ checkFalsy: true })
    .isString()
    .trim(),
];

/**
 * Validation rules for menu item removal.
 */
const deleteMenuItemValidation = [
  param('id')
    .isMongoId()
    .withMessage('Invalid menu item ID format'),
];

/**
 * @desc   Create a new menu item with optional image file upload
 * @route  POST /api/menu-items or POST /api/v1/menu-items
 * @access Private (Admin only)
 */
const createMenuItem = async (req, res, next) => {
  try {
    const {
      name,
      description = '',
      price,
      category: categoryInput,
      preparationTime = 10,
      isVeg = false,
      isBestseller = false,
      available = true,
      show_prices_to_public = true,
      tags = [],
    } = req.body;

    // ── 1. Resolve Category ID ──────────────────────────────────────
    let categoryDoc = null;
    if (mongoose.Types.ObjectId.isValid(categoryInput)) {
      categoryDoc = await Category.findById(categoryInput);
    }

    if (!categoryDoc) {
      // Find by slug or case-insensitive name
      categoryDoc = await Category.findOne({
        $or: [
          { slug: categoryInput.toLowerCase() },
          { name: new RegExp(`^${categoryInput}$`, 'i') },
        ],
      });
    }

    if (!categoryDoc) {
      return ApiResponse.error(res, {
        statusCode: 400,
        message: `Category "${categoryInput}" not found. Please choose an existing category.`,
      });
    }

    // ── 2. Process Image (Binary file upload via Multer or direct URL) ─
    let finalImageUrl = req.body.imageUrl || '';

    if (req.file && req.file.buffer) {
      // Convert binary buffer to standard Base64 Data URL for persistent cloud storage
      const mime = req.file.mimetype || 'image/jpeg';
      const base64 = req.file.buffer.toString('base64');
      finalImageUrl = `data:${mime};base64,${base64}`;
    }

    // ── 3. Parse Tags (string or array) ────────────────────────────
    let tagsList = [];
    if (Array.isArray(tags)) {
      tagsList = tags.map((t) => String(t).trim()).filter(Boolean);
    } else if (typeof tags === 'string' && tags.trim()) {
      tagsList = tags
        .split(',')
        .map((t) => t.trim().replace(/^#/, ''))
        .filter(Boolean);
    }

    // ── 4. Instantiate & Persist Mongoose 9 MenuItem Document ───────
    const newMenuItem = await MenuItem.create({
      name,
      description,
      price: Number(price),
      category: categoryDoc._id,
      imageUrl: finalImageUrl,
      image: finalImageUrl,
      preparationTime: Number(preparationTime) || 10,
      isVeg: Boolean(isVeg),
      isBestseller: Boolean(isBestseller),
      available: available !== undefined ? Boolean(available) : true,
      show_prices_to_public:
        show_prices_to_public !== undefined ? Boolean(show_prices_to_public) : true,
      tags: tagsList,
    });

    const populatedItem = await MenuItem.findById(newMenuItem._id)
      .populate('category', 'name slug icon')
      .lean();

    return ApiResponse.success(res, {
      statusCode: 201,
      message: 'Menu item created successfully',
      data: populatedItem,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc   Update a menu item by ID (with optional image file upload)
 * @route  PUT /api/menu-items/:id or PATCH /api/menu-items/:id
 * @access Private (Admin only)
 */
const updateMenuItem = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return ApiResponse.error(res, {
        statusCode: 400,
        message: 'Invalid menu item ID format',
      });
    }

    const existing = await MenuItem.findById(id);
    if (!existing) {
      return ApiResponse.error(res, {
        statusCode: 404,
        message: 'Menu item not found',
      });
    }

    const updateData = {};
    if (req.body.name !== undefined && req.body.name.trim()) {
      updateData.name = req.body.name.trim();
    }
    if (req.body.description !== undefined) {
      updateData.description = req.body.description.trim();
    }
    if (req.body.price !== undefined && req.body.price !== '') {
      const priceNum = Number(req.body.price);
      if (!isNaN(priceNum) && priceNum >= 0) {
        updateData.price = priceNum;
      }
    }
    if (req.body.preparationTime !== undefined && req.body.preparationTime !== '') {
      updateData.preparationTime = Number(req.body.preparationTime) || 10;
    }
    if (req.body.isVeg !== undefined) {
      updateData.isVeg = req.body.isVeg === 'true' || req.body.isVeg === true;
    }
    if (req.body.isBestseller !== undefined) {
      updateData.isBestseller = req.body.isBestseller === 'true' || req.body.isBestseller === true;
    }
    if (req.body.available !== undefined) {
      updateData.available = req.body.available === 'true' || req.body.available === true;
    }

    if (req.body.category) {
      let categoryDoc = null;
      if (mongoose.Types.ObjectId.isValid(req.body.category)) {
        categoryDoc = await Category.findById(req.body.category);
      }
      if (!categoryDoc) {
        categoryDoc = await Category.findOne({
          $or: [
            { slug: req.body.category.toLowerCase() },
            { name: new RegExp(`^${req.body.category}$`, 'i') },
          ],
        });
      }
      if (categoryDoc) {
        updateData.category = categoryDoc._id;
      }
    }

    if (req.body.tags !== undefined) {
      if (Array.isArray(req.body.tags)) {
        updateData.tags = req.body.tags.map((t) => String(t).trim()).filter(Boolean);
      } else if (typeof req.body.tags === 'string') {
        updateData.tags = req.body.tags
          .split(',')
          .map((t) => t.trim().replace(/^#/, ''))
          .filter(Boolean);
      }
    }

    if (req.file && req.file.buffer) {
      const mime = req.file.mimetype || 'image/jpeg';
      const base64 = req.file.buffer.toString('base64');
      const dataUrl = `data:${mime};base64,${base64}`;
      updateData.imageUrl = dataUrl;
      updateData.image = dataUrl;
    } else if (req.body.imageUrl !== undefined && req.body.imageUrl.trim()) {
      updateData.imageUrl = req.body.imageUrl.trim();
      updateData.image = req.body.imageUrl.trim();
    }

    const updated = await MenuItem.findByIdAndUpdate(id, { $set: updateData }, { new: true, runValidators: true })
      .populate('category', 'name slug icon')
      .lean();

    return ApiResponse.success(res, {
      statusCode: 200,
      message: `Menu item "${updated.name}" updated successfully`,
      data: updated,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc   Delete a menu item by ID
 * @route  DELETE /api/menu-items/:id or DELETE /api/v1/menu-items/:id
 * @access Private (Admin only)
 */
const deleteMenuItem = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return ApiResponse.error(res, {
        statusCode: 400,
        message: 'Invalid menu item ID format',
      });
    }

    const item = await MenuItem.findByIdAndDelete(id);
    if (!item) {
      return ApiResponse.error(res, {
        statusCode: 404,
        message: 'Menu item not found or already removed',
      });
    }

    return ApiResponse.success(res, {
      statusCode: 200,
      message: `Menu item "${item.name}" removed successfully`,
      data: { _id: id, name: item.name },
    });
  } catch (error) {
    next(error);
  }
};

// ─── Public GET Routes ────────────────────────────────────────────────────────
// optionalAuth populates req.user if Bearer token present (no hard block)
// Admin users see ALL items; guests see only available items
router.get('/', optionalAuth, getMenuItemsList);
router.get('/items', optionalAuth, getMenuItemsList);
router.get('/:id', optionalAuth, [
  param('id').isMongoId().withMessage('Invalid menu item ID format'),
  validate,
], getSingleMenuItem);

// ─── Admin CRUD Routes (JWT protect + isAdmin role required) ─────────────────
router.post(
  '/',
  protect,
  isAdmin,
  sensitiveLimiter,
  uploadSingle('image'),
  sanitizePayload,
  createMenuItemValidation,
  validate,
  createMenuItem
);

router.put(
  '/:id',
  protect,
  isAdmin,
  sensitiveLimiter,
  uploadSingle('image'),
  sanitizePayload,
  updateMenuItemValidation,
  validate,
  updateMenuItem
);

router.patch(
  '/:id',
  protect,
  isAdmin,
  sensitiveLimiter,
  uploadSingle('image'),
  sanitizePayload,
  updateMenuItemValidation,
  validate,
  updateMenuItem
);

router.delete(
  '/:id',
  protect,
  isAdmin,
  sensitiveLimiter,
  sanitizePayload,
  deleteMenuItemValidation,
  validate,
  deleteMenuItem
);

// ─── Handler exports (used by admin panel internals if needed) ────────────────
router.createMenuItem = createMenuItem;
router.updateMenuItem = updateMenuItem;
router.deleteMenuItem = deleteMenuItem;
router.sanitizePayload = sanitizePayload;
router.createMenuItemValidation = createMenuItemValidation;
router.updateMenuItemValidation = updateMenuItemValidation;
router.deleteMenuItemValidation = deleteMenuItemValidation;

module.exports = router;

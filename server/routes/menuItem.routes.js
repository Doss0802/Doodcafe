const express = require('express');
const mongoose = require('mongoose');
const { body } = require('express-validator');
const MenuItem = require('../models/MenuItem');
const Category = require('../models/Category');
const ApiResponse = require('../utils/ApiResponse');
const { protect, requireRole } = require('../middleware/auth');
const { uploadSingle } = require('../middleware/upload');
const validate = require('../middleware/validate');
const { sensitiveLimiter } = require('../middleware/rateLimiter');

const router = express.Router();

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

// Route declaration: protected by JWT auth & strict admin role evaluation
router.post(
  '/',
  protect,
  requireRole('admin'),
  sensitiveLimiter,
  uploadSingle('image'),
  createMenuItemValidation,
  validate,
  createMenuItem
);

module.exports = router;

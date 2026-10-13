const express = require('express');
const mongoSanitize = require('express-mongo-sanitize');
const { protect, isAdmin } = require('../middleware/auth');
const { uploadSingle } = require('../middleware/upload');
const validate = require('../middleware/validate');
const { sensitiveLimiter } = require('../middleware/rateLimiter');
const menuItemRoutes = require('./menuItem.routes');
const menuRoutes = require('./menu.routes');

const {
  createMenuItem,
  updateMenuItem,
  deleteMenuItem,
  createMenuItemValidation,
  updateMenuItemValidation,
  deleteMenuItemValidation,
} = menuItemRoutes;

const router = express.Router();

/**
 * Payload sanitization middleware against NoSQL query injections
 * Applies express-mongo-sanitize to flush potential exploits
 */
const mongoSanitizeMiddleware = (req, res, next) => {
  if (req.body && typeof req.body === 'object') {
    mongoSanitize.sanitize(req.body, { replaceWith: '_' });
  }
  if (req.params && typeof req.params === 'object') {
    mongoSanitize.sanitize(req.params, { replaceWith: '_' });
  }
  if (req.query && typeof req.query === 'object') {
    mongoSanitize.sanitize(req.query, { replaceWith: '_' });
  }
  next();
};

/**
 * Robust POST logic path handler for Menu Item Creation
 * Protected with JWT auth verification, isAdmin role check, and mongo-sanitize
 * Explicitly declared for both '/' and '/menu-items' under the router
 */
router.post(
  '/',
  protect,
  isAdmin,
  sensitiveLimiter,
  uploadSingle('image'),
  mongoSanitizeMiddleware,
  createMenuItemValidation,
  validate,
  createMenuItem
);

router.post(
  '/menu-items',
  protect,
  isAdmin,
  sensitiveLimiter,
  uploadSingle('image'),
  mongoSanitizeMiddleware,
  createMenuItemValidation,
  validate,
  createMenuItem
);

// PUT endpoints
router.put(
  '/:id',
  protect,
  isAdmin,
  sensitiveLimiter,
  uploadSingle('image'),
  mongoSanitizeMiddleware,
  updateMenuItemValidation,
  validate,
  updateMenuItem
);

router.put(
  '/menu-items/:id',
  protect,
  isAdmin,
  sensitiveLimiter,
  uploadSingle('image'),
  mongoSanitizeMiddleware,
  updateMenuItemValidation,
  validate,
  updateMenuItem
);

// DELETE endpoints
router.delete(
  '/:id',
  protect,
  isAdmin,
  sensitiveLimiter,
  mongoSanitizeMiddleware,
  deleteMenuItemValidation,
  validate,
  deleteMenuItem
);

router.delete(
  '/menu-items/:id',
  protect,
  isAdmin,
  sensitiveLimiter,
  mongoSanitizeMiddleware,
  deleteMenuItemValidation,
  validate,
  deleteMenuItem
);

// Mount public menu browsing routes
router.use('/', menuRoutes);

module.exports = router;

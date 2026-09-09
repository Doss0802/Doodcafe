const express = require('express');
const { query, param } = require('express-validator');
const { getCategories, getMenuItems, getMenuItem } = require('../controllers/menu.controller');
const validate = require('../middleware/validate');

const router = express.Router();

const menuQueryValidation = [
  query('category')
    .optional()
    .trim()
    .isLength({ max: 50 })
    .matches(/^[a-zA-Z0-9-_]+$/)
    .withMessage('Category parameter contains invalid characters'),
  query('search')
    .optional()
    .trim()
    .isLength({ max: 80 })
    .withMessage('Search query cannot exceed 80 characters'),
  query('sort')
    .optional()
    .isIn(['popularity', 'price-asc', 'price-desc', 'name-asc', 'name-desc', 'rating'])
    .withMessage('Invalid sort parameter'),
  query('sortBy')
    .optional()
    .isIn(['popularity', 'price-asc', 'price-desc', 'name-asc', 'name-desc', 'rating'])
    .withMessage('Invalid sortBy parameter'),
  query('minPrice')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('minPrice must be a non-negative number'),
  query('maxPrice')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('maxPrice must be a non-negative number'),
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
];

const menuItemIdValidation = [
  param('id').isMongoId().withMessage('Invalid menu item ID format'),
];

// ─── GET /api/menu & GET /api/v1/menu (DSA-powered Trie Search, QuickSort, Filtering)
router.get('/', menuQueryValidation, validate, getMenuItems);
router.get('/categories', getCategories);
router.get('/items', menuQueryValidation, validate, getMenuItems);
router.get('/items/:id', menuItemIdValidation, validate, getMenuItem);

module.exports = router;

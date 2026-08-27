const express = require('express');
const { getCategories, getMenuItems, getMenuItem } = require('../controllers/menu.controller');

const router = express.Router();

// ─── GET /api/menu & GET /api/v1/menu (DSA-powered Trie Search, QuickSort, Filtering)
router.get('/', getMenuItems);
router.get('/categories', getCategories);
router.get('/items', getMenuItems);
router.get('/items/:id', getMenuItem);

module.exports = router;

const { Op } = require('sequelize');
const MenuItem = require('../models/MenuItem');
const Category = require('../models/Category');
const SiteSettings = require('../models/SiteSettings');
const ApiResponse = require('../utils/ApiResponse');
const { filterMenuItems, quickSortMenuItems, binarySearchPriceRange } = require('../utils/CatalogDSA');

// @desc   Get all active categories
// @route  GET /api/v1/menu/categories
// @access Public
const getCategories = async (req, res, next) => {
  try {
    const categories = await Category.findAll({
      where: { isActive: true },
      attributes: ['id', 'name', 'slug', 'icon', 'displayOrder'],
      order: [['displayOrder', 'ASC'], ['name', 'ASC']],
    });

    return ApiResponse.success(res, {
      statusCode: 200,
      data: categories.map((c) => c.toJSON()),
    });
  } catch (error) {
    next(error);
  }
};

// @desc   Get available menu items with Sequelize lookup & CatalogDSA (MenuTrie, QuickSort, Binary Search)
// @route  GET /api/v1/menu/items & GET /api/menu
// @access Public
const getMenuItems = async (req, res, next) => {
  try {
    const {
      category,
      search,
      bestseller,
      veg,
      sort,
      sortBy: sortByQuery,
      minPrice,
      maxPrice,
      page = 1,
      limit = 20,
    } = req.query;

    const sortBy = sort || sortByQuery || 'popularity';

    // Resolve category slug -> UUID via Sequelize
    let categoryId = null;
    if (category && category !== 'all') {
      const cat = await Category.findOne({
        where: { slug: category },
        attributes: ['id', 'slug'],
      });
      if (cat) categoryId = cat.id;
    }

    // Sequelize: Fetch all available items with their category association
    const rawRows = await MenuItem.findAll({
      where: { available: true },
      include: [
        {
          model: Category,
          as: 'category',
          attributes: ['id', 'name', 'slug', 'icon'],
        },
      ],
    });

    // Convert Sequelize instances to plain objects for in-memory DSA pipeline
    const rawItems = rawRows.map((item) => {
      const plain = item.toJSON();
      // Ensure _id alias is present for CatalogDSA Trie compatibility
      plain._id = plain.id;
      return plain;
    });

    // ── DSA STEP 1: Trie Search Tree & Criteria Filtering ─────────────────────
    const filteredItems = filterMenuItems(rawItems, {
      category: categoryId || (category && category !== 'all' ? category : null),
      veg,
      bestseller,
      available: true,
      minPrice,
      maxPrice,
      search,
    });

    // ── DSA STEP 2: Binary Search Price Boundary Range (if applicable) ─────────
    let rangeFiltered = filteredItems;
    if (minPrice !== undefined || maxPrice !== undefined) {
      rangeFiltered = binarySearchPriceRange(
        filteredItems,
        minPrice ? Number(minPrice) : 0,
        maxPrice ? Number(maxPrice) : Infinity
      );
    }

    // ── DSA STEP 3: QuickSort Multi-Attribute Algorithm (Median-of-Three) ─────
    const sortedItems = quickSortMenuItems(rangeFiltered, sortBy);

    // ── DSA STEP 4: Pagination Slice ───────────────────────────────────────────
    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit)));
    const total = sortedItems.length;
    const skip = (pageNum - 1) * limitNum;

    const paginatedItems = sortedItems.slice(skip, skip + limitNum);

    const paginationData = {
      total,
      page: pageNum,
      pages: Math.ceil(total / limitNum) || 1,
      limit: limitNum,
    };

    return ApiResponse.success(res, {
      statusCode: 200,
      data: paginatedItems,
      meta: {
        dsaEngine: {
          searchAlgorithm: search ? 'MenuTrie (Inverted Keyword Index)' : 'Direct Filter Scan',
          sortingAlgorithm: 'quickSortMenuItems (Median-of-Three QuickSort)',
          priceFilterAlgorithm: minPrice || maxPrice ? 'binarySearchPriceRange O(log N)' : 'None',
        },
        pagination: paginationData,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc   Get single menu item by ID
// @route  GET /api/v1/menu/items/:id
// @access Public
const getMenuItem = async (req, res, next) => {
  try {
    const item = await MenuItem.findByPk(req.params.id, {
      include: [
        {
          model: Category,
          as: 'category',
          attributes: ['id', 'name', 'slug', 'icon'],
        },
      ],
    });

    if (!item) {
      return ApiResponse.error(res, {
        statusCode: 404,
        message: 'Menu item not found',
      });
    }

    return ApiResponse.success(res, {
      statusCode: 200,
      data: item.toJSON(),
    });
  } catch (error) {
    next(error);
  }
};

// @desc   Get public-facing menu settings (e.g. price visibility flag)
// @route  GET /api/v1/menu/settings
// @access Public
const getMenuPublicSettings = async (req, res, next) => {
  try {
    const settings = await SiteSettings.getSettings();
    return ApiResponse.success(res, {
      statusCode: 200,
      data: { show_prices_to_public: settings.show_prices_to_public },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { getCategories, getMenuItems, getMenuItem, getMenuPublicSettings };

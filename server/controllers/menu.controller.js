const MenuItem = require('../models/MenuItem');
const Category = require('../models/Category');
const ApiResponse = require('../utils/ApiResponse');
const { filterMenuItems, quickSortMenuItems, binarySearchPriceRange } = require('../utils/CatalogDSA');

// @desc   Get all active categories
// @route  GET /api/v1/menu/categories
// @access Public
const getCategories = async (req, res, next) => {
  try {
    const categories = await Category.find({ isActive: true })
      .select('name slug icon displayOrder')
      .sort({ displayOrder: 1 })
      .lean();

    return ApiResponse.success(res, {
      statusCode: 200,
      data: categories,
    });
  } catch (error) {
    next(error);
  }
};

// @desc   Get available menu items with Mongoose lookup & CatalogDSA (MenuTrie, QuickSort, Binary Search)
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

    let categoryId = null;
    if (category && category !== 'all') {
      const cat = await Category.findOne({ slug: category }).select('_id').lean();
      if (cat) categoryId = cat._id.toString();
    }

    // ── MONGOOSE LOOKUP: Fetch available candidate items ──────────────────────
    const rawItems = await MenuItem.find({ available: true })
      .populate('category', 'name slug icon')
      .lean();

    // ── DSA STEP 1: Trie Search Tree & Criteria Filtering ─────────────────────
    const filteredItems = filterMenuItems(rawItems, {
      category: categoryId || (category !== 'all' ? category : null),
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
    const item = await MenuItem.findById(req.params.id)
      .populate('category', 'name slug icon')
      .lean();

    if (!item) {
      return ApiResponse.error(res, {
        statusCode: 404,
        message: 'Menu item not found',
      });
    }

    return ApiResponse.success(res, {
      statusCode: 200,
      data: item,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { getCategories, getMenuItems, getMenuItem };

const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const { MenuItem, Category } = require('../models');
const { protect, requireRole } = require('../middleware/auth');
const ApiResponse = require('../utils/ApiResponse');

// ─── Configure Multer for Image Uploads ────────────────────────────────────────
const uploadDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const cleanName = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9_-]/g, '_');
    cb(null, `menu-${Date.now()}-${cleanName}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    const allowed = /jpeg|jpg|png|webp|gif|svg/;
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.test(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Only image files (jpg, png, webp, gif, svg) are allowed'));
    }
  },
});

// Middleware: strictly protect and require admin role on all adminMenu routes
router.use(protect, requireRole('admin'));

// @desc   Upload an image asset for menu item
// @route  POST /upload-image
router.post('/upload-image', upload.single('image'), (req, res) => {
  if (!req.file) {
    return ApiResponse.error(res, {
      statusCode: 400,
      message: 'No image file uploaded',
    });
  }

  const imageUrl = `/uploads/${req.file.filename}`;
  return ApiResponse.success(res, {
    statusCode: 200,
    message: 'Image uploaded successfully',
    data: { imageUrl, filename: req.file.filename },
  });
});

// @desc   Get all categories for dropdown pickers
// @route  GET /categories
router.get('/categories', async (req, res, next) => {
  try {
    const categories = await Category.findAll({
      order: [['displayOrder', 'ASC'], ['name', 'ASC']],
    });
    return ApiResponse.success(res, {
      statusCode: 200,
      data: categories,
    });
  } catch (err) {
    next(err);
  }
});

// @desc   Get all menu items for admin pickers
// @route  GET /items
router.get('/items', async (req, res, next) => {
  try {
    const items = await MenuItem.findAll({
      include: [{ model: Category, as: 'category', attributes: ['id', 'name', 'slug', 'icon'] }],
      order: [['name', 'ASC']],
    });
    return ApiResponse.success(res, {
      statusCode: 200,
      data: items,
    });
  } catch (err) {
    next(err);
  }
});

// @desc   Add new menu item
// @route  POST /add-item
router.post('/add-item', upload.single('image'), async (req, res, next) => {
  try {
    const {
      name,
      price,
      description = '',
      categoryId,
      category: categoryParam,
      isVeg = false,
      available = true,
      preparationTime = 10,
    } = req.body;

    if (!name || name.trim() === '') {
      return ApiResponse.error(res, { statusCode: 400, message: 'Item Name is required' });
    }

    if (price === undefined || price === null || isNaN(parseFloat(price))) {
      return ApiResponse.error(res, { statusCode: 400, message: 'Valid Item Price is required' });
    }

    // Determine imageUrl: uploaded file takes precedence, else body imageUrl / image
    let imageUrl = req.body.imageUrl || req.body.image || '';
    if (req.file) {
      imageUrl = `/uploads/${req.file.filename}`;
    }

    // Resolve Category UUID
    let resolvedCategoryId = categoryId;
    if (!resolvedCategoryId && categoryParam) {
      // Find category by ID, slug, or name
      const cat = await Category.findOne({
        where: {
          [Category.sequelize.Sequelize.Op.or]: [
            { id: categoryParam },
            { slug: categoryParam.toLowerCase().trim() },
            { name: categoryParam.trim() },
          ],
        },
      });
      if (cat) resolvedCategoryId = cat.id;
    }

    // If still not resolved, fallback to the first active category in the database
    if (!resolvedCategoryId) {
      const defaultCat = await Category.findOne({ order: [['displayOrder', 'ASC']] });
      if (defaultCat) resolvedCategoryId = defaultCat.id;
    }

    if (!resolvedCategoryId) {
      return ApiResponse.error(res, { statusCode: 400, message: 'Valid Category is required' });
    }

    const newItem = await MenuItem.create({
      name: name.trim(),
      price: parseFloat(price),
      description: description.trim(),
      categoryId: resolvedCategoryId,
      imageUrl,
      image: imageUrl,
      isVeg: isVeg === true || isVeg === 'true' || isVeg === 1 || isVeg === '1',
      available: available === undefined ? true : available === true || available === 'true',
      preparationTime: parseInt(preparationTime) || 10,
    });

    const itemWithCat = await MenuItem.findByPk(newItem.id, {
      include: [{ model: Category, as: 'category' }],
    });

    return ApiResponse.success(res, {
      statusCode: 201,
      message: `Dish "${newItem.name}" added successfully`,
      data: itemWithCat,
    });
  } catch (err) {
    next(err);
  }
});

// @desc   Add new dynamic category into categories table
// @route  POST /add-category
router.post('/add-category', async (req, res, next) => {
  try {
    const { name, icon = '🍽️' } = req.body;

    if (!name || name.trim() === '') {
      return ApiResponse.error(res, { statusCode: 400, message: 'Category Name is required' });
    }

    const trimmedName = name.trim();
    const existing = await Category.findOne({
      where: {
        name: trimmedName,
      },
    });

    if (existing) {
      return ApiResponse.error(res, {
        statusCode: 409,
        message: `Category "${trimmedName}" already exists.`,
        data: existing,
      });
    }

    const maxOrder = (await Category.max('displayOrder')) || 0;
    const slug = trimmedName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

    const newCategory = await Category.create({
      name: trimmedName,
      icon: icon.trim() || '🍽️',
      slug,
      displayOrder: maxOrder + 1,
      isActive: true,
    });

    return ApiResponse.success(res, {
      statusCode: 201,
      message: `New Category "${newCategory.name}" seeded successfully!`,
      data: newCategory,
    });
  } catch (err) {
    next(err);
  }
});

// @desc   Update existing menu item
// @route  PUT /update-item/:id
router.put('/update-item/:id', upload.single('image'), async (req, res, next) => {
  try {
    const { id } = req.params;
    const item = await MenuItem.findByPk(id);

    if (!item) {
      return ApiResponse.error(res, {
        statusCode: 404,
        message: `Menu item #${id} not found`,
      });
    }

    const {
      name,
      price,
      description,
      categoryId,
      category: categoryParam,
      isVeg,
      available,
      preparationTime,
    } = req.body;

    const updateData = {};

    if (name !== undefined && name.trim() !== '') updateData.name = name.trim();
    if (price !== undefined && !isNaN(parseFloat(price))) updateData.price = parseFloat(price);
    if (description !== undefined) updateData.description = description.trim();
    if (isVeg !== undefined) updateData.isVeg = isVeg === true || isVeg === 'true' || isVeg === 1 || isVeg === '1';
    if (available !== undefined) updateData.available = available === true || available === 'true';
    if (preparationTime !== undefined && !isNaN(parseInt(preparationTime))) {
      updateData.preparationTime = parseInt(preparationTime);
    }

    // Image override logic
    if (req.file) {
      const newImageUrl = `/uploads/${req.file.filename}`;
      updateData.imageUrl = newImageUrl;
      updateData.image = newImageUrl;
    } else if (req.body.imageUrl || req.body.image) {
      const manualUrl = req.body.imageUrl || req.body.image;
      updateData.imageUrl = manualUrl;
      updateData.image = manualUrl;
    }

    // Category resolution
    if (categoryId) {
      updateData.categoryId = categoryId;
    } else if (categoryParam) {
      const cat = await Category.findOne({
        where: {
          [Category.sequelize.Sequelize.Op.or]: [
            { id: categoryParam },
            { slug: categoryParam.toLowerCase().trim() },
            { name: categoryParam.trim() },
          ],
        },
      });
      if (cat) updateData.categoryId = cat.id;
    }

    // Execute strict update query block
    await item.update(updateData);

    const reloaded = await MenuItem.findByPk(id, {
      include: [{ model: Category, as: 'category' }],
    });

    return ApiResponse.success(res, {
      statusCode: 200,
      message: `Dish "${reloaded.name}" updated successfully`,
      data: reloaded,
    });
  } catch (err) {
    next(err);
  }
});

// @desc   Safely purge dish from menu_items table
// @route  DELETE /remove-item/:id
router.delete('/remove-item/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const item = await MenuItem.findByPk(id);

    if (!item) {
      return ApiResponse.error(res, {
        statusCode: 404,
        message: `Dish with ID "${id}" not found or already deleted`,
      });
    }

    const itemName = item.name;
    await item.destroy();

    return ApiResponse.success(res, {
      statusCode: 200,
      message: `Dish "${itemName}" permanently removed from menu`,
      data: { id, name: itemName },
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;

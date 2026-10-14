const { Op } = require('sequelize');
const Order = require('../models/Order');
const MenuItem = require('../models/MenuItem');
const SiteSettings = require('../models/SiteSettings');
const User = require('../models/User');
const ApiResponse = require('../utils/ApiResponse');
const { emitOrderStatusUpdate } = require('./admin.socket');

/**
 * ─── 1. Comprehensive Revenue & Profit/Loss Trends (Daily, Weekly, Monthly) ───
 */
const getDashboardTrends = async (req, res, next) => {
  try {
    const { period = 'daily' } = req.query;
    const now = new Date();

    let startDate;
    if (period === 'weekly') {
      startDate = new Date(now);
      startDate.setDate(startDate.getDate() - 56);
      startDate.setHours(0, 0, 0, 0);
    } else if (period === 'monthly') {
      startDate = new Date(now.getFullYear(), now.getMonth() - 11, 1);
    } else {
      startDate = new Date(now);
      startDate.setDate(startDate.getDate() - 13);
      startDate.setHours(0, 0, 0, 0);
    }

    const orders = await Order.findAll({
      where: {
        createdAt: { [Op.gte]: startDate },
        status: { [Op.ne]: 'cancelled' },
      },
      order: [['createdAt', 'ASC']],
    });

    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const groups = {};

    for (const ord of orders) {
      const d = new Date(ord.createdAt);
      let key;
      if (period === 'weekly') {
        const startOfYear = new Date(d.getFullYear(), 0, 1);
        const pastDays = Math.floor((d - startOfYear) / (24 * 60 * 60 * 1000));
        const weekNum = Math.ceil((pastDays + startOfYear.getDay() + 1) / 7);
        key = `Wk ${weekNum}, ${d.getFullYear()}`;
      } else if (period === 'monthly') {
        key = `${monthNames[d.getMonth()]} ${d.getFullYear()}`;
      } else {
        key = `${d.getDate()} ${monthNames[d.getMonth()]}`;
      }

      if (!groups[key]) {
        groups[key] = { label: key, revenue: 0, orderCount: 0 };
      }
      groups[key].revenue += Number(ord.totalAmount || 0);
      groups[key].orderCount += 1;
    }

    const COGS_RATE = 0.38;
    const dataPoints = Object.values(groups).map((item) => {
      const revenue = Math.round(item.revenue || 0);
      const estimatedCost = Math.round(revenue * COGS_RATE);
      const grossProfit = revenue - estimatedCost;
      const avgOrderValue = item.orderCount > 0 ? Math.round(revenue / item.orderCount) : 0;
      return {
        label: item.label,
        revenue,
        cost: estimatedCost,
        profit: grossProfit,
        orders: item.orderCount,
        aov: avgOrderValue,
      };
    });

    const totalPeriodRevenue = dataPoints.reduce((s, p) => s + p.revenue, 0);
    const totalPeriodProfit = dataPoints.reduce((s, p) => s + p.profit, 0);
    const totalPeriodOrders = dataPoints.reduce((s, p) => s + p.orders, 0);

    return ApiResponse.success(res, {
      statusCode: 200,
      data: {
        period,
        summary: {
          totalRevenue: totalPeriodRevenue,
          totalProfit: totalPeriodProfit,
          totalOrders: totalPeriodOrders,
        },
        points: dataPoints,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * ─── 2. Top-Selling & Most Sold Menu Items ────────────────────────────────────
 */
const getTopSellingItems = async (req, res, next) => {
  try {
    const { limit = 8 } = req.query;
    const limitNum = parseInt(limit) || 8;

    const orders = await Order.findAll({
      where: { status: { [Op.ne]: 'cancelled' } },
      attributes: ['items'],
    });

    const itemMap = {};
    for (const ord of orders) {
      let items = ord.items;
      if (typeof items === 'string') {
        try { items = JSON.parse(items); } catch { items = []; }
      }
      if (Array.isArray(items)) {
        for (const it of items) {
          const name = it.name || 'Unnamed Dish';
          const qty = Number(it.quantity) || 1;
          const price = Number(it.price) || 0;
          if (!itemMap[name]) {
            itemMap[name] = { name, totalQuantity: 0, totalRevenue: 0, prices: [], ordersCount: 0 };
          }
          itemMap[name].totalQuantity += qty;
          itemMap[name].totalRevenue += price * qty;
          itemMap[name].prices.push(price);
          itemMap[name].ordersCount += 1;
        }
      }
    }

    const sortedItems = Object.values(itemMap)
      .sort((a, b) => b.totalQuantity - a.totalQuantity || b.totalRevenue - a.totalRevenue)
      .slice(0, limitNum);
    const maxSold = sortedItems.length > 0 ? Math.max(...sortedItems.map((i) => i.totalQuantity)) : 1;

    const formatted = sortedItems.map((item, index) => {
      const avgPrice = item.prices.length > 0 ? item.prices.reduce((a, b) => a + b, 0) / item.prices.length : 0;
      return {
        rank: index + 1,
        name: item.name,
        quantitySold: item.totalQuantity,
        totalRevenue: Math.round(item.totalRevenue),
        averagePrice: Math.round(avgPrice),
        ordersCount: item.ordersCount,
        popularityPercent: Math.round((item.totalQuantity / maxSold) * 100),
      };
    });

    return ApiResponse.success(res, {
      statusCode: 200,
      data: formatted,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * ─── 3. Live & Recent Orders Stream ───────────────────────────────────────────
 */
const getLiveOrders = async (req, res, next) => {
  try {
    const { status, page = 1, limit = 50 } = req.query;
    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit)));
    const offset = (pageNum - 1) * limitNum;

    const where = {};
    if (status && status !== 'all') {
      where.status = status;
    }

    const { count: total, rows: orders } = await Order.findAndCountAll({
      where,
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'name', 'email', 'phone'],
        },
      ],
      order: [['createdAt', 'DESC']],
      limit: limitNum,
      offset,
    });

    return ApiResponse.success(res, {
      statusCode: 200,
      data: orders,
      meta: {
        total,
        page: pageNum,
        pages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * ─── 4. Update Order Status & Broadcast Live Sync ─────────────────────────────
 */
const updateOrderStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const validStatuses = ['pending', 'confirmed', 'preparing', 'ready', 'delivered', 'cancelled'];
    if (!status || !validStatuses.includes(status)) {
      return ApiResponse.error(res, {
        statusCode: 400,
        message: `Invalid status. Must be one of: ${validStatuses.join(', ')}`,
      });
    }

    const order = await Order.findByPk(id, {
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'name', 'email', 'phone'],
        },
      ],
    });

    if (!order) {
      return ApiResponse.error(res, {
        statusCode: 404,
        message: 'Order not found',
      });
    }

    order.status = status;
    await order.save();

    const orderJson = order.toJSON();
    // Broadcast update to all connected Socket.io clients in real time
    emitOrderStatusUpdate(orderJson);
    if (req.io) {
      req.io.emit('orderStatusUpdated', orderJson);
    }

    return ApiResponse.success(res, {
      statusCode: 200,
      message: `Order status updated to "${status}"`,
      data: orderJson,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * ─── 5. Top-level Overview KPIs (Daily, Weekly, Monthly & Lifetime Aggregations) ───
 */
const getOverviewKPIs = async (req, res, next) => {
  try {
    const now = new Date();

    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);

    const weekStart = new Date(now);
    weekStart.setDate(weekStart.getDate() - 7);
    weekStart.setHours(0, 0, 0, 0);

    const monthStart = new Date(now);
    monthStart.setDate(monthStart.getDate() - 30);
    monthStart.setHours(0, 0, 0, 0);

    const [
      todayOrders,
      weekOrders,
      monthOrders,
      allOrders,
      totalOrdersCount,
      totalCustomers,
      totalMenuItems,
    ] = await Promise.all([
      Order.findAll({
        where: { createdAt: { [Op.gte]: todayStart }, status: { [Op.ne]: 'cancelled' } },
        attributes: ['totalAmount'],
      }),
      Order.findAll({
        where: { createdAt: { [Op.gte]: weekStart }, status: { [Op.ne]: 'cancelled' } },
        attributes: ['totalAmount'],
      }),
      Order.findAll({
        where: { createdAt: { [Op.gte]: monthStart }, status: { [Op.ne]: 'cancelled' } },
        attributes: ['totalAmount'],
      }),
      Order.findAll({
        where: { status: { [Op.ne]: 'cancelled' } },
        attributes: ['totalAmount'],
      }),
      Order.count(),
      User.count({ where: { role: 'customer' } }),
      MenuItem.count({ where: { available: true } }),
    ]);

    const todaySales = todayOrders.reduce((sum, o) => sum + Number(o.totalAmount || 0), 0);
    const todayOrdersCount = todayOrders.length;

    const weeklySales = weekOrders.reduce((sum, o) => sum + Number(o.totalAmount || 0), 0);
    const weeklyOrdersCount = weekOrders.length;

    const monthlySales = monthOrders.reduce((sum, o) => sum + Number(o.totalAmount || 0), 0);
    const monthlyOrdersCount = monthOrders.length;

    const totalRevenue = allOrders.reduce((sum, o) => sum + Number(o.totalAmount || 0), 0);

    return ApiResponse.success(res, {
      statusCode: 200,
      data: {
        todaySales: Math.round(todaySales),
        todayOrdersCount,
        weeklySales: Math.round(weeklySales),
        weeklyOrdersCount,
        monthlySales: Math.round(monthlySales),
        monthlyOrdersCount,
        totalRevenue: Math.round(totalRevenue),
        totalOrders: totalOrdersCount,
        totalCustomers,
        totalMenuItems,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * ─── 6. Get Global Menu Settings (Price Visibility Toggle) ────────────────────
 * @route GET /api/v1/admin/menu-settings
 * @access Admin
 */
const getMenuSettings = async (req, res, next) => {
  try {
    const settings = await SiteSettings.getSettings();
    return ApiResponse.success(res, {
      statusCode: 200,
      data: {
        show_prices_to_public: settings.show_prices_to_public,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * ─── 7. Update Global Menu Settings (Price Visibility Toggle) ─────────────────
 * @route PATCH /api/v1/admin/menu-settings
 * @access Admin
 */
const updateMenuSettings = async (req, res, next) => {
  try {
    const { show_prices_to_public } = req.body;

    if (typeof show_prices_to_public !== 'boolean') {
      return ApiResponse.error(res, {
        statusCode: 400,
        message: 'show_prices_to_public must be a boolean value (true or false)',
      });
    }

    const settings = await SiteSettings.getSettings();
    settings.show_prices_to_public = show_prices_to_public;
    await settings.save();

    return ApiResponse.success(res, {
      statusCode: 200,
      message: `Price display ${show_prices_to_public ? 'enabled' : 'hidden'} for customers`,
      data: { show_prices_to_public: settings.show_prices_to_public },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * ─── 8. Get All Menu Items for Admin Manager View ─────────────────────────────
 * @route GET /api/v1/admin/menu-items
 * @access Admin
 */
const getMenuManagerItems = async (req, res, next) => {
  try {
    const { page = 1, limit = 50, category } = req.query;
    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit)));
    const offset = (pageNum - 1) * limitNum;

    const where = {};
    if (category && category !== 'all') {
      const Category = require('../models/Category');
      const cat = await Category.findOne({ where: { slug: category } });
      if (cat) where.categoryId = cat.id;
    }

    const { count: total, rows: items } = await MenuItem.findAndCountAll({
      where,
      include: [
        {
          association: 'category',
          attributes: ['id', 'name', 'slug', 'icon'],
          required: false,
        },
      ],
      order: [['createdAt', 'DESC']],
      limit: limitNum,
      offset,
    });

    return ApiResponse.success(res, {
      statusCode: 200,
      data: items,
      meta: {
        total,
        page: pageNum,
        pages: Math.ceil(total / limitNum),
        limit: limitNum,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * ─── 9. Inline Update Menu Item (Price + Image) ────────────────────────────────
 * @route PATCH /api/v1/admin/menu-items/:id
 * @access Admin
 */
const updateMenuItemAdmin = async (req, res, next) => {
  try {
    const { id } = req.params;

    const ALLOWED_FIELDS = ['price', 'imageUrl', 'image', 'name', 'description', 'available', 'isBestseller', 'isVeg', 'preparationTime', 'tags', 'show_prices_to_public'];
    const updateData = {};

    for (const field of ALLOWED_FIELDS) {
      if (req.body[field] !== undefined) {
        updateData[field] = req.body[field];
      }
    }

    if (Object.keys(updateData).length === 0) {
      return ApiResponse.error(res, {
        statusCode: 400,
        message: 'No valid fields provided for update',
      });
    }

    if (updateData.price !== undefined) {
      const price = Number(updateData.price);
      if (isNaN(price) || price < 0) {
        return ApiResponse.error(res, {
          statusCode: 400,
          message: 'Price must be a non-negative number',
        });
      }
      updateData.price = price;
    }

    const item = await MenuItem.findByPk(id, {
      include: [{ association: 'category', attributes: ['id', 'name', 'slug', 'icon'], required: false }],
    });

    if (!item) {
      return ApiResponse.error(res, {
        statusCode: 404,
        message: 'Menu item not found',
      });
    }

    Object.assign(item, updateData);
    await item.save();

    return ApiResponse.success(res, {
      statusCode: 200,
      message: 'Menu item updated successfully',
      data: item,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getDashboardTrends,
  getTopSellingItems,
  getLiveOrders,
  updateOrderStatus,
  getOverviewKPIs,
  getMenuSettings,
  updateMenuSettings,
  getMenuManagerItems,
  updateMenuItemAdmin,
};

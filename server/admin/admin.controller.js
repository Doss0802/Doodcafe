const Order = require('../models/Order');
const MenuItem = require('../models/MenuItem');
const User = require('../models/User');
const ApiResponse = require('../utils/ApiResponse');
const { emitOrderStatusUpdate } = require('./admin.socket');

/**
 * ─── 1. Comprehensive Revenue & Profit/Loss Trends (Daily, Weekly, Monthly) ───
 */
/**
 * ─── 1. Comprehensive Revenue & Profit/Loss Trends (Daily, Weekly, Monthly) ───
 */
const getDashboardTrends = async (req, res, next) => {
  try {
    const { period = 'daily' } = req.query;
    const now = new Date();

    let startDate;
    let groupFormat;
    let dateProject;

    if (period === 'weekly') {
      // Last 8 weeks
      startDate = new Date(now);
      startDate.setDate(startDate.getDate() - 56);
      groupFormat = {
        year: { $isoWeekYear: '$createdAt' },
        week: { $isoWeek: '$createdAt' },
      };
      dateProject = (doc) => `Wk ${doc._id.week}, ${doc._id.year}`;
    } else if (period === 'monthly') {
      // Last 12 months
      startDate = new Date(now.getFullYear(), now.getMonth() - 11, 1);
      groupFormat = {
        year: { $year: '$createdAt' },
        month: { $month: '$createdAt' },
      };
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      dateProject = (doc) => `${monthNames[doc._id.month - 1]} ${doc._id.year}`;
    } else {
      // Daily: Last 14 days
      startDate = new Date(now);
      startDate.setDate(startDate.getDate() - 13);
      startDate.setHours(0, 0, 0, 0);
      groupFormat = {
        year: { $year: '$createdAt' },
        month: { $month: '$createdAt' },
        day: { $dayOfMonth: '$createdAt' },
      };
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      dateProject = (doc) => `${doc._id.day} ${monthNames[doc._id.month - 1]}`;
    }

    const trendsAgg = await Order.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate },
          status: { $ne: 'cancelled' },
        },
      },
      {
        $group: {
          _id: groupFormat,
          revenue: { $sum: '$totalAmount' },
          orderCount: { $sum: 1 },
          firstOrderDate: { $min: '$createdAt' },
        },
      },
      { $sort: { firstOrderDate: 1 } },
    ]);

    // Estimated Cost of Goods Sold (COGS) at 38% for Cafe F&B margins
    const COGS_RATE = 0.38;

    const dataPoints = trendsAgg.map((item) => {
      const revenue = Math.round(item.revenue || 0);
      const estimatedCost = Math.round(revenue * COGS_RATE);
      const grossProfit = revenue - estimatedCost;
      const avgOrderValue = item.orderCount > 0 ? Math.round(revenue / item.orderCount) : 0;

      return {
        label: dateProject(item),
        revenue,
        cost: estimatedCost,
        profit: grossProfit,
        orders: item.orderCount,
        aov: avgOrderValue,
      };
    });

    // Summary aggregates
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

    const topItems = await Order.aggregate([
      { $match: { status: { $ne: 'cancelled' } } },
      { $unwind: '$items' },
      {
        $group: {
          _id: '$items.name',
          totalQuantity: { $sum: '$items.quantity' },
          totalRevenue: { $sum: { $multiply: ['$items.price', '$items.quantity'] } },
          averagePrice: { $avg: '$items.price' },
          ordersCount: { $sum: 1 },
        },
      },
      { $sort: { totalQuantity: -1, totalRevenue: -1 } },
      { $limit: parseInt(limit) || 8 },
    ]);

    const maxSold = topItems.length > 0 ? Math.max(...topItems.map((i) => i.totalQuantity)) : 1;

    const formatted = topItems.map((item, index) => ({
      rank: index + 1,
      name: item._id,
      quantitySold: item.totalQuantity,
      totalRevenue: Math.round(item.totalRevenue),
      averagePrice: Math.round(item.averagePrice),
      ordersCount: item.ordersCount,
      popularityPercent: Math.round((item.totalQuantity / maxSold) * 100),
    }));

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
    const skip = (pageNum - 1) * limitNum;

    const filter = {};
    if (status && status !== 'all') {
      filter.status = status;
    }

    const [orders, total] = await Promise.all([
      Order.find(filter)
        .populate('user', 'name email phone')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Order.countDocuments(filter),
    ]);

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

    const order = await Order.findByIdAndUpdate(
      id,
      { status },
      { new: true, runValidators: true }
    ).populate('user', 'name email phone');

    if (!order) {
      return ApiResponse.error(res, {
        statusCode: 404,
        message: 'Order not found',
      });
    }

    // Broadcast update to all connected Socket.io clients in real time
    emitOrderStatusUpdate(order);

    return ApiResponse.success(res, {
      statusCode: 200,
      message: `Order status updated to "${status}"`,
      data: order,
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

    // 1. Daily: Today from 00:00:00
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);

    // 2. Weekly: Past 7 days
    const weekStart = new Date(now);
    weekStart.setDate(weekStart.getDate() - 7);
    weekStart.setHours(0, 0, 0, 0);

    // 3. Monthly: Past 30 days
    const monthStart = new Date(now);
    monthStart.setDate(monthStart.getDate() - 30);
    monthStart.setHours(0, 0, 0, 0);

    const [
      todayAgg,
      weekAgg,
      monthAgg,
      totalRevenueAgg,
      totalOrdersCount,
      totalCustomers,
      totalMenuItems,
    ] = await Promise.all([
      // Daily
      Order.aggregate([
        { $match: { createdAt: { $gte: todayStart }, status: { $ne: 'cancelled' } } },
        { $group: { _id: null, revenue: { $sum: '$totalAmount' }, count: { $sum: 1 } } },
      ]),
      // Weekly (7 days)
      Order.aggregate([
        { $match: { createdAt: { $gte: weekStart }, status: { $ne: 'cancelled' } } },
        { $group: { _id: null, revenue: { $sum: '$totalAmount' }, count: { $sum: 1 } } },
      ]),
      // Monthly (30 days)
      Order.aggregate([
        { $match: { createdAt: { $gte: monthStart }, status: { $ne: 'cancelled' } } },
        { $group: { _id: null, revenue: { $sum: '$totalAmount' }, count: { $sum: 1 } } },
      ]),
      // All-Time
      Order.aggregate([
        { $match: { status: { $ne: 'cancelled' } } },
        { $group: { _id: null, total: { $sum: '$totalAmount' } } },
      ]),
      Order.countDocuments(),
      User.countDocuments({ role: 'customer' }),
      MenuItem.countDocuments({ available: true }),
    ]);

    const todaySales = todayAgg[0]?.revenue || 0;
    const todayOrdersCount = todayAgg[0]?.count || 0;

    const weeklySales = weekAgg[0]?.revenue || 0;
    const weeklyOrdersCount = weekAgg[0]?.count || 0;

    const monthlySales = monthAgg[0]?.revenue || 0;
    const monthlyOrdersCount = monthAgg[0]?.count || 0;

    const totalRevenue = totalRevenueAgg[0]?.total || 0;

    return ApiResponse.success(res, {
      statusCode: 200,
      data: {
        todaySales,
        todayOrdersCount,
        weeklySales,
        weeklyOrdersCount,
        monthlySales,
        monthlyOrdersCount,
        totalRevenue,
        totalOrders: totalOrdersCount,
        totalCustomers,
        totalMenuItems,
      },
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
};

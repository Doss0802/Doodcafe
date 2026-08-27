const Order = require('../../server/models/Order');
const MenuItem = require('../../server/models/MenuItem');
const User = require('../../server/models/User');

/**
 * Admin Service: Direct MongoDB Database Query & Aggregation Engine
 * Performs high-performance aggregations on the customer orders collection.
 */

/**
 * 1. Overview KPIs (Daily, Weekly, Monthly & Lifetime Aggregations)
 */
const getOverviewMetrics = async () => {
  const now = new Date();

  // Daily: Today from 00:00:00
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);

  // Weekly: Past 7 days
  const weekStart = new Date(now);
  weekStart.setDate(weekStart.getDate() - 7);
  weekStart.setHours(0, 0, 0, 0);

  // Monthly: Past 30 days
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
    // Daily (Today)
    Order.aggregate([
      { $match: { createdAt: { $gte: todayStart }, status: { $ne: 'cancelled' } } },
      { $group: { _id: null, revenue: { $sum: '$totalAmount' }, count: { $sum: 1 } } },
    ]),
    // Weekly (Past 7 Days)
    Order.aggregate([
      { $match: { createdAt: { $gte: weekStart }, status: { $ne: 'cancelled' } } },
      { $group: { _id: null, revenue: { $sum: '$totalAmount' }, count: { $sum: 1 } } },
    ]),
    // Monthly (Past 30 Days)
    Order.aggregate([
      { $match: { createdAt: { $gte: monthStart }, status: { $ne: 'cancelled' } } },
      { $group: { _id: null, revenue: { $sum: '$totalAmount' }, count: { $sum: 1 } } },
    ]),
    // All-time Total Revenue
    Order.aggregate([
      { $match: { status: { $ne: 'cancelled' } } },
      { $group: { _id: null, total: { $sum: '$totalAmount' } } },
    ]),
    Order.countDocuments(),
    User.countDocuments({ role: 'customer' }),
    MenuItem.countDocuments({ available: true }),
  ]);

  return {
    todaySales: todayAgg[0]?.revenue || 0,
    todayOrdersCount: todayAgg[0]?.count || 0,
    weeklySales: weekAgg[0]?.revenue || 0,
    weeklyOrdersCount: weekAgg[0]?.count || 0,
    monthlySales: monthAgg[0]?.revenue || 0,
    monthlyOrdersCount: monthAgg[0]?.count || 0,
    totalRevenue: totalRevenueAgg[0]?.total || 0,
    totalOrders: totalOrdersCount,
    totalCustomers,
    totalMenuItems,
  };
};

/**
 * 2. Revenue & Profit/Loss Trends (Daily, Weekly, Monthly)
 */
const getRevenueTrends = async (period = 'daily') => {
  const now = new Date();
  let startDate;
  let groupFormat;
  let dateProject;

  if (period === 'weekly') {
    // Past 8 weeks
    startDate = new Date(now);
    startDate.setDate(startDate.getDate() - 56);
    groupFormat = {
      year: { $isoWeekYear: '$createdAt' },
      week: { $isoWeek: '$createdAt' },
    };
    dateProject = (doc) => `Wk ${doc._id.week}, ${doc._id.year}`;
  } else if (period === 'monthly') {
    // Past 12 months
    startDate = new Date(now.getFullYear(), now.getMonth() - 11, 1);
    groupFormat = {
      year: { $year: '$createdAt' },
      month: { $month: '$createdAt' },
    };
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    dateProject = (doc) => `${monthNames[doc._id.month - 1]} ${doc._id.year}`;
  } else {
    // Daily: Past 14 days
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

  // F&B benchmark: 38% COGS, 62% Gross Margin
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

  const totalPeriodRevenue = dataPoints.reduce((s, p) => s + p.revenue, 0);
  const totalPeriodProfit = dataPoints.reduce((s, p) => s + p.profit, 0);
  const totalPeriodOrders = dataPoints.reduce((s, p) => s + p.orders, 0);

  return {
    period,
    summary: {
      totalRevenue: totalPeriodRevenue,
      totalProfit: totalPeriodProfit,
      totalOrders: totalPeriodOrders,
    },
    points: dataPoints,
  };
};

/**
 * 3. Top-Selling Menu Dishes
 */
const getTopSellingDishes = async (limit = 8) => {
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

  return topItems.map((item, index) => ({
    rank: index + 1,
    name: item._id,
    quantitySold: item.totalQuantity,
    totalRevenue: Math.round(item.totalRevenue),
    averagePrice: Math.round(item.averagePrice),
    ordersCount: item.ordersCount,
    popularityPercent: Math.round((item.totalQuantity / maxSold) * 100),
  }));
};

/**
 * 4. Customer Orders Stream
 */
const getOrdersStream = async ({ status, page = 1, limit = 50 }) => {
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

  return {
    orders,
    meta: {
      total,
      page: pageNum,
      pages: Math.ceil(total / limitNum),
    },
  };
};

/**
 * 5. Update Order Status
 */
const updateOrderStatus = async (orderId, newStatus) => {
  return await Order.findByIdAndUpdate(
    orderId,
    { status: newStatus },
    { new: true, runValidators: true }
  ).populate('user', 'name email phone');
};

module.exports = {
  getOverviewMetrics,
  getRevenueTrends,
  getTopSellingDishes,
  getOrdersStream,
  updateOrderStatus,
};

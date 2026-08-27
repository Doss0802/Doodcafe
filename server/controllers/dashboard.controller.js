const Finance = require('../models/Finance');
const Inventory = require('../models/Inventory');
const Order = require('../models/Order');
const User = require('../models/User');
const MenuItem = require('../models/MenuItem');
const ApiResponse = require('../utils/ApiResponse');
const {
  PrefixSumDateIndex,
  MultiKeyFilterIndex,
  InventoryAlertTracker,
} = require('../utils/FinanceDSA');

/**
 * ─── HELPER: Build date boundaries ───────────────────────────────────────────
 */
const getDateBounds = (period) => {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  switch (period) {
    case 'today':
      return { start: today, end: now };
    case 'week': {
      const weekAgo = new Date(today);
      weekAgo.setDate(weekAgo.getDate() - 7);
      return { start: weekAgo, end: now };
    }
    case 'month': {
      const monthAgo = new Date(today);
      monthAgo.setMonth(monthAgo.getMonth() - 1);
      return { start: monthAgo, end: now };
    }
    case 'quarter': {
      const quarterAgo = new Date(today);
      quarterAgo.setMonth(quarterAgo.getMonth() - 3);
      return { start: quarterAgo, end: now };
    }
    case 'year': {
      const yearAgo = new Date(today);
      yearAgo.setFullYear(yearAgo.getFullYear() - 1);
      return { start: yearAgo, end: now };
    }
    case 'all':
    default:
      return { start: new Date(0), end: now };
  }
};

// @desc   Get comprehensive admin dashboard analytics using DSA structures
// @route  GET /api/v1/admin/dashboard/analytics
// @access Admin
const getDashboardAnalytics = async (req, res, next) => {
  try {
    const { period = 'month' } = req.query;
    const { start, end } = getDateBounds(period);

    // Parallel fetch: finances, inventory, orders, users, menu items
    const [
      allFinances,
      inventoryItems,
      totalOrders,
      todayOrders,
      pendingOrders,
      totalRevenueAgg,
      totalUsers,
      totalMenuItems,
    ] = await Promise.all([
      Finance.find({
        status: { $ne: 'cancelled' },
        transactionDate: { $gte: start, $lte: end },
      }).lean(),
      Inventory.find({ isActive: true }).lean(),
      Order.countDocuments(),
      Order.countDocuments({ createdAt: { $gte: new Date(new Date().setHours(0, 0, 0, 0)) } }),
      Order.countDocuments({ status: { $in: ['pending', 'confirmed', 'preparing'] } }),
      Order.aggregate([
        { $match: { status: { $ne: 'cancelled' } } },
        { $group: { _id: null, total: { $sum: '$totalAmount' } } },
      ]),
      User.countDocuments({ role: 'customer' }),
      MenuItem.countDocuments({ available: true }),
    ]);

    // ─── Build DSA Structures in O(N) ───────────────────────────────────────
    const prefixIndex = new PrefixSumDateIndex(allFinances);
    const filterIndex = new MultiKeyFilterIndex(allFinances);
    const alertTracker = new InventoryAlertTracker(inventoryItems);

    // ─── O(1) Range Query via Prefix-Sum ────────────────────────────────────
    const periodTotals = prefixIndex.queryRange(start, end);
    const dailyBreakdown = prefixIndex.getDailyBreakdown(start, end);

    // ─── O(C) Category Breakdowns ───────────────────────────────────────────
    const incomeBreakdown = filterIndex.getCategoryBreakdown('income');
    const expenseBreakdown = filterIndex.getCategoryBreakdown('expense');

    // ─── O(1) Inventory Alerts ──────────────────────────────────────────────
    const inventorySummary = alertTracker.getSummary();
    const inventoryAlerts = alertTracker.getAlerts();
    const inventoryCategoryBreakdown = alertTracker.getCategoryBreakdown();

    return ApiResponse.success(res, {
      statusCode: 200,
      message: `Dashboard analytics computed via Prefix-Sum + Multi-Key Hash DSA (period: ${period})`,
      data: {
        // Overview cards
        overview: {
          totalIncome: periodTotals.income,
          totalExpenses: periodTotals.expense,
          netProfit: periodTotals.netProfit,
          totalOrders,
          todayOrders,
          pendingOrders,
          totalRevenue: totalRevenueAgg[0]?.total || 0,
          totalUsers,
          totalMenuItems,
        },
        // Financial analytics
        finance: {
          period,
          periodTotals,
          dailyBreakdown,
          incomeBreakdown,
          expenseBreakdown,
          totalTransactions: allFinances.length,
        },
        // Inventory analytics
        inventory: {
          summary: inventorySummary,
          alerts: inventoryAlerts,
          categoryBreakdown: inventoryCategoryBreakdown,
        },
        // DSA metadata for transparency
        dsa: {
          algorithm: 'PrefixSumDateIndex + MultiKeyFilterIndex + InventoryAlertTracker',
          complexities: {
            prefixSumBuild: 'O(N)',
            rangeQuery: 'O(1) via prefix[end] - prefix[start-1]',
            multiKeyLookup: 'O(1) hash access',
            inventoryAlerts: 'O(1) precomputed threshold check',
          },
          transactionsProcessed: allFinances.length,
          inventoryItemsProcessed: inventoryItems.length,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc   Get detailed finance transactions with multi-key filtering
// @route  GET /api/v1/admin/dashboard/finances
// @access Admin
const getFinanceDetails = async (req, res, next) => {
  try {
    const {
      type,
      category,
      period = 'month',
      page = 1,
      limit = 50,
      minAmount,
      maxAmount,
    } = req.query;

    const { start, end } = getDateBounds(period);
    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit)));

    // Build filter
    const filter = { status: { $ne: 'cancelled' }, transactionDate: { $gte: start, $lte: end } };
    if (type) filter.type = type;
    if (category) filter.category = category;
    if (minAmount || maxAmount) {
      filter.amount = {};
      if (minAmount) filter.amount.$gte = Number(minAmount);
      if (maxAmount) filter.amount.$lte = Number(maxAmount);
    }

    const skip = (pageNum - 1) * limitNum;

    const [transactions, total] = await Promise.all([
      Finance.find(filter)
        .populate('recordedBy', 'name email')
        .populate('order', 'totalAmount orderType')
        .sort({ transactionDate: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Finance.countDocuments(filter),
    ]);

    // Build in-memory index for aggregation on current result set
    const filterIndex = new MultiKeyFilterIndex(transactions);
    const categoryBreakdown = type
      ? filterIndex.getCategoryBreakdown(type)
      : [
          ...filterIndex.getCategoryBreakdown('income'),
          ...filterIndex.getCategoryBreakdown('expense'),
        ];

    return ApiResponse.success(res, {
      statusCode: 200,
      data: transactions,
      meta: {
        pagination: {
          total,
          page: pageNum,
          pages: Math.ceil(total / limitNum),
          limit: limitNum,
        },
        categoryBreakdown,
        appliedFilters: { type, category, period, minAmount, maxAmount },
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc   Create a new finance transaction
// @route  POST /api/v1/admin/dashboard/finances
// @access Admin
const createFinance = async (req, res, next) => {
  try {
    const { type, category, amount, description, reference, order, transactionDate, tags, isRecurring } = req.body;

    const finance = await Finance.create({
      type,
      category,
      amount,
      description,
      reference,
      order: order || null,
      recordedBy: req.user._id,
      transactionDate: transactionDate || new Date(),
      tags: tags || [],
      isRecurring: isRecurring || false,
    });

    return ApiResponse.success(res, {
      statusCode: 201,
      message: 'Finance transaction recorded successfully',
      data: finance,
    });
  } catch (error) {
    next(error);
  }
};

// @desc   Get full inventory list with O(1) alert tracking
// @route  GET /api/v1/admin/dashboard/inventory
// @access Admin
const getInventory = async (req, res, next) => {
  try {
    const { category, search, alertsOnly, page = 1, limit = 50 } = req.query;
    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(200, Math.max(1, parseInt(limit)));
    const skip = (pageNum - 1) * limitNum;

    const filter = { isActive: true };
    if (category) filter.category = category;

    let query = Inventory.find(filter);
    if (search) {
      query = Inventory.find({ ...filter, $text: { $search: search } });
    }

    const [items, total] = await Promise.all([
      query.sort({ quantity: 1 }).skip(skip).limit(limitNum).lean(),
      Inventory.countDocuments(filter),
    ]);

    // Build O(1) alert tracker
    const tracker = new InventoryAlertTracker(items);
    const summary = tracker.getSummary();
    const alerts = tracker.getAlerts();

    // If alertsOnly flag, return only alert items
    const data = alertsOnly === 'true' ? alerts : items.map((item) => ({
      ...item,
      isLowStock: item.quantity <= item.reorderLevel,
      totalValue: +(item.quantity * item.costPerUnit).toFixed(2),
      daysUntilExpiry: item.expiryDate
        ? Math.ceil((new Date(item.expiryDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
        : null,
    }));

    return ApiResponse.success(res, {
      statusCode: 200,
      data,
      meta: {
        pagination: {
          total,
          page: pageNum,
          pages: Math.ceil(total / limitNum),
          limit: limitNum,
        },
        summary,
        alertCount: alerts.length,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc   Create or update inventory item
// @route  POST /api/v1/admin/dashboard/inventory
// @access Admin
const upsertInventory = async (req, res, next) => {
  try {
    const {
      name, sku, category, quantity, unit, costPerUnit,
      reorderLevel, supplier, expiryDate, location, notes,
    } = req.body;

    const item = await Inventory.findOneAndUpdate(
      { sku: sku?.toUpperCase() },
      {
        name, sku: sku?.toUpperCase(), category, quantity, unit, costPerUnit,
        reorderLevel, supplier, expiryDate, location, notes,
        lastRestocked: new Date(),
        isActive: true,
      },
      { upsert: true, new: true, runValidators: true }
    );

    return ApiResponse.success(res, {
      statusCode: 201,
      message: item.isNew ? 'Inventory item created' : 'Inventory item updated',
      data: item,
    });
  } catch (error) {
    next(error);
  }
};

// @desc   Update inventory stock quantity (restock or consume)
// @route  PATCH /api/v1/admin/dashboard/inventory/:id/stock
// @access Admin
const updateStock = async (req, res, next) => {
  try {
    const { adjustment, reason } = req.body;
    if (typeof adjustment !== 'number') {
      return ApiResponse.error(res, {
        statusCode: 400,
        message: 'Stock adjustment must be a number (positive for restock, negative for consumption)',
      });
    }

    const item = await Inventory.findById(req.params.id);
    if (!item) {
      return ApiResponse.error(res, { statusCode: 404, message: 'Inventory item not found' });
    }

    const newQty = item.quantity + adjustment;
    if (newQty < 0) {
      return ApiResponse.error(res, {
        statusCode: 400,
        message: `Insufficient stock. Current: ${item.quantity}, Attempted adjustment: ${adjustment}`,
      });
    }

    item.quantity = newQty;
    if (adjustment > 0) item.lastRestocked = new Date();
    await item.save();

    return ApiResponse.success(res, {
      statusCode: 200,
      message: `Stock ${adjustment > 0 ? 'restocked' : 'consumed'}: ${Math.abs(adjustment)} ${item.unit}${reason ? ` (${reason})` : ''}`,
      data: item,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getDashboardAnalytics,
  getFinanceDetails,
  createFinance,
  getInventory,
  upsertInventory,
  updateStock,
};

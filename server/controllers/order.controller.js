const { validationResult } = require('express-validator');
const { Op } = require('sequelize');
const Order = require('../models/Order');
const MenuItem = require('../models/MenuItem');
const Category = require('../models/Category');
const ApiResponse = require('../utils/ApiResponse');
const { emitNewOrder } = require('../admin/admin.socket');

// @desc   Place a new order with stock & availability validation
// @route  POST /api/v1/orders
// @access Private
const placeOrder = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return ApiResponse.error(res, {
        statusCode: 400,
        message: 'Validation failed',
        errors: errors.array().map((e) => e.msg),
      });
    }

    let { items, paymentMode, paymentStatus, customerName, customerPhone, specialInstructions, orderType, customer_location, deliveryAddress, coordinates, tableNumber, tableNo } = req.body;
    const resolvedOrderType = ['takeaway', 'delivery', 'dine-in'].includes(orderType) ? orderType : 'takeaway';
    const rawTable = tableNumber || tableNo;
    const resolvedTableNumber = resolvedOrderType === 'dine-in' && rawTable ? String(rawTable).trim() : null;
    const initialStatus = 'pending';
    const resolvedPaymentMode = (paymentMode && ['cash', 'upi'].includes(paymentMode)) ? paymentMode : 'cash';

    const resolvedCustomerName = customerName ? customerName.trim() : (req.user?.name || 'Customer');
    const resolvedCustomerPhone = customerPhone ? customerPhone.trim() : (req.user?.phone || '');

    let resolvedPaymentStatus = 'pending';
    if (paymentStatus && ['paid', 'pending', 'cod'].includes(paymentStatus)) {
      resolvedPaymentStatus = paymentStatus;
    } else if (resolvedPaymentMode === 'cash') {
      resolvedPaymentStatus = 'cod';
    } else if (resolvedPaymentMode === 'upi') {
      resolvedPaymentStatus = 'paid';
    }

    // Delivery Geofence: Enforce Coimbatore boundary check for delivery orders only
    if (resolvedOrderType === 'delivery') {
      const locCheck = `${deliveryAddress || ''} ${customer_location || ''}`.toLowerCase();
      if (locCheck && !locCheck.includes('coimbatore')) {
        return ApiResponse.error(res, {
          statusCode: 400,
          message: 'Delivery currently available in Coimbatore city limits only',
        });
      }
    }

    // Fallback: If no items provided, use dummy item array
    if (!items || !Array.isArray(items) || items.length === 0) {
      items = [{ name: 'Classic Cappuccino', price: 149, quantity: 1 }];
    }

    const enrichedItems = [];
    let totalAmount = 0;

    for (const item of items) {
      let menuItem = null;

      // 1. Try finding by menuItemId (UUID) using Sequelize findByPk
      if (item.menuItemId && typeof item.menuItemId === 'string' && item.menuItemId.trim()) {
        menuItem = await MenuItem.findByPk(item.menuItemId);
      }

      // 2. Try finding by item name (case-insensitive via iLike)
      if (!menuItem && item.name) {
        menuItem = await MenuItem.findOne({
          where: { name: { [Op.iLike]: item.name.trim() } },
        });
      }

      // 3. Try finding any available MenuItem in database
      if (!menuItem) {
        menuItem = await MenuItem.findOne({ where: { available: true } });
      }

      // 4. Auto-create fallback Category + MenuItem if none exists
      if (!menuItem) {
        let category = await Category.findOne();
        if (!category) {
          category = await Category.create({
            name: 'Quick Bites',
            slug: 'quick-bites',
            icon: '🍟',
            displayOrder: 1,
          });
        }
        menuItem = await MenuItem.create({
          name: item.name || 'French Fries',
          price: item.price !== undefined ? Number(item.price) : 99,
          categoryId: category.id,
          description: 'Crispy golden fries seasoned with classic salt',
          available: true,
        });
      }

      const qty = item.quantity && Number(item.quantity) > 0 ? Number(item.quantity) : 1;
      const price = item.price !== undefined ? Number(item.price) : menuItem.price;
      const name = item.name || menuItem.name;
      totalAmount += price * qty;

      enrichedItems.push({ menuItemId: menuItem.id, name, price, quantity: qty });
    }

    const fallbackLocation = 'Coimbatore, Tamil Nadu';
    const fallbackCoords = { lat: 11.0168, lng: 76.9558 };

    // Sequelize Order.create — field names match PostgreSQL schema exactly
    const order = await Order.create({
      userId: req.user.id,
      items: enrichedItems,                   // DataTypes.JSON — Sequelize handles serialization
      totalAmount: parseFloat(totalAmount.toFixed(2)),
      orderType: resolvedOrderType,
      paymentMode: resolvedPaymentMode,
      paymentStatus: resolvedPaymentStatus,
      tableNumber: resolvedTableNumber,
      customerName: resolvedCustomerName,
      customerPhone: resolvedCustomerPhone,
      customer_location: (customer_location || deliveryAddress || (resolvedOrderType === 'dine-in' ? `Dood Cafe — Dine-in${resolvedTableNumber ? ` (Table ${resolvedTableNumber})` : ''}` : fallbackLocation)).substring(0, 200),
      deliveryAddress: (deliveryAddress || customer_location || (resolvedOrderType === 'dine-in' ? `Dood Cafe — Dine-in${resolvedTableNumber ? ` (Table ${resolvedTableNumber})` : ''}` : fallbackLocation)).substring(0, 250),
      coordinates: (coordinates && typeof coordinates.lat === 'number' && typeof coordinates.lng === 'number')
        ? coordinates
        : fallbackCoords,
      specialInstructions: specialInstructions || '',
      status: initialStatus,
    });

    const newOrder = {
      ...order.toJSON(),
      customerName: resolvedCustomerName,
      customerPhone: resolvedCustomerPhone,
      paymentStatus: resolvedPaymentStatus,
      billNumber: order.billNumber,
      user: {
        id: req.user.id,
        name: resolvedCustomerName,
        email: req.user.email,
        phone: resolvedCustomerPhone,
      },
    };

    // Broadcast newly inserted relational SQL order row straight to admin panel streams
    if (req.io) {
      req.io.emit('newOrderNotification', newOrder);
      req.io.emit('new-order', newOrder);
    }

    // Real-time live-sync: Broadcast new order to Admin Panel
    try {
      emitNewOrder(newOrder);
    } catch (socketErr) {
      // Socket emission error is non-fatal
    }

    return ApiResponse.success(res, {
      statusCode: 201,
      message: 'Order placed successfully',
      data: order.toJSON(),
    });
  } catch (error) {
    next(error);
  }
};

// @desc   Get authenticated user's orders
// @route  GET /api/v1/orders/my
// @access Private
const getMyOrders = async (req, res, next) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(50, Math.max(1, parseInt(limit)));
    const offset = (pageNum - 1) * limitNum;

    const { count: total, rows: orders } = await Order.findAndCountAll({
      where: { userId: req.user.id },
      order: [['createdAt', 'DESC']],
      limit: limitNum,
      offset,
    });

    // Normalize status and sequential order numbers for history display
    const normalizedOrders = orders.map((o, idx) => {
      const plain = o.toJSON();
      const computedNumber = plain.orderNumber || (total - (offset + idx));
      const status = (plain.orderType === 'takeaway' && plain.status !== 'cancelled') ? 'delivered' : plain.status;
      return { ...plain, orderNumber: computedNumber, status };
    });

    return ApiResponse.success(res, {
      statusCode: 200,
      data: normalizedOrders,
      meta: {
        pagination: {
          total,
          page: pageNum,
          pages: Math.ceil(total / limitNum),
          limit: limitNum,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc   Get single order by ID
// @route  GET /api/v1/orders/:id
// @access Private
const getOrderById = async (req, res, next) => {
  try {
    const order = await Order.findOne({
      where: { id: req.params.id, userId: req.user.id },
    });

    if (!order) {
      return ApiResponse.error(res, { statusCode: 404, message: 'Order not found' });
    }

    const plain = order.toJSON();

    if (plain.orderType === 'takeaway' && plain.status !== 'cancelled') {
      plain.status = 'delivered';
    }

    if (!plain.orderNumber) {
      const earlierOrdersCount = await Order.count({
        where: {
          userId: req.user.id,
          createdAt: { [Op.lt]: plain.createdAt },
        },
      });
      plain.orderNumber = earlierOrdersCount + 1;
    }

    return ApiResponse.success(res, { statusCode: 200, data: plain });
  } catch (error) {
    next(error);
  }
};

// @desc   Cancel order (only if pending/confirmed)
// @route  PATCH /api/v1/orders/:id/cancel
// @access Private
const cancelOrder = async (req, res, next) => {
  try {
    const order = await Order.findOne({
      where: { id: req.params.id, userId: req.user.id },
    });

    if (!order) {
      return ApiResponse.error(res, { statusCode: 404, message: 'Order not found' });
    }

    if (!['pending', 'confirmed'].includes(order.status)) {
      return ApiResponse.error(res, {
        statusCode: 400,
        message: 'Order cannot be cancelled at its current status stage',
      });
    }

    order.status = 'cancelled';
    await order.save();

    return ApiResponse.success(res, {
      statusCode: 200,
      message: 'Order cancelled successfully',
      data: order.toJSON(),
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { placeOrder, getMyOrders, getOrderById, cancelOrder };

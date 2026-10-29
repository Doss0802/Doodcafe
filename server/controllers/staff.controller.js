const { Op } = require('sequelize');
const Order = require('../models/Order');
const User = require('../models/User');
const ApiResponse = require('../utils/ApiResponse');
const { emitOrderStatusUpdate } = require('../admin/admin.socket');

/**
 * Helper to compute start & end of current day in Asia/Kolkata timezone
 */
const getKolkataDayBounds = (dateStr) => {
  let targetDate = dateStr;
  if (!targetDate) {
    const formatter = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' });
    targetDate = formatter.format(new Date()); // YYYY-MM-DD
  }
  const startOfDay = new Date(`${targetDate}T00:00:00+05:30`);
  const endOfDay = new Date(`${targetDate}T23:59:59.999+05:30`);
  return { startOfDay, endOfDay, dateStr: targetDate };
};

/**
 * ─── 1. Get Staff Orders (Takeaway or Dine-in for Today) ───────────────────────
 * @route GET /api/v1/staff/orders?type=takeaway|dine-in&status=...&paymentStatus=...
 * @access Private (admin, manager, staff)
 */
const getStaffOrders = async (req, res, next) => {
  try {
    const { type = 'takeaway', status, paymentStatus, allDates } = req.query;
    const resolvedType = ['takeaway', 'dine-in'].includes(type) ? type : 'takeaway';

    const where = {
      orderType: resolvedType,
    };

    // Filter by today in Asia/Kolkata by default unless allDates=true is explicitly requested
    if (allDates !== 'true') {
      const { startOfDay, endOfDay } = getKolkataDayBounds();
      where.createdAt = {
        [Op.between]: [startOfDay, endOfDay],
      };
    }

    // Status filter for takeaway
    if (resolvedType === 'takeaway' && status && status !== 'all') {
      if (status === 'handed_over') {
        where.status = 'handed_over';
      } else if (status === 'pending') {
        where.status = { [Op.ne]: 'handed_over' };
      } else {
        where.status = status;
      }
    }

    // Payment status filter for dine-in or takeaway
    if (paymentStatus && paymentStatus !== 'all') {
      where.paymentStatus = paymentStatus;
    }

    const orders = await Order.findAll({
      where,
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'name', 'phone'],
        },
      ],
      order: [['createdAt', 'DESC']],
      limit: 100,
    });

    // Sanitize and format outputs specific to staff view
    const formattedOrders = orders.map((o) => {
      const plain = o.toJSON();
      const customerName = plain.customerName || plain.user?.name || 'Customer';
      const customerPhone = plain.customerPhone || plain.user?.phone || '';
      const billNumber = plain.billNumber || `ORD-${plain.orderNumber || String(plain.id).slice(-5)}`;

      if (resolvedType === 'takeaway') {
        return {
          id: plain.id,
          orderNumber: plain.orderNumber,
          billNumber,
          customerName,
          customerPhone,
          locationDetails: plain.customer_location || plain.deliveryAddress || 'Dood Cafe Counter',
          items: Array.isArray(plain.items) ? plain.items : [],
          totalAmount: plain.totalAmount,
          paymentMode: plain.paymentMode,
          paymentStatus: plain.paymentStatus || (plain.paymentMode === 'cash' ? 'cod' : 'paid'),
          status: plain.status,
          handedOverAt: plain.handedOverAt,
          createdAt: plain.createdAt,
        };
      } else {
        // Dine-in order view (clean & focused)
        return {
          id: plain.id,
          orderNumber: plain.orderNumber,
          billNumber,
          customerName,
          customerPhone,
          tableNumber: plain.tableNumber || null,
          tableNo: plain.tableNumber || plain.tableNo || null,
          deliveryAddress: plain.deliveryAddress || null,
          customer_location: plain.customer_location || null,
          items: Array.isArray(plain.items) ? plain.items : [],
          totalAmount: plain.totalAmount,
          paymentMode: plain.paymentMode,
          paymentStatus: plain.paymentStatus || (plain.paymentMode === 'cash' ? 'cod' : 'paid'),
          status: plain.status,
          createdAt: plain.createdAt,
        };
      }
    });

    return ApiResponse.success(res, {
      statusCode: 200,
      data: formattedOrders,
      meta: {
        total: formattedOrders.length,
        type: resolvedType,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * ─── 2. Lookup Order by Bill Number (Exact Match, Takeaway Only) ───────────────
 * @route GET /api/v1/staff/orders/lookup/:billNumber
 * @access Private (admin, manager, staff)
 */
const lookupTakeawayOrder = async (req, res, next) => {
  try {
    const rawBill = (req.params.billNumber || '').trim();
    if (!rawBill) {
      return ApiResponse.error(res, {
        statusCode: 400,
        message: 'Bill number is required',
      });
    }

    // Strip leading hash if customer entered #ORD-1001 or #1001
    const cleanBill = rawBill.replace(/^#/, '').trim();
    const numericPart = parseInt(cleanBill.replace(/\D/g, ''), 10);

    // Build flexible match conditions: billNumber = 'ORD-1001' or '1001' or orderNumber = 1001
    const matchConditions = [
      { billNumber: { [Op.iLike]: cleanBill } },
      { billNumber: { [Op.iLike]: `ORD-${cleanBill}` } },
    ];

    if (!isNaN(numericPart)) {
      matchConditions.push({ orderNumber: numericPart });
      matchConditions.push({ billNumber: `ORD-${numericPart}` });
    }

    const order = await Order.findOne({
      where: {
        orderType: 'takeaway',
        [Op.or]: matchConditions,
      },
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'name', 'phone'],
        },
      ],
      order: [['createdAt', 'DESC']],
    });

    if (!order) {
      return ApiResponse.error(res, {
        statusCode: 404,
        message: 'No order found for this bill number',
      });
    }

    const plain = order.toJSON();
    const customerName = plain.customerName || plain.user?.name || 'Customer';
    const customerPhone = plain.customerPhone || plain.user?.phone || '';
    const billNumber = plain.billNumber || `ORD-${plain.orderNumber || String(plain.id).slice(-5)}`;

    const data = {
      id: plain.id,
      orderNumber: plain.orderNumber,
      billNumber,
      customerName,
      customerPhone,
      locationDetails: plain.customer_location || plain.deliveryAddress || 'Dood Cafe Counter',
      items: Array.isArray(plain.items) ? plain.items : [],
      totalAmount: plain.totalAmount,
      paymentMode: plain.paymentMode,
      paymentStatus: plain.paymentStatus || (plain.paymentMode === 'cash' ? 'cod' : 'paid'),
      status: plain.status,
      handedOverAt: plain.handedOverAt,
      createdAt: plain.createdAt,
    };

    return ApiResponse.success(res, {
      statusCode: 200,
      data,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * ─── 3. Mark Takeaway Order as Handed Over ─────────────────────────────────────
 * @route PATCH /api/v1/staff/orders/:id/handover
 * @access Private (admin, manager, staff)
 */
const markOrderHandedOver = async (req, res, next) => {
  try {
    const { id } = req.params;

    const order = await Order.findByPk(id, {
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'name', 'phone'],
        },
      ],
    });

    if (!order) {
      return ApiResponse.error(res, {
        statusCode: 404,
        message: 'Order not found',
      });
    }

    if (order.orderType !== 'takeaway') {
      return ApiResponse.error(res, {
        statusCode: 400,
        message: 'Handover is only applicable to takeaway orders',
      });
    }

    // Double handover check: return 409 Conflict if already handed over
    if (order.status === 'handed_over' || order.handedOverAt) {
      return ApiResponse.error(res, {
        statusCode: 409,
        message: `Order was already handed over at ${new Date(order.handedOverAt || order.updatedAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}`,
        data: {
          id: order.id,
          billNumber: order.billNumber,
          handedOverAt: order.handedOverAt,
          status: order.status,
        },
      });
    }

    const now = new Date();
    order.status = 'handed_over';
    order.handedOverAt = now;
    order.handedOverBy = req.user?.id || null;
    await order.save();

    const plain = order.toJSON();
    const orderData = {
      ...plain,
      status: 'handed_over',
      handedOverAt: now,
    };

    // Broadcast live update across sockets
    try {
      emitOrderStatusUpdate(orderData);
      if (req.io) {
        req.io.emit('order-status-updated', orderData);
        req.io.emit('order-handed-over', orderData);
        req.io.emit('orderStatusUpdated', orderData);
      }
    } catch (sockErr) {
      // Non-fatal
    }

    return ApiResponse.success(res, {
      statusCode: 200,
      message: 'Order successfully marked as handed over',
      data: orderData,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getStaffOrders,
  lookupTakeawayOrder,
  markOrderHandedOver,
};

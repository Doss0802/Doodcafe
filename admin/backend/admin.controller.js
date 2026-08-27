const adminService = require('./admin.service');
const ApiResponse = require('../../server/utils/ApiResponse');

/**
 * Admin Controller: Request/Response layer connecting HTTP requests to MongoDB Admin Service
 */

const getOverviewKPIs = async (req, res, next) => {
  try {
    const data = await adminService.getOverviewMetrics();
    return ApiResponse.success(res, {
      statusCode: 200,
      data,
    });
  } catch (error) {
    next(error);
  }
};

const getDashboardTrends = async (req, res, next) => {
  try {
    const { period = 'daily' } = req.query;
    const data = await adminService.getRevenueTrends(period);
    return ApiResponse.success(res, {
      statusCode: 200,
      data,
    });
  } catch (error) {
    next(error);
  }
};

const getTopSellingItems = async (req, res, next) => {
  try {
    const { limit = 8 } = req.query;
    const data = await adminService.getTopSellingDishes(limit);
    return ApiResponse.success(res, {
      statusCode: 200,
      data,
    });
  } catch (error) {
    next(error);
  }
};

const getLiveOrders = async (req, res, next) => {
  try {
    const { status, page = 1, limit = 50 } = req.query;
    const { orders, meta } = await adminService.getOrdersStream({ status, page, limit });
    return ApiResponse.success(res, {
      statusCode: 200,
      data: orders,
      meta,
    });
  } catch (error) {
    next(error);
  }
};

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

    const order = await adminService.updateOrderStatus(id, status);
    if (!order) {
      return ApiResponse.error(res, {
        statusCode: 404,
        message: 'Order not found',
      });
    }

    return ApiResponse.success(res, {
      statusCode: 200,
      message: `Order status updated to "${status}"`,
      data: order,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getOverviewKPIs,
  getDashboardTrends,
  getTopSellingItems,
  getLiveOrders,
  updateOrderStatus,
};

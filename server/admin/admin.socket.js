const jwt = require('jsonwebtoken');
const User = require('../models/User');

let ioInstance = null;

/**
 * Initialize Socket.io with HTTP server and CORS configuration
 */
const initAdminSocket = (io) => {
  ioInstance = io;

  // Socket Authentication Middleware: strictly allow role admin, manager, staff
  io.use(async (socket, next) => {
    try {
      const token =
        socket.handshake.auth?.token ||
        socket.handshake.query?.token ||
        socket.handshake.headers?.authorization?.replace(/^Bearer\s+/, '');

      if (!token) {
        return next(new Error('Authentication required for real-time socket'));
      }

      const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
      const user = await User.findByPk(decoded.id, {
        attributes: ['id', 'name', 'role', 'isActive'],
      });

      if (!user || !user.isActive) {
        return next(new Error('User account not found or inactive'));
      }

      if (!['admin', 'manager', 'staff'].includes(user.role)) {
        return next(new Error('Forbidden: insufficient permissions for order stream socket'));
      }

      socket.user = user;
      next();
    } catch (err) {
      return next(new Error('Invalid or expired socket credentials'));
    }
  });

  io.on('connection', (socket) => {
    socket.on('join-admin', () => {
      socket.join('admin-room');
    });

    socket.on('leave-admin', () => {
      socket.leave('admin-room');
    });
  });

  return io;
};

/**
 * Emit a real-time event to all connected authenticated clients.
 */
const emitNewOrder = (order) => {
  if (!ioInstance) {
    console.warn('[admin.socket] emitNewOrder called before Socket.io was initialized');
    return;
  }
  ioInstance.emit('new-order', order);
  ioInstance.emit('newOrderNotification', order);
};

const emitOrderStatusUpdate = (order) => {
  if (!ioInstance) return;
  ioInstance.emit('order-status-updated', order);
};

const getIo = () => ioInstance;

module.exports = {
  initAdminSocket,
  emitNewOrder,
  emitOrderStatusUpdate,
  getIo,
};

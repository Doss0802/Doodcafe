let ioInstance = null;

/**
 * Initialize Socket.io with HTTP server and CORS configuration
 */
const initAdminSocket = (io) => {
  ioInstance = io;

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
 * Emit a real-time event to all connected admin clients.
 * Broadcasts to every connected socket (not just admin-room) so the
 * admin page receives it whether or not join-admin was already sent.
 */
const emitNewOrder = (order) => {
  if (!ioInstance) {
    console.warn('[admin.socket] emitNewOrder called before Socket.io was initialized');
    return;
  }
  ioInstance.emit('new-order', order);
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


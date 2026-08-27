/**
 * Socket.io / WebSocket connection logic — DISABLED for fallback refactor.
 * Data fetching is handled directly via axios and useEffect in AdminDashboard.jsx.
 */

/*
import { io } from 'socket.io-client';

let socket = null;

export const connectAdminSocket = ({ onNewOrder, onStatusUpdate, onConnectChange }) => {
  const SERVER_URL = import.meta.env.VITE_SOCKET_URL || window.location.origin;

  if (!socket) {
    socket = io(SERVER_URL, {
      path: '/socket.io',
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 10,
      reconnectionDelay: 2000,
    });
  }

  socket.off('connect');
  socket.off('disconnect');
  socket.off('connect_error');
  socket.off('new-order');
  socket.off('order-status-updated');

  socket.on('connect', () => {
    socket.emit('join-admin');
    if (onConnectChange) onConnectChange(true);
  });

  socket.on('disconnect', () => {
    if (onConnectChange) onConnectChange(false);
  });

  socket.on('connect_error', () => {
    if (onConnectChange) onConnectChange(false);
  });

  if (onNewOrder) {
    socket.on('new-order', onNewOrder);
  }

  if (onStatusUpdate) {
    socket.on('order-status-updated', onStatusUpdate);
  }

  if (socket.connected) {
    socket.emit('join-admin');
    if (onConnectChange) onConnectChange(true);
  }

  return socket;
};

export const disconnectAdminSocket = () => {
  if (socket) {
    socket.emit('leave-admin');
    socket.disconnect();
    socket = null;
  }
};
*/

export const connectAdminSocket = () => null;
export const disconnectAdminSocket = () => null;


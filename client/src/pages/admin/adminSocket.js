import { io } from 'socket.io-client';

let socket = null;

export const getSocketServerUrl = () => {
  if (import.meta.env.VITE_SOCKET_URL) return import.meta.env.VITE_SOCKET_URL;
  if (import.meta.env.VITE_API_URL) {
    try {
      const url = new URL(import.meta.env.VITE_API_URL);
      return url.origin;
    } catch {
      // fallback
    }
  }
  return window.location.origin;
};

export const getAdminSocket = () => socket;

export const connectAdminSocket = ({ onNewOrder, onStatusUpdate, onConnectChange } = {}) => {
  const SERVER_URL = getSocketServerUrl();
  const token = localStorage.getItem('accessToken');

  if (!socket) {
    socket = io(SERVER_URL, {
      path: '/socket.io',
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 10,
      reconnectionDelay: 2000,
      withCredentials: true,
      auth: { token },
    });
  } else if (token && socket.auth) {
    socket.auth.token = token;
  }

  socket.off('connect');
  socket.off('disconnect');
  socket.off('connect_error');
  socket.off('new-order');
  socket.off('newOrderNotification');
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
    socket.on('newOrderNotification', onNewOrder);
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
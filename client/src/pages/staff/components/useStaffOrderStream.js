import { useState, useEffect, useCallback, useRef } from 'react';
import axiosInstance from '../../../api/axiosInstance';
import { connectAdminSocket } from '../../admin/adminSocket';
import { STATUS_CONFIG } from './staffOrderStatus';
import toast from 'react-hot-toast';

/**
 * Custom hook to manage real-time Order Stream and Kitchen updates for Staff / Admin.
 *
 * @param {Object} options
 * @param {string} [options.role='staff'] - User role (staff, admin, manager)
 * @param {string} [options.orderFilter='all'] - Order filter (all, pending, preparing, ready)
 * @param {Function} [options.onNewOrder] - Callback when fresh order arrives
 * @param {Function} [options.onStatusUpdate] - Callback when order status changes
 */
export function useStaffOrderStream({
  _role = 'staff',
  orderFilter = 'all',
  onNewOrder,
  onStatusUpdate,
} = {}) {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isSocketConnected, setIsSocketConnected] = useState(false);

  const onNewOrderRef = useRef(onNewOrder);
  const onStatusUpdateRef = useRef(onStatusUpdate);

  useEffect(() => {
    onNewOrderRef.current = onNewOrder;
  }, [onNewOrder]);

  useEffect(() => {
    onStatusUpdateRef.current = onStatusUpdate;
  }, [onStatusUpdate]);

  // Fetch live orders from backend
  const fetchOrders = useCallback(async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    try {
      // First attempt: /admin/live-orders (permitted to admin, manager, staff)
      const res = await axiosInstance.get('/admin/live-orders', {
        params: { status: orderFilter !== 'all' ? orderFilter : undefined },
      });
      const data = res?.data?.data?.orders || res?.data?.data;
      if (Array.isArray(data)) {
        setOrders(data);
      }
    } catch (err) {
      // Fallback: fetch staff orders directly
      try {
        const staffRes = await axiosInstance.get('/staff/orders?type=takeaway&status=all');
        const items = staffRes?.data?.data;
        if (Array.isArray(items)) {
          setOrders(items);
        }
      } catch (_fallbackErr) {
        if (!isSilent) {
          console.error('[useStaffOrderStream] Error loading orders:', err);
        }
      }
    } finally {
      setLoading(false);
    }
  }, [orderFilter]);

  // Update order status action
  const updateOrderStatus = useCallback(async (orderId, newStatus) => {
    try {
      await axiosInstance.patch(`/admin/orders/${orderId}/status`, { status: newStatus });
      const statusLabel = STATUS_CONFIG[newStatus]?.label || newStatus;
      toast.success(`Order status updated to: ${statusLabel}`);

      // Optimistically update local list
      setOrders((prev) =>
        prev.map((ord) => (ord.id === orderId ? { ...ord, status: newStatus } : ord))
      );

      if (onStatusUpdateRef.current) {
        onStatusUpdateRef.current(orderId, newStatus);
      }
    } catch (err) {
      console.error('[useStaffOrderStream] Status update failed:', err);
      const msg = err.response?.data?.message || 'Failed to update order status';
      toast.error(msg);
      throw err;
    }
  }, []);

  // Socket Connection and Event Subscription
  useEffect(() => {
    fetchOrders(false);

    connectAdminSocket({
      onConnectChange: (connected) => {
        setIsSocketConnected(connected);
      },
      onNewOrder: (freshOrder) => {
        if (!freshOrder) return;
        setOrders((prev) => {
          const exists = prev.some((o) => o.id === freshOrder.id);
          if (exists) {
            return prev.map((o) => (o.id === freshOrder.id ? { ...o, ...freshOrder } : o));
          }
          return [freshOrder, ...prev];
        });
        if (onNewOrderRef.current) {
          onNewOrderRef.current(freshOrder);
        }
      },
      onStatusUpdate: (updatedPayload) => {
        if (!updatedPayload) return;
        const updatedId = updatedPayload.orderId || updatedPayload.id;
        const updatedStatus = updatedPayload.status;

        setOrders((prev) =>
          prev.map((ord) => (ord.id === updatedId ? { ...ord, status: updatedStatus, ...updatedPayload } : ord))
        );
        if (onStatusUpdateRef.current) {
          onStatusUpdateRef.current(updatedPayload);
        }
      },
    });

    return () => {
      // Retain socket connection if other views need it, or disconnectAdminSocket if unmounting
    };
  }, [fetchOrders]);

  return {
    orders,
    loading,
    updateOrderStatus,
    isSocketConnected,
    refetch: fetchOrders,
  };
}

// Named alias for interoperability
export const useOrderStream = useStaffOrderStream;
export default useStaffOrderStream;

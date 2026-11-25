import { useEffect, useState, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { CheckCircle, Clock, ChefHat, XCircle, ArrowLeft, Printer } from 'lucide-react';
import axiosInstance from '../api/axiosInstance';
import Bill from '../components/Bill';
import { printBillOrder } from '../utils/printBill';
import useOrderBell from '../hooks/useOrderBell';

const STATUS_STEPS = [
  { key: 'placed',    label: 'Placed',           icon: CheckCircle },
  { key: 'preparing', label: 'Preparing',        icon: ChefHat     },
  { key: 'ready',     label: 'Ready for Pickup', icon: Clock       },
];

const STATUS_META = {
  pending:   { label: 'Order Placed',      color: '#059669', stepIdx: 0 },
  confirmed: { label: 'Order Placed',      color: '#059669', stepIdx: 0 },
  preparing: { label: 'Preparing',         color: '#F59E0B', stepIdx: 1 },
  ready:     { label: 'Ready for Pickup',  color: '#10B981', stepIdx: 2 },
  delivered: { label: 'Ready for Pickup',  color: '#059669', stepIdx: 2 },
  cancelled: { label: 'Cancelled',         color: '#EF4444', stepIdx: -1 },
};

export default function OrderTracking() {
  const { id } = useParams();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const isMountedRef = useRef(true);
  const { SoundBanner } = useOrderBell(order);

  useEffect(() => {
    isMountedRef.current = true;
    document.title = 'Order Tracking — Dood Cafe';

    const fetchOrder = async () => {
      try {
        const { data } = await axiosInstance.get(`/orders/${id}`);
        if (isMountedRef.current) {
          setOrder(data.data);
        }
      } catch (err) {
        if (isMountedRef.current) {
          console.error('Failed to fetch order status:', err);
        }
      } finally {
        if (isMountedRef.current) {
          setLoading(false);
        }
      }
    };

    fetchOrder();

    // Light polling every 10 seconds for real-time status updates while page is open
    const interval = setInterval(fetchOrder, 10000);
    return () => {
      isMountedRef.current = false;
      clearInterval(interval);
    };
  }, [id]);

  if (loading) {
    return (
      <div className="page-loading">
        <div className="loading-spinner large" />
        <p>Loading your order...</p>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="container empty-state" style={{ paddingTop: '4rem' }}>
        <span className="empty-icon">😕</span>
        <h2>Order not found</h2>
        <Link to="/orders" className="btn btn-primary-sm">View My Orders</Link>
      </div>
    );
  }

  const currentMeta = STATUS_META[order.status] || STATUS_META.pending;
  const currentStepIndex = currentMeta.stepIdx;

  return (
    <main className="tracking-page">
      <div className="container tracking-container">
        <Link to="/orders" className="back-link">
          <ArrowLeft size={16} /> My Orders
        </Link>

        <div className="tracking-card">
          <SoundBanner />
          <div className="tracking-header">
            <div>
              <h1 className="tracking-order-id">Order #{order.orderNumber || 1}</h1>
              <p className="tracking-date">
                {new Date(order.createdAt).toLocaleDateString('en-IN', {
                  day: 'numeric', month: 'long', year: 'numeric',
                  hour: '2-digit', minute: '2-digit',
                })}
              </p>
            </div>
            <div
              className="status-badge"
              style={{ background: currentMeta.color + '20', color: currentMeta.color }}
            >
              {currentMeta.label}
            </div>
          </div>

          {/* Progress Tracker */}
          {order.status !== 'cancelled' ? (
            <div className="progress-tracker">
              {STATUS_STEPS.map((step, index) => {
                const Icon = step.icon;
                const isDone = index <= currentStepIndex;
                const isCurrent = index === currentStepIndex;
                return (
                  <div key={step.key} className={`progress-step ${isDone ? 'step-done' : ''} ${isCurrent ? 'step-current' : ''}`}>
                    <div className="step-circle">
                      <Icon size={16} />
                    </div>
                    <p className="step-label">{step.label}</p>
                    {index < STATUS_STEPS.length - 1 && (
                      <div className={`step-line ${index < currentStepIndex ? 'line-done' : ''}`} />
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="cancelled-banner">
              <XCircle size={32} />
              <p>This order was cancelled.</p>
            </div>
          )}

          {/* Order Details */}
          <div className="tracking-details">
            <div className="tracking-info-row">
              <span>Order Type</span>
              <span className="info-value">{order.orderType}</span>
            </div>
            <div className="tracking-info-row">
              <span>Payment</span>
              <span className="info-value">
                {order.paymentMode === 'upi' && order.paymentStatus === 'pending'
                  ? '⏳ Pending (UPI)'
                  : order.paymentMode === 'upi' && order.paymentStatus === 'failed'
                  ? '❌ Failed (UPI)'
                  : (order.paymentMode || 'cash').toUpperCase()}
              </span>
            </div>
          </div>

          {/* Standardized Invoice / Bill */}
          <div className="tracking-items">
            <div className="flex items-center justify-between gap-2 mb-3">
              <h3 className="tracking-items-title" style={{ margin: 0 }}>Invoice</h3>
              <button
                type="button"
                onClick={() => printBillOrder(order)}
                className="clay-btn clay-dark px-3.5 py-2 min-h-[40px] text-xs font-bold inline-flex items-center gap-1.5"
              >
                <Printer size={14} />
                <span>Print Bill</span>
              </button>
            </div>
            <Bill order={order} />
          </div>
        </div>
      </div>
    </main>
  );
}

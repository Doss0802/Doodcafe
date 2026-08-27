import { useEffect, useState, useCallback } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import {
  CheckCircle, Package, ChefHat, Clock, Truck,
  XCircle, ChevronDown, ChevronUp, ExternalLink,
  ShoppingBag, Receipt, ArrowRight, UserCircle2,
} from 'lucide-react';
import axiosInstance from '../api/axiosInstance';

/* ── Status config ─────────────────────────────────────────── */
const STATUS_META = {
  pending:   { color: '#059669', bg: '#ECFDF5', label: 'Order Placed' },
  confirmed: { color: '#059669', bg: '#ECFDF5', label: 'Order Placed' },
  preparing: { color: '#F59E0B', bg: '#FFFBEB', label: 'Preparing' },
  ready:     { color: '#10B981', bg: '#ECFDF5', label: 'Ready for Pickup' },
  delivered: { color: '#059669', bg: '#ECFDF5', label: 'Order Placed' },
  cancelled: { color: '#EF4444', bg: '#FEF2F2', label: 'Cancelled' },
};

const ORDER_TYPE_ICON = { takeaway: '🛍️' };

/* ── Bill summary component ─────────────────────────────────── */
function BillSummary({ order }) {
  const subtotal = order.items.reduce((s, i) => s + i.price * i.quantity, 0);
  const tax      = Math.round(subtotal * 0.05);
  const total    = order.totalAmount ?? subtotal + tax;

  return (
    <div className="mo-bill">
      <div className="mo-bill-title">
        <Receipt size={14} /> Bill Summary
      </div>
      <div className="mo-bill-rows">
        {order.items.map((item, i) => (
          <div key={i} className="mo-bill-row">
            <span className="mo-bill-item-name">
              {item.name}
              <span className="mo-bill-qty"> × {item.quantity}</span>
            </span>
            <span className="mo-bill-item-price">₹{(item.price * item.quantity).toFixed(2)}</span>
          </div>
        ))}
      </div>
      <div className="mo-bill-divider" />
      <div className="mo-bill-row mo-bill-sub">
        <span>Subtotal</span><span>₹{subtotal.toFixed(2)}</span>
      </div>
      <div className="mo-bill-row mo-bill-tax">
        <span>GST (5%)</span><span>₹{tax.toFixed(2)}</span>
      </div>
      <div className="mo-bill-divider" />
      <div className="mo-bill-row mo-bill-total">
        <span>Total Paid</span>
        <span className="mo-bill-total-amt">₹{total.toFixed(2)}</span>
      </div>
      {order.paymentMode && (
        <div className="mo-bill-payment">
          Paid via <strong>{order.paymentMode.toUpperCase()}</strong>
        </div>
      )}
    </div>
  );
}

/* ── Single order card ──────────────────────────────────────── */
function OrderCard({ order, orderNumber }) {
  const [expanded, setExpanded] = useState(false);
  const meta = STATUS_META[order.status] || STATUS_META.pending;
  const num = order.orderNumber || orderNumber || 1;
  const date = new Date(order.createdAt).toLocaleDateString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric',
  });
  const time = new Date(order.createdAt).toLocaleTimeString('en-IN', {
    hour: '2-digit', minute: '2-digit',
  });

  return (
    <article className="mo-card" id={`order-${order._id}`}>
      {/* ── Card header ── */}
      <div
        className="mo-card-header"
        onClick={() => setExpanded((x) => !x)}
        role="button"
        aria-expanded={expanded}
        tabIndex={0}
        onKeyDown={(e) => e.key === 'Enter' && setExpanded((x) => !x)}
      >
        <div className="mo-card-meta">
          <span className="mo-order-type-icon" title={order.orderType}>
            {ORDER_TYPE_ICON[order.orderType] || '🍽️'}
          </span>
          <div>
            <p className="mo-order-id">Order #{num}</p>
            <p className="mo-order-date">{date} · {time}</p>
          </div>
        </div>

        <div className="mo-card-right">
          <span
            className="mo-status-chip"
            style={{ color: meta.color, background: meta.bg }}
          >
            {meta.label}
          </span>
          <span className="mo-card-total">₹{order.totalAmount}</span>
          <button
            className="mo-expand-btn"
            aria-label={expanded ? 'Collapse order' : 'Expand order'}
            onClick={(e) => { e.stopPropagation(); setExpanded((x) => !x); }}
          >
            {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
        </div>
      </div>

      {/* ── Expandable detail panel ── */}
      {expanded && (
        <div className="mo-card-detail">
          {/* Order info row */}
          <div className="mo-info-row">
            <div className="mo-info-pill">
              <span className="mo-info-label">Type</span>
              <span className="mo-info-val">{order.orderType}</span>
            </div>
            {order.estimatedTime && (
              <div className="mo-info-pill">
                <span className="mo-info-label">Est. Time</span>
                <span className="mo-info-val">{order.estimatedTime} min</span>
              </div>
            )}
          </div>

          {order.specialInstructions && (
            <p className="mo-special-note">
              💬 {order.specialInstructions}
            </p>
          )}

          {/* Bill */}
          <BillSummary order={order} />

          {/* Track CTA */}
          <div className="mo-card-actions">
            <Link
              to={`/orders/${order._id}`}
              className="mo-track-btn"
              id={`track-order-${order._id}`}
            >
              <ExternalLink size={14} /> Live Track
            </Link>
          </div>
        </div>
      )}
    </article>
  );
}

/* ── Page ────────────────────────────────────────────────────── */
export default function MyOrders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState({});
  const [userInfo, setUserInfo] = useState(null);
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const page = parseInt(searchParams.get('page') || '1');

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      let res;
      try {
        res = await axiosInstance.get(`/orders/my-orders?page=${page}&limit=8`);
      } catch (e) {
        res = await axiosInstance.get(`/orders/my?page=${page}&limit=8`);
      }
      const data = res.data;
      setOrders(data.data || []);
      setPagination(data.meta?.pagination || data.pagination || {});
    } catch (err) {
      if (err.response?.status === 401) {
        navigate('/login?redirect=/orders');
      } else {
        setError('Could not load your orders. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  }, [page, navigate]);

  useEffect(() => {
    document.title = 'My Orders — Dood Cafe';
    fetchOrders();
    // Fetch user info for the greeting header
    axiosInstance.get('/v1/users/profile')
      .then(({ data }) => setUserInfo(data.data))
      .catch(() =>
        axiosInstance.get('/auth/me')
          .then(({ data }) => {
            const u = data.data?.user || data.user;
            setUserInfo({ name: u.name, email: u.email, phone: u.phone });
          })
          .catch(() => { })
      );
  }, [fetchOrders]);

  return (
    <main className="mo-page">
      <div className="container">
        {/* User greeting header */}
        {userInfo && (
          <div className="mo-user-greeting">
            <div className="mo-user-greeting-avatar">
              <UserCircle2 size={36} strokeWidth={1.4} />
            </div>
            <div className="mo-user-greeting-info">
              <p className="mo-user-greeting-name">Hello, {userInfo.name}!</p>
              <p className="mo-user-greeting-email">{userInfo.email}{userInfo.phone ? ` · ${userInfo.phone}` : ''}</p>
            </div>
          </div>
        )}

        {/* Header */}
        <div className="mo-page-header">
          <div className="mo-page-title-row">
            <ShoppingBag size={22} className="mo-header-icon" />
            <h1 className="page-title" style={{ margin: 0 }}>My Orders</h1>
          </div>
          <p className="mo-page-sub">Track your orders and view past receipts</p>
        </div>

        {/* Body */}
        {loading ? (
          <div className="mo-skeleton-list">
            {[1, 2, 3].map((n) => (
              <div key={n} className="mo-skeleton-card">
                <div className="mo-skel-row mo-skel-wide" />
                <div className="mo-skel-row mo-skel-med" />
                <div className="mo-skel-row mo-skel-full" />
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="empty-state">
            <span className="empty-icon">⚠️</span>
            <h3>Something went wrong</h3>
            <p>{error}</p>
            <button className="btn btn-primary-sm" onClick={fetchOrders}>Retry</button>
          </div>
        ) : orders.length === 0 ? (
          <div className="empty-state">
            <span className="empty-icon">🛍️</span>
            <h3>No orders yet</h3>
            <p>Your order history will appear here once you place an order.</p>
            <Link to="/menu" className="btn btn-primary-sm">
              Browse Menu <ArrowRight size={14} />
            </Link>
          </div>
        ) : (
          <div className="mo-orders-list">
            {orders.map((order, idx) => {
              const totalCount = pagination.total || orders.length;
              const computedOrderNumber = order.orderNumber || (totalCount - ((page - 1) * (pagination.limit || 8) + idx));
              return (
                <OrderCard key={order._id} order={order} orderNumber={computedOrderNumber} />
              );
            })}
          </div>
        )}

        {/* Pagination */}
        {!loading && pagination.pages > 1 && (
          <div className="pagination">
            {Array.from({ length: pagination.pages }, (_, i) => i + 1).map((p) => (
              <button
                key={p}
                className={`page-btn ${page === p ? 'page-btn-active' : ''}`}
                onClick={() => setSearchParams({ page: p })}
              >
                {p}
              </button>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}

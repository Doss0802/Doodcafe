import { useState, useEffect, useCallback } from 'react';
import {
  TrendingUp, DollarSign, ShoppingBag, Flame, CheckCircle2,
  RefreshCw, Radio, Sparkles, X, UserRound
} from 'lucide-react';
import axiosInstance from '../../api/axiosInstance';
// Socket.io disabled — using axios polling instead
// import { connectAdminSocket, disconnectAdminSocket } from './adminSocket';
import toast from 'react-hot-toast';

const POLL_INTERVAL_MS = 30_000; // auto-refresh every 30 seconds

/* ── Status Meta Helper ───────────────────────────────────────── */
const STATUS_CONFIG = {
  pending: { label: 'Placed', color: '#D97706', bg: '#FEF3C7', next: 'preparing' },
  confirmed: { label: 'Placed', color: '#D97706', bg: '#FEF3C7', next: 'preparing' },
  preparing: { label: 'Preparing', color: '#2563EB', bg: '#EFF6FF', next: 'ready' },
  ready: { label: 'Ready for Pickup', color: '#059669', bg: '#ECFDF5', next: 'delivered' },
  delivered: { label: 'Completed', color: '#10B981', bg: '#ECFDF5', next: null },
  cancelled: { label: 'Cancelled', color: '#EF4444', bg: '#FEF2F2', next: null },
};

/* ── Customer Detail Modal ────────────────────────────────────── */
function CustomerDetailModal({ order, onClose }) {
  useEffect(() => {
    if (!order) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'unset';
    };
  }, [order, onClose]);

  if (!order) return null;

  const customerName  = order.user?.name  || 'Unknown Customer';
  const customerPhone = order.user?.phone || null;
  const customerEmail = order.user?.email || null;
  const orderLocation = order.deliveryAddress || (order.orderType === 'takeaway' ? 'Dood Cafe Counter — Takeaway / Self Pickup' : order.orderType || 'Takeaway Pickup');
  const statusMeta    = STATUS_CONFIG[order.status] || STATUS_CONFIG.pending;

  // Close on backdrop click
  const handleBackdrop = (e) => {
    if (e.target === e.currentTarget) onClose();
  };

  return (
    <div className="adm-modal-backdrop" onClick={handleBackdrop} role="dialog" aria-modal="true">
      <div className="adm-modal-panel">

        {/* ── Modal Header ── */}
        <div className="adm-modal-header">
          <div className="adm-modal-title-group">
            <span className="adm-modal-order-badge">
              Order #{order.orderNumber || order._id?.slice(-5)}
            </span>
            <span
              className="adm-status-badge"
              style={{ color: statusMeta.color, background: statusMeta.bg }}
            >
              {statusMeta.label}
            </span>
          </div>
          <button className="adm-modal-close" onClick={onClose} aria-label="Close customer details modal">
            <X size={18} />
          </button>
        </div>

        {/* ── Customer Profile ── */}
        <div className="adm-modal-section">
          <h4 className="adm-modal-section-title">
            <UserRound size={15} /> Customer Profile
          </h4>
          <div className="adm-modal-profile-card">
            <div className="adm-modal-avatar">
              {customerName.charAt(0).toUpperCase()}
            </div>
            <div className="adm-modal-profile-info">
              <h3 className="adm-modal-cust-name">{customerName}</h3>
              {customerPhone ? (
                <div className="adm-modal-contact-line">
                  <span className="adm-modal-contact-lbl">Phone:</span>
                  <a href={`tel:${customerPhone}`} className="adm-modal-phone-link" title={`Call ${customerName}`}>
                    📞 {customerPhone}
                  </a>
                </div>
              ) : (
                <span className="adm-modal-no-phone">📞 No phone number provided</span>
              )}
              {customerEmail && (
                <div className="adm-modal-contact-line">
                  <span className="adm-modal-contact-lbl">Email:</span>
                  <span className="adm-modal-email">✉ {customerEmail}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── Customer Order Location / Delivery Address ── */}
        <div className="adm-modal-section">
          <h4 className="adm-modal-section-title">📍 Order Location / Delivery Address</h4>
          <div className="adm-modal-location-box">
            <p className="adm-modal-location-text">{orderLocation}</p>
            <span className="adm-modal-location-sub">
              Order Type: {order.orderType === 'takeaway' ? 'Takeaway' : order.orderType || 'Takeaway'}
            </span>
          </div>
        </div>

        {/* ── Order Meta ── */}
        <div className="adm-modal-section">
          <h4 className="adm-modal-section-title">🗓 Order Info</h4>
          <div className="adm-modal-meta-row">
            <span className="adm-modal-meta-label">Placed At</span>
            <span>{new Date(order.createdAt).toLocaleString('en-IN', {
              day: '2-digit', month: 'short', year: 'numeric',
              hour: '2-digit', minute: '2-digit', hour12: true,
            })}</span>
          </div>
          <div className="adm-modal-meta-row">
            <span className="adm-modal-meta-label">Payment Mode</span>
            <span className="adm-pay-badge">{(order.paymentMode || 'cash').toUpperCase()}</span>
          </div>
        </div>

        {/* ── Detailed Cafe Items Breakdown with Prices ── */}
        <div className="adm-modal-section">
          <h4 className="adm-modal-section-title">🧾 Itemized Cafe Items Breakdown</h4>
          <div className="adm-modal-items-head">
            <span>Item Name & Details</span>
            <span>Qty</span>
            <span>Unit Price</span>
            <span>Line Total</span>
          </div>
          {order.items?.map((it, i) => (
            <div key={i} className="adm-modal-item-row">
              <span className="adm-modal-item-name">{it.name}</span>
              <span className="adm-modal-item-qty">×{it.quantity}</span>
              <span className="adm-modal-item-unit">₹{Number(it.price || 0).toLocaleString('en-IN')}</span>
              <span className="adm-modal-item-total">₹{(Number(it.price || 0) * Number(it.quantity || 1)).toLocaleString('en-IN')}</span>
            </div>
          ))}
          <div className="adm-modal-order-total">
            <span>Total Payable Amount</span>
            <span />
            <span />
            <span className="adm-modal-total-amount">₹{Number(order.totalAmount || 0).toLocaleString('en-IN')}</span>
          </div>
        </div>

        {/* ── Special Instructions ── */}
        {order.specialInstructions && (
          <div className="adm-modal-section">
            <h4 className="adm-modal-section-title">💬 Special Notes</h4>
            <div className="adm-modal-special-note">
              <em>{order.specialInstructions}</em>
            </div>
          </div>
        )}

        {/* ── Footer close ── */}
        <div className="adm-modal-footer">
          <button className="btn btn-secondary adm-modal-close-btn" onClick={onClose}>
            Close
          </button>
        </div>

      </div>
    </div>
  );
}

/* ── Interactive Trend Chart Component ────────────────────────── */
function TrendChart({ points = [], period = 'daily' }) {
  const [hoveredPoint, setHoveredPoint] = useState(null);

  if (!points || !Array.isArray(points) || points.length === 0) {
    return (
      <div className="adm-chart-empty">
        <Sparkles size={28} className="adm-empty-icon" />
        <p>No sales trend data recorded for this timeframe yet.</p>
      </div>
    );
  }

  const safePoints = points.map((p) => ({
    ...p,
    revenue: Number(p.revenue) || 0,
    profit: Number(p.profit) || 0,
    orders: Number(p.orders) || 0,
    label: p.label || 'Date',
  }));

  const maxVal = Math.max(...safePoints.map((p) => Math.max(p.revenue, p.profit, 100)), 500);

  return (
    <div className="adm-chart-container">
      {/* Dynamic Hover Tooltip Info */}
      <div className="adm-chart-hover-banner">
        {hoveredPoint ? (
          <div className="adm-hover-pill">
            <span className="adm-hover-label">{hoveredPoint.label}:</span>
            <span className="adm-hover-rev">₹{(hoveredPoint.revenue || 0).toLocaleString('en-IN')} Revenue</span>
            <span className="adm-hover-sep">·</span>
            <span className="adm-hover-profit">₹{(hoveredPoint.profit || 0).toLocaleString('en-IN')} Est. Profit</span>
            <span className="adm-hover-sep">·</span>
            <span className="adm-hover-orders">{hoveredPoint.orders || 0} orders</span>
          </div>
        ) : (
          <span className="adm-hover-hint">✦ Hover over bars to view detailed revenue & profit breakdown</span>
        )}
      </div>

      {/* Visual Bar Chart */}
      <div className="adm-bar-chart">
        {safePoints.map((pt, idx) => {
          const revHeight = Math.max(8, Math.min(100, Math.round((pt.revenue / maxVal) * 100)));
          const profitHeight = Math.max(4, Math.min(100, Math.round((pt.profit / maxVal) * 100)));

          return (
            <div
              key={idx}
              className="adm-bar-col"
              onMouseEnter={() => setHoveredPoint(pt)}
              onMouseLeave={() => setHoveredPoint(null)}
            >
              <div className="adm-bars-pair">
                {/* Revenue Bar */}
                <div
                  className="adm-bar adm-bar-revenue"
                  style={{ height: `${revHeight}%` }}
                  title={`Revenue: ₹${pt.revenue}`}
                />
                {/* Profit Bar */}
                <div
                  className="adm-bar adm-bar-profit"
                  style={{ height: `${profitHeight}%` }}
                  title={`Profit: ₹${pt.profit}`}
                />
              </div>
              <span className="adm-bar-label">{pt.label}</span>
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="adm-chart-legend">
        <div className="adm-legend-item">
          <span className="adm-legend-dot adm-dot-revenue" />
          <span>Gross Revenue</span>
        </div>
        <div className="adm-legend-item">
          <span className="adm-legend-dot adm-dot-profit" />
          <span>Est. Net Profit (62% margin)</span>
        </div>
      </div>
    </div>
  );
}

/* ── Top Selling Items Leaderboard ────────────────────────────── */
function TopItemsLeaderboard({ items = [] }) {
  if (!items || !Array.isArray(items) || items.length === 0) {
    return (
      <div className="adm-top-empty">
        <Flame size={24} />
        <p>No sales recorded yet to rank top dishes.</p>
      </div>
    );
  }

  return (
    <div className="adm-top-list">
      {items.map((item, idx) => {
        const rev = Number(item.totalRevenue) || 0;
        const avg = Number(item.averagePrice) || 0;
        const pop = Math.min(100, Math.max(8, Number(item.popularityPercent) || 8));
        const qty = Number(item.quantitySold) || 0;

        return (
          <div key={idx} className="adm-top-card">
            <div className="adm-top-rank">#{item.rank || idx + 1}</div>
            <div className="adm-top-body">
              <div className="adm-top-header">
                <span className="adm-top-name">{item.name || 'Menu Item'}</span>
                <span className="adm-top-rev">₹{rev.toLocaleString('en-IN')}</span>
              </div>
              <div className="adm-top-bar-bg">
                <div
                  className="adm-top-bar-fill"
                  style={{ width: `${pop}%` }}
                />
              </div>
              <div className="adm-top-meta">
                <span>{qty} units sold</span>
                <span>Avg ₹{avg}/unit</span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ── Main Admin Dashboard Page ────────────────────────────────── */
export default function AdminDashboard() {
  const [kpis, setKpis] = useState({
    todaySales: 0,
    todayOrdersCount: 0,
    weeklySales: 0,
    weeklyOrdersCount: 0,
    monthlySales: 0,
    monthlyOrdersCount: 0,
    totalRevenue: 0,
    totalOrders: 0,
    totalCustomers: 0,
  });
  const [salesPeriod, setSalesPeriod] = useState('daily'); // 'daily' | 'weekly' | 'monthly'
  const [trends, setTrends] = useState({ summary: {}, points: [] });
  const [trendPeriod, setTrendPeriod] = useState('daily');
  const [topItems, setTopItems] = useState([]);
  const [liveOrders, setLiveOrders] = useState([]);
  const [orderFilter, setOrderFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [selectedOrder, setSelectedOrder] = useState(null); // modal target

  // ── Fetch all dashboard data via axios with allSettled resilience ──────────────────────────
  const fetchDashboardData = useCallback(async (showToast = false) => {
    try {
      setRefreshing(true);
      const results = await Promise.allSettled([
        axiosInstance.get('/admin/kpis'),
        axiosInstance.get(`/admin/trends?period=${trendPeriod}`),
        axiosInstance.get('/admin/top-items?limit=8'),
        axiosInstance.get(`/admin/live-orders?status=${orderFilter}`),
      ]);

      const [kpisRes, trendsRes, topRes, ordersRes] = results;

      if (kpisRes.status === 'fulfilled' && kpisRes.value?.data?.data) {
        setKpis(kpisRes.value.data.data);
      }
      if (trendsRes.status === 'fulfilled' && trendsRes.value?.data?.data) {
        setTrends(trendsRes.value.data.data);
      }
      if (topRes.status === 'fulfilled' && Array.isArray(topRes.value?.data?.data)) {
        setTopItems(topRes.value.data.data);
      }
      if (ordersRes.status === 'fulfilled' && Array.isArray(ordersRes.value?.data?.data)) {
        setLiveOrders(ordersRes.value.data.data);
      }

      setLastUpdated(new Date());
      if (showToast) toast.success('Dashboard data refreshed');
    } catch (err) {
      console.error('[AdminDashboard] Failed to load metrics:', err);
      toast.error('Could not reach server — retrying in 30s');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [trendPeriod, orderFilter]);

  // ── Update order status action ──────────────────────────────────
  const handleStatusChange = async (orderId, newStatus) => {
    try {
      await axiosInstance.patch(`/admin/orders/${orderId}/status`, { status: newStatus });
      toast.success(`Order marked as ${STATUS_CONFIG[newStatus]?.label || newStatus}`);
      fetchDashboardData(false);
    } catch (err) {
      toast.error('Failed to update status');
    }
  };

  // ── Effect: initial fetch + 30-second polling interval ─────────
  useEffect(() => {
    document.title = 'Admin Panel & Dashboard — Dood Cafe';

    // Immediate first load
    fetchDashboardData();

    // Poll every 30 seconds to pick up new orders without WebSockets
    const pollTimer = setInterval(() => {
      fetchDashboardData();
    }, POLL_INTERVAL_MS);

    return () => clearInterval(pollTimer);
  }, [fetchDashboardData]);

  // Dynamic Sales Metrics according to selected period
  const currentSalesAmount =
    salesPeriod === 'weekly'
      ? kpis.weeklySales || 0
      : salesPeriod === 'monthly'
        ? kpis.monthlySales || 0
        : kpis.todaySales || 0;

  const currentOrdersCount =
    salesPeriod === 'weekly'
      ? kpis.weeklyOrdersCount || 0
      : salesPeriod === 'monthly'
        ? kpis.monthlyOrdersCount || 0
        : kpis.todayOrdersCount || 0;

  const currentPeriodLabel =
    salesPeriod === 'weekly'
      ? 'Past 7 Days Sales'
      : salesPeriod === 'monthly'
        ? 'Past 30 Days Sales'
        : "Today's Sales";

  const currentPeriodHint =
    salesPeriod === 'weekly'
      ? `${currentOrdersCount} orders this week`
      : salesPeriod === 'monthly'
        ? `${currentOrdersCount} orders this month`
        : `${currentOrdersCount} orders placed today`;

  return (
    <main className="adm-page">
      {/* ── Customer Detail Modal ── */}
      <CustomerDetailModal order={selectedOrder} onClose={() => setSelectedOrder(null)} />

      <div className="container">

        {/* ── Top Bar / Header ── */}
        <div className="adm-header">
          <div>
            <div className="adm-title-row">
              <h1 className="page-title" style={{ margin: 0 }}>Admin Dashboard</h1>
              {/* Polling status badge */}
              <div className={`adm-socket-badge ${lastUpdated ? 'adm-socket-live' : 'adm-socket-offline'}`}>
                <Radio size={14} className="adm-socket-icon" />
                <span>
                  {lastUpdated
                    ? `Live Sync: ${lastUpdated.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}`
                    : 'Loading data...'}
                </span>
              </div>
            </div>
            <p className="adm-sub">Database order history, aggregated sales trends & kitchen stream</p>
          </div>

          <button
            className="btn btn-secondary adm-refresh-btn"
            onClick={() => fetchDashboardData(true)}
            disabled={refreshing}
          >
            <RefreshCw size={15} className={refreshing ? 'adm-spin' : ''} />
            Refresh
          </button>
        </div>

        {/* ── KPI Stat Cards ── */}
        <div className="adm-kpi-grid">
          {/* Card 1: Interactive Daily / Weekly / Monthly Sales */}
          <div className="adm-kpi-card">
            <div className="adm-kpi-icon-wrap" style={{ background: '#FEF3C7', color: '#D97706' }}>
              <DollarSign size={20} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                <p className="adm-kpi-label" style={{ margin: 0 }}>{currentPeriodLabel}</p>
                <div style={{ display: 'flex', gap: 4 }}>
                  {[
                    { key: 'daily', label: '1D' },
                    { key: 'weekly', label: '7D' },
                    { key: 'monthly', label: '30D' },
                  ].map((btn) => (
                    <button
                      key={btn.key}
                      style={{
                        padding: '2px 6px',
                        fontSize: '0.7rem',
                        fontWeight: 600,
                        borderRadius: '4px',
                        border: 'none',
                        cursor: 'pointer',
                        background: salesPeriod === btn.key ? '#D97706' : '#F3F4F6',
                        color: salesPeriod === btn.key ? '#FFFFFF' : '#6B7280',
                      }}
                      onClick={() => setSalesPeriod(btn.key)}
                    >
                      {btn.label}
                    </button>
                  ))}
                </div>
              </div>
              <p className="adm-kpi-val">₹{currentSalesAmount.toLocaleString('en-IN')}</p>
              <span className="adm-kpi-hint">{currentPeriodHint}</span>
            </div>
          </div>

          {/* Card 2: All-Time Lifetime Revenue */}
          <div className="adm-kpi-card">
            <div className="adm-kpi-icon-wrap" style={{ background: '#EFF6FF', color: '#2563EB' }}>
              <TrendingUp size={20} />
            </div>
            <div>
              <p className="adm-kpi-label">All-Time Revenue</p>
              <p className="adm-kpi-val">₹{kpis.totalRevenue.toLocaleString('en-IN')}</p>
              <span className="adm-kpi-hint">{kpis.totalOrders} total lifetime orders</span>
            </div>
          </div>
        </div>

        {/* ── Middle Row: Trends Chart & Top Selling Items ── */}
        <div className="adm-analytics-grid">

          {/* Left: Sales & Profit/Loss Trends Chart */}
          <div className="adm-card adm-trends-card">
            <div className="adm-card-head">
              <div>
                <h3 className="adm-card-title">Order Revenue & Profit/Loss Trends</h3>
                <p className="adm-card-sub">Daily, weekly, and monthly revenue performance</p>
              </div>

              {/* Period Switcher */}
              <div className="adm-period-group">
                {['daily', 'weekly', 'monthly'].map((p) => (
                  <button
                    key={p}
                    className={`adm-period-btn ${trendPeriod === p ? 'adm-period-active' : ''}`}
                    onClick={() => setTrendPeriod(p)}
                  >
                    {p.charAt(0).toUpperCase() + p.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            {/* Quick Metrics Bar */}
            <div className="adm-period-summary">
              <div className="adm-summary-item">
                <span className="adm-sm-label">Period Revenue</span>
                <span className="adm-sm-val">₹{(trends.summary?.totalRevenue || 0).toLocaleString('en-IN')}</span>
              </div>
              <div className="adm-summary-item">
                <span className="adm-sm-label">Period Profit</span>
                <span className="adm-sm-val adm-text-green">₹{(trends.summary?.totalProfit || 0).toLocaleString('en-IN')}</span>
              </div>
              <div className="adm-summary-item">
                <span className="adm-sm-label">Total Volume</span>
                <span className="adm-sm-val">{trends.summary?.totalOrders || 0} orders</span>
              </div>
            </div>

            {/* Chart */}
            <TrendChart points={trends.points} period={trendPeriod} />
          </div>

          {/* Right: Top Selling Menu Items */}
          <div className="adm-card adm-top-card-container">
            <div className="adm-card-head">
              <div>
                <h3 className="adm-card-title">Top Selling Dishes</h3>
                <p className="adm-card-sub">Ranked by volume & customer demand</p>
              </div>
              <Flame size={18} className="adm-flame-icon" />
            </div>

            <TopItemsLeaderboard items={topItems} />
          </div>

        </div>

        {/* ── Bottom Section: Real-Time Live Order Stream ── */}
        <div className="adm-card adm-orders-card">
          <div className="adm-card-head">
            <div className="adm-live-title-box">
              <div className="adm-pulse-dot" />
              <h3 className="adm-card-title">Live Kitchen & Customer Order Stream</h3>
            </div>

            {/* Order Status Filters */}
            <div className="adm-filter-pills">
              {[
                { key: 'all', label: 'All Orders' },
                { key: 'pending', label: 'Placed' },
                { key: 'preparing', label: 'Preparing' },
                { key: 'ready', label: 'Ready for Pickup' },
              ].map((f) => (
                <button
                  key={f.key}
                  className={`adm-filter-pill ${orderFilter === f.key ? 'adm-pill-active' : ''}`}
                  onClick={() => setOrderFilter(f.key)}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {/* Live Orders List */}
          {liveOrders.length === 0 ? (
            <div className="adm-empty-orders">
              <ShoppingBag size={32} />
              <p>No active orders found for this filter.</p>
            </div>
          ) : (
            <div className="adm-orders-table-wrap">
              <table className="adm-orders-table">
                <thead>
                  <tr>
                    <th>Order</th>
                    <th>Customer</th>
                    <th>Items</th>
                    <th>Payment</th>
                    <th>Total</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {liveOrders.map((ord) => {
                    const statusMeta = STATUS_CONFIG[ord.status] || STATUS_CONFIG.pending;
                    const customerName = ord.user?.name || 'Customer';
                    const customerPhone = ord.user?.phone || 'No phone';

                    return (
                      <tr key={ord._id} className="adm-order-row">
                        <td className="adm-ord-id-col">
                          <div className="adm-ord-id-row">
                            <div className="adm-ord-header-line">
                              <strong className="adm-ord-num-lbl">Order #{ord.orderNumber || 1}</strong>
                              <button
                                id={`view-details-btn-${ord._id}`}
                                className="adm-view-details-btn"
                                onClick={() => setSelectedOrder(ord)}
                                title="View customer details"
                                aria-label={`View details for Order #${ord.orderNumber || 1}`}
                              >
                                <UserRound size={13} />
                                <span>View Details</span>
                              </button>
                            </div>
                            <span className="adm-ord-time">
                              {new Date(ord.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                        </td>
                        <td className="adm-cust-col">
                          <div className="adm-cust-info">
                            <span className="adm-cust-name">{customerName}</span>
                            <span className="adm-cust-contact">{customerPhone}</span>
                          </div>
                        </td>
                        <td className="adm-items-col">
                          <div className="adm-items-list">
                            {ord.items?.map((it, i) => (
                              <span key={i} className="adm-item-tag">
                                {it.name} <strong className="adm-qty">×{it.quantity}</strong>
                              </span>
                            ))}
                          </div>
                          {ord.specialInstructions && (
                            <p className="adm-inst-note">💬 {ord.specialInstructions}</p>
                          )}
                        </td>
                        <td>
                          <span className="adm-pay-badge">
                            {(ord.paymentMode || 'cash').toUpperCase()}
                          </span>
                        </td>
                        <td className="adm-total-col">
                          <strong>₹{ord.totalAmount}</strong>
                        </td>
                        <td>
                          <span
                            className="adm-status-badge"
                            style={{ color: statusMeta.color, background: statusMeta.bg }}
                          >
                            {statusMeta.label}
                          </span>
                        </td>
                        <td className="adm-action-col">
                          {statusMeta.next ? (
                            <button
                              className="btn btn-primary-sm adm-next-btn"
                              onClick={() => handleStatusChange(ord._id, statusMeta.next)}
                            >
                              Mark {STATUS_CONFIG[statusMeta.next]?.label}
                            </button>
                          ) : (
                            <span className="adm-done-tag">
                              <CheckCircle2 size={15} /> Completed
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>
    </main>
  );
}

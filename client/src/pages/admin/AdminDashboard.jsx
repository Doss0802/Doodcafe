import { useState, useEffect, useCallback } from 'react';
import {
  TrendingUp, DollarSign, ShoppingBag, Flame, CheckCircle2,
  RefreshCw, Radio, Sparkles
} from 'lucide-react';
import axiosInstance from '../../api/axiosInstance';
// Socket.io disabled — using axios polling instead
// import { connectAdminSocket, disconnectAdminSocket } from './adminSocket';
import toast from 'react-hot-toast';

const POLL_INTERVAL_MS = 30_000; // auto-refresh every 30 seconds

/* ── Status Meta Helper ───────────────────────────────────────── */
const STATUS_CONFIG = {
  pending:   { label: 'Placed',           color: '#D97706', bg: '#FEF3C7', next: 'preparing' },
  confirmed: { label: 'Placed',           color: '#D97706', bg: '#FEF3C7', next: 'preparing' },
  preparing: { label: 'Preparing',        color: '#2563EB', bg: '#EFF6FF', next: 'ready'     },
  ready:     { label: 'Ready for Pickup', color: '#059669', bg: '#ECFDF5', next: 'delivered' },
  delivered: { label: 'Completed',        color: '#10B981', bg: '#ECFDF5', next: null        },
  cancelled: { label: 'Cancelled',        color: '#EF4444', bg: '#FEF2F2', next: null        },
};

/* ── Interactive Trend Chart Component ────────────────────────── */
function TrendChart({ points = [], period = 'daily' }) {
  const [hoveredPoint, setHoveredPoint] = useState(null);

  if (!points || points.length === 0) {
    return (
      <div className="adm-chart-empty">
        <Sparkles size={28} className="adm-empty-icon" />
        <p>No sales trend data recorded for this timeframe yet.</p>
      </div>
    );
  }

  const maxVal = Math.max(...points.map((p) => Math.max(p.revenue, p.profit, 100)), 500);

  return (
    <div className="adm-chart-container">
      {/* Dynamic Hover Tooltip Info */}
      <div className="adm-chart-hover-banner">
        {hoveredPoint ? (
          <div className="adm-hover-pill">
            <span className="adm-hover-label">{hoveredPoint.label}:</span>
            <span className="adm-hover-rev">₹{hoveredPoint.revenue.toLocaleString('en-IN')} Revenue</span>
            <span className="adm-hover-sep">·</span>
            <span className="adm-hover-profit">₹{hoveredPoint.profit.toLocaleString('en-IN')} Est. Profit</span>
            <span className="adm-hover-sep">·</span>
            <span className="adm-hover-orders">{hoveredPoint.orders} orders</span>
          </div>
        ) : (
          <span className="adm-hover-hint">✦ Hover over bars to view detailed revenue & profit breakdown</span>
        )}
      </div>

      {/* Visual Bar Chart */}
      <div className="adm-bar-chart">
        {points.map((pt, idx) => {
          const revHeight = Math.max(8, Math.round((pt.revenue / maxVal) * 100));
          const profitHeight = Math.max(4, Math.round((pt.profit / maxVal) * 100));

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
  if (!items || items.length === 0) {
    return (
      <div className="adm-top-empty">
        <Flame size={24} />
        <p>No sales recorded yet to rank top dishes.</p>
      </div>
    );
  }

  return (
    <div className="adm-top-list">
      {items.map((item, idx) => (
        <div key={idx} className="adm-top-card">
          <div className="adm-top-rank">#{item.rank}</div>
          <div className="adm-top-body">
            <div className="adm-top-header">
              <span className="adm-top-name">{item.name}</span>
              <span className="adm-top-rev">₹{item.totalRevenue.toLocaleString('en-IN')}</span>
            </div>
            <div className="adm-top-bar-bg">
              <div
                className="adm-top-bar-fill"
                style={{ width: `${Math.max(8, item.popularityPercent)}%` }}
              />
            </div>
            <div className="adm-top-meta">
              <span>{item.quantitySold} units sold</span>
              <span>Avg ₹{item.averagePrice}/unit</span>
            </div>
          </div>
        </div>
      ))}
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

  // ── Fetch all dashboard data via axios ──────────────────────────
  const fetchDashboardData = useCallback(async (showToast = false) => {
    try {
      setRefreshing(true);
      const [kpisRes, trendsRes, topRes, ordersRes] = await Promise.all([
        axiosInstance.get('/admin/kpis'),
        axiosInstance.get(`/admin/trends?period=${trendPeriod}`),
        axiosInstance.get('/admin/top-items?limit=8'),
        axiosInstance.get(`/admin/live-orders?status=${orderFilter}`),
      ]);
      setKpis(kpisRes.data?.data || {});
      setTrends(trendsRes.data?.data || { summary: {}, points: [] });
      setTopItems(topRes.data?.data || []);
      setLiveOrders(ordersRes.data?.data || []);
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
                          <strong>Order #{ord.orderNumber || 1}</strong>
                          <span className="adm-ord-time">
                            {new Date(ord.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                          </span>
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

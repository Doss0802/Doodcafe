import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  TrendingUp,
  DollarSign,
  Flame,
  RefreshCw,
  Sparkles,
  Utensils,
  QrCode,
  Printer,
  ExternalLink,
  Coffee,
} from 'lucide-react';
import axiosInstance from '../../api/axiosInstance';
import toast from 'react-hot-toast';

if (!toast.info) {
  toast.info = (msg, options) => toast(msg, { icon: 'ℹ️', ...options });
}

const POLL_INTERVAL_MS = 30_000; // auto-refresh every 30 seconds

/* ── Interactive Trend Chart Component ────────────────────────── */
function TrendChart({ points = [], _period = 'daily' }) {
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
          <span className="adm-hover-hint"></span>
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
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);

  // ── Fetch dashboard analytics via axios with allSettled resilience ──
  const fetchDashboardData = useCallback(async (showToast = false) => {
    try {
      setRefreshing(true);
      const results = await Promise.allSettled([
        axiosInstance.get('/admin/kpis'),
        axiosInstance.get(`/admin/trends?period=${trendPeriod}`),
        axiosInstance.get('/admin/top-items?limit=8'),
      ]);

      const [kpisRes, trendsRes, topRes] = results;

      if (kpisRes.status === 'fulfilled' && kpisRes.value?.data?.data) {
        setKpis(kpisRes.value.data.data);
      }
      if (trendsRes.status === 'fulfilled' && trendsRes.value?.data?.data) {
        setTrends(trendsRes.value.data.data);
      }
      if (topRes.status === 'fulfilled' && Array.isArray(topRes.value?.data?.data)) {
        setTopItems(topRes.value.data.data);
      }

      setLastUpdated(new Date());
      if (showToast) toast.success('Dashboard data refreshed');
    } catch (err) {
      console.error('[AdminDashboard] Failed to load metrics:', err);
      toast.error('Could not reach server — retrying in 30s');
    } finally {
      setRefreshing(false);
    }
  }, [trendPeriod]);

  // ── Effect: initial fetch + 30-second polling interval ─────────
  useEffect(() => {
    document.title = 'Admin Panel & Dashboard — Dood Cafe';

    // Immediate first load
    fetchDashboardData();

    // Backup poll every 30 seconds
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

        {/* ── Admin Master Navigation Switcher Tabs ── */}
        <div className="bg-white rounded-xl shadow-sm border border-stone-200 p-1.5 flex gap-2 mb-6">
          <Link
            to="/admin"
            className="flex-1 py-2.5 px-4 rounded-lg font-bold text-sm flex items-center justify-center bg-amber-500 text-white shadow-sm"
          >
            <span>Dashboard Overview</span>
          </Link>
          <Link
            to="/staff/orders"
            className="flex-1 py-2.5 px-4 rounded-lg font-bold text-sm flex items-center justify-center text-stone-600 hover:bg-stone-100 transition-colors"
          >
            <span>Staff Orders & Live Delivery</span>
          </Link>
          <Link
            to="/admin/menu-management"
            id="admin-nav-menu-management"
            className="flex-1 py-2.5 px-4 rounded-lg font-bold text-sm flex items-center justify-center text-stone-600 hover:bg-stone-100 transition-colors"
          >
            <span>Menu Management</span>
          </Link>
        </div>

        {/* ── Top Bar / Header ── */}
        <div className="adm-header">
          <div>
            <div className="adm-title-row">
              <h1 className="page-title" style={{ margin: 0 }}>Admin Dashboard</h1>
              {/* Sync status badge */}
              <div className="adm-socket-badge adm-socket-live">
                <RefreshCw size={13} className={refreshing ? 'adm-spin' : ''} />
                <span>
                  {lastUpdated
                    ? `Synced: ${lastUpdated.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}`
                    : 'Loading...'}
                </span>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Link
              to="/admin/menu-management"
              className="btn btn-primary-sm inline-flex items-center gap-1.5 font-bold shadow-sm"
            >
              <Utensils size={15} />
              Menu Management
            </Link>
            <button
              className="btn btn-secondary adm-refresh-btn"
              onClick={() => fetchDashboardData(true)}
              disabled={refreshing}
            >
              <RefreshCw size={15} className={refreshing ? 'adm-spin' : ''} />
              Refresh
            </button>
          </div>
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

        {/* ── Table QR Codes Generator Section ── */}
        <TableQrCodesSection />

      </div>
    </main>
  );
}

/* ── Table QR Codes Generator Component ───────────────────────────── */
function TableQrCodesSection() {
  const [tableCount, setTableCount] = useState(10);
  const productionDomain = 'https://doodcafe-frontend.onrender.com';

  const count = Math.max(1, Math.min(10, parseInt(tableCount, 10) || 1));
  const tableNumbers = Array.from({ length: count }, (_, i) => i + 1);

  const handlePrintAll = () => {
    window.print();
  };

  return (
    <div className="adm-table-qr-section bg-white border border-stone-200 rounded-3xl p-6 sm:p-7 shadow-xs mt-8">
      <style>{`
        @media print {
          body * {
            visibility: hidden !important;
          }
          .adm-table-qr-section, .adm-table-qr-section * {
            visibility: visible !important;
          }
          .adm-table-qr-section {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            border: none !important;
            box-shadow: none !important;
            padding: 0 !important;
          }
          .adm-table-qr-print-hide {
            display: none !important;
          }
          .adm-table-qr-grid {
            display: grid !important;
            grid-template-columns: repeat(2, 1fr) !important;
            gap: 1.5rem !important;
          }
          .adm-table-qr-card {
            break-inside: avoid !important;
            border: 2px solid #000 !important;
            box-shadow: none !important;
          }
        }
      `}</style>

      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-stone-100">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-600 flex items-center justify-center font-bold">
              <QrCode size={20} />
            </div>
            <div>
              <h3 className="font-extrabold text-stone-900 text-lg sm:text-xl tracking-tight">
                Table QR Codes
              </h3>
              <p className="text-xs text-stone-500 font-medium mt-0.5">
                Generate and print table-specific QR codes for contactless dine-in ordering
              </p>
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-3 adm-table-qr-print-hide flex-wrap">
          <div className="flex items-center gap-2 bg-stone-50 border border-stone-200 rounded-xl px-3 py-1.5 shadow-2xs">
            <span className="text-xs font-bold text-stone-600">Total Tables:</span>
            <input
              type="number"
              min="1"
              max="10"
              value={tableCount}
              onChange={(e) => setTableCount(e.target.value)}
              className="w-16 px-2 py-1 bg-white border border-stone-300 rounded-lg text-sm font-black text-stone-900 text-center focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>

          <button
            type="button"
            onClick={handlePrintAll}
            className="px-4 py-2.5 bg-stone-900 hover:bg-black text-white text-xs font-bold rounded-xl flex items-center gap-2 shadow-xs transition active:scale-95 cursor-pointer"
          >
            <Printer size={15} />
            <span>Print All QR Cards</span>
          </button>
        </div>
      </div>

      {/* Target URL Info Banner */}
      <div className="bg-stone-50 border border-stone-200/80 rounded-2xl px-4 py-3 mt-4 text-xs text-stone-600 flex items-center justify-between gap-3 flex-wrap adm-table-qr-print-hide">
        <div>
          <span className="font-bold text-stone-800">QR Encodes: </span>
          <code className="text-amber-700 font-mono font-bold">{productionDomain}/checkout?type=dinein&table=N</code>
        </div>
        <span className="text-[11px] text-stone-400 font-medium">
          Ready for cafe acrylic table display stands
        </span>
      </div>

      {/* Grid of Printable Table Cards */}
      <div className="adm-table-qr-grid grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mt-6">
        {tableNumbers.map((num) => {
          const qrTargetUrl = `${productionDomain}/checkout?type=dinein&table=${num}`;
          const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(qrTargetUrl)}&margin=8`;

          return (
            <div
              key={num}
              className="adm-table-qr-card bg-white border-2 border-stone-200 hover:border-amber-400 rounded-3xl p-5 flex flex-col items-center text-center shadow-xs transition group"
            >
              {/* Brand Header */}
              <div className="flex items-center gap-1.5 text-amber-600 font-black text-xs uppercase tracking-widest mb-1">
                <Coffee size={14} />
                <span>Dood Cafe</span>
              </div>

              {/* Table Number Title */}
              <div className="text-2xl font-black text-stone-900 tracking-tight font-mono mb-0.5">
                TABLE {num}
              </div>
              <p className="text-[10px] font-bold text-stone-400 uppercase tracking-wider mb-3">
                Scan with Phone Camera to Order
              </p>

              {/* QR Image Box */}
              <div className="p-2.5 bg-white border border-stone-100 rounded-2xl shadow-2xs group-hover:scale-102 transition-transform">
                <img
                  src={qrImageUrl}
                  alt={`QR code for Table ${num}`}
                  width={180}
                  height={180}
                  className="rounded-xl block"
                  loading="lazy"
                />
              </div>

              {/* URL Preview */}
              <span className="text-[10px] font-mono text-stone-400 mt-3 truncate max-w-full block">
                {productionDomain}/checkout?type=dinein&table={num}
              </span>

              {/* Quick Actions (Screen Only) */}
              <div className="mt-3.5 pt-3 border-t border-stone-100 w-full flex items-center justify-between text-xs adm-table-qr-print-hide">
                <a
                  href={qrTargetUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-stone-500 hover:text-amber-600 font-bold inline-flex items-center gap-1 text-[11px] transition"
                  title="Test link in new tab"
                >
                  <ExternalLink size={12} />
                  <span>Test Link</span>
                </a>
                <a
                  href={qrImageUrl}
                  download={`DoodCafe_Table_${num}_QR.png`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-amber-600 hover:text-amber-700 font-bold text-[11px]"
                >
                  Download PNG
                </a>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

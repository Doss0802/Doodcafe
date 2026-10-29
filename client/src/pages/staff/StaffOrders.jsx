import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Package,
  UtensilsCrossed,
  Search,
  CheckCircle2,
  AlertCircle,
  Phone,
  RefreshCw,
  X,
  Clock,
  Radio,
  ShoppingBag,
  ShieldCheck,
  AlertTriangle,
  ChefHat,
} from 'lucide-react';
import axiosInstance from '../../api/axiosInstance';
import { useOrderStream } from './components/useStaffOrderStream';
import LiveKitchen from './components/StaffLiveKitchen';
import OrderStream from './components/StaffOrderStream';
import toast from 'react-hot-toast';

/* ─── Static Tailwind Badge Lookup Maps (Strict Tailwind v4 Compliant) ─── */
const PAYMENT_BADGE_CLASSES = {
  paid: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  pending: 'bg-amber-50 text-amber-700 border-amber-200',
  cod: 'bg-blue-50 text-blue-700 border-blue-200',
};

const STATUS_BADGE_CLASSES = {
  pending: 'bg-amber-50 text-amber-700 border-amber-200',
  confirmed: 'bg-amber-50 text-amber-700 border-amber-200',
  preparing: 'bg-blue-50 text-blue-700 border-blue-200',
  ready: 'bg-purple-50 text-purple-700 border-purple-200',
  delivered: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  handed_over: 'bg-emerald-100 text-emerald-800 border-emerald-300 font-bold',
  cancelled: 'bg-rose-50 text-rose-700 border-rose-200',
};

const PAYMENT_LABELS = {
  paid: 'Paid (Online / UPI)',
  pending: 'Payment Pending',
  cod: 'Cash on Delivery (COD)',
};

/* ─── Reusable Card Component ─── */
const Card = ({ children, className = '' }) => (
  <div className={`bg-white border border-stone-200 shadow-sm rounded-2xl ${className}`}>
    {children}
  </div>
);

export default function StaffOrders() {
  const [activeTab, setActiveTab] = useState('takeaway'); // 'takeaway' | 'dine-in' | 'kitchen' | 'stream'
  const [takeawayOrders, setTakeawayOrders] = useState([]);
  const [dineInOrders, setDineInOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);

  // Takeaway Search & Lookup State
  const [searchBillQuery, setSearchBillQuery] = useState('');
  const [searchedOrder, setSearchedOrder] = useState(null);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState(null);
  const [confirmingHandoverOrder, setConfirmingHandoverOrder] = useState(null);
  const [actionLoadingId, setActionLoadingId] = useState(null);

  // Filters
  const [takeawayFilter, setTakeawayFilter] = useState('pending'); // 'pending' | 'handed_over' | 'all'
  const [dineInFilter, setDineInFilter] = useState('all'); // 'all' | 'paid' | 'pending' | 'cod'

  const searchInputRef = useRef(null);

  // ─── Fetch Orders for Active Tab ───
  const fetchOrders = useCallback(async (isSilent = false) => {
    if (!isSilent) setRefreshing(true);
    try {
      const [takeawayRes, dineInRes] = await Promise.allSettled([
        axiosInstance.get('/staff/orders?type=takeaway&status=all'),
        axiosInstance.get('/staff/orders?type=dine-in&paymentStatus=all'),
      ]);

      if (takeawayRes.status === 'fulfilled' && takeawayRes.value?.data?.data) {
        setTakeawayOrders(takeawayRes.value.data.data);
      }
      if (dineInRes.status === 'fulfilled' && dineInRes.value?.data?.data) {
        setDineInOrders(dineInRes.value.data.data);
      }

      setLastUpdated(new Date());
    } catch (err) {
      console.error('[StaffOrders] Fetch error:', err);
      if (!isSilent) toast.error('Failed to update orders. Will auto-retry.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // --- Live Socket Sync + 10s Polling ---
  useEffect(() => {
    fetchOrders(false);

    // 10s Background Polling (paused when tab is hidden)
    const interval = setInterval(() => {
      if (!document.hidden) fetchOrders(true);
    }, 10000);

    const handleVisibilityChange = () => {
      if (!document.hidden) fetchOrders(true);
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [fetchOrders]);

  // --- useOrderStream for Live Kitchen + Order Stream (owns socket singleton) ---
  const {
    orders: liveOrders,
    loading: liveLoading,
    updateOrderStatus: handleKitchenStatusChange,
    isSocketConnected: isSocketLive,
  } = useOrderStream({
    role: 'staff',
    orderFilter: 'all',
    onNewOrder: (freshOrder) => {
      const orderNum = freshOrder?.billNumber || freshOrder?.orderNumber || (freshOrder?.id ? String(freshOrder.id).slice(-5) : '');
      toast.success('🔔 New order arrived! #' + orderNum);
      fetchOrders(true);
    },
    onStatusUpdate: () => {
      fetchOrders(true);
    },
  });

  // Focus search input on initial mount or when switching to takeaway tab
  useEffect(() => {
    if (activeTab === 'takeaway' && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [activeTab]);

  // ─── Search / Verify Bill Number ───
  const handleSearchBill = async (e) => {
    if (e) e.preventDefault();
    const query = searchBillQuery.trim();
    if (!query) {
      setSearchedOrder(null);
      setSearchError(null);
      return;
    }

    setSearchLoading(true);
    setSearchError(null);
    setSearchedOrder(null);

    try {
      const res = await axiosInstance.get(`/staff/orders/lookup/${encodeURIComponent(query)}`);
      if (res?.data?.data) {
        setSearchedOrder(res.data.data);
      } else {
        setSearchError('No order found for this bill number');
      }
    } catch (err) {
      const msg = err.response?.data?.message || 'No order found for this bill number';
      setSearchError(msg);
    } finally {
      setSearchLoading(false);
    }
  };

  const handleClearSearch = () => {
    setSearchBillQuery('');
    setSearchedOrder(null);
    setSearchError(null);
    if (searchInputRef.current) searchInputRef.current.focus();
  };

  // ─── Mark as Handed Over Handler ───
  const handleHandover = async (orderId) => {
    setActionLoadingId(orderId);
    try {
      await axiosInstance.patch(`/staff/orders/${orderId}/handover`);
      toast.success('✅ Parcel marked as Handed Over!');
      setConfirmingHandoverOrder(null);

      // Refresh orders and update searched card if applicable
      fetchOrders(true);
      if (searchedOrder && searchedOrder.id === orderId) {
        setSearchedOrder({
          ...searchedOrder,
          status: 'handed_over',
          handedOverAt: new Date().toISOString(),
        });
      }
    } catch (err) {
      const status = err.response?.status;
      const msg = err.response?.data?.message || 'Failed to complete handover';
      if (status === 409) {
        toast.error(`⚠️ ${msg}`);
        if (searchedOrder && searchedOrder.id === orderId) {
          setSearchedOrder({
            ...searchedOrder,
            status: 'handed_over',
            handedOverAt: err.response?.data?.data?.handedOverAt || new Date().toISOString(),
          });
        }
      } else {
        toast.error(msg);
      }
    } finally {
      setActionLoadingId(null);
    }
  };

  // ─── Filtered Lists ───
  const displayedTakeawayOrders = takeawayOrders.filter((ord) => {
    if (takeawayFilter === 'pending') return ord.status !== 'handed_over';
    if (takeawayFilter === 'handed_over') return ord.status === 'handed_over';
    return true;
  });

  const displayedDineInOrders = dineInOrders.filter((ord) => {
    if (dineInFilter === 'all') return true;
    return ord.paymentStatus === dineInFilter;
  });

  // Count Badges for Tabs
  const pendingTakeawayCount = takeawayOrders.filter((o) => o.status !== 'handed_over').length;
  const pendingDineInCount = dineInOrders.length;

  return (
    <main className="min-h-screen bg-stone-50 text-stone-900 pb-24 xl:pb-0 pt-4 sm:pt-6 font-sans">
      <div className="container max-w-7xl mx-auto px-4">
        {/* ── Page Header & Controls: Compact row on mobile ── */}
        <div className="flex flex-wrap items-center justify-between gap-2 mb-6">
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl sm:text-2xl md:text-3xl font-extrabold text-stone-900 tracking-tight">
              Staff Counter Orders
            </h1>
            {/* WebSocket Live Indicator */}
            <div
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${
                isSocketLive
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : 'bg-amber-50 text-amber-700 border-amber-200'
              }`}
            >
              <Radio size={12} className={isSocketLive ? 'animate-pulse text-emerald-600' : 'text-amber-600'} />
              <span className="hidden sm:inline">{isSocketLive ? 'Live Sync' : 'Polling (10s)'}</span>
              <span className="sm:hidden">{isSocketLive ? 'Live' : 'Poll'}</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => fetchOrders(false)}
              disabled={refreshing}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-white border border-stone-200 rounded-xl text-stone-700 font-semibold text-xs sm:text-sm shadow-sm hover:bg-stone-50 transition active:scale-95 disabled:opacity-50 min-h-[40px]"
              title="Manual Refresh"
            >
              <RefreshCw size={14} className={refreshing ? 'animate-spin text-amber-600' : 'text-stone-500'} />
              <span>{refreshing ? 'Refreshing…' : 'Refresh'}</span>
            </button>
            {lastUpdated && (
              <span className="text-xs text-stone-400 font-medium hidden md:inline">
                {lastUpdated.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              </span>
            )}
          </div>
        </div>

        {/* ── Desktop Tab Switcher (xl screens only) ── */}
        <div className="hidden xl:flex bg-stone-200/70 p-1.5 rounded-2xl gap-2 mb-6 max-w-md">
          <button
            type="button"
            onClick={() => setActiveTab('takeaway')}
            className={`flex-1 py-2.5 px-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all shadow-sm ${
              activeTab !== 'dine-in'
                ? 'bg-amber-500 text-white shadow-md'
                : 'bg-transparent text-stone-600 hover:text-stone-900 hover:bg-stone-200/50'
            }`}
          >
            <Package size={17} />
            <span>Takeaway Counter</span>
            <span
              className={`text-xs px-2 py-0.5 rounded-full font-extrabold ${
                activeTab !== 'dine-in' ? 'bg-amber-600 text-amber-100' : 'bg-stone-300 text-stone-700'
              }`}
            >
              {pendingTakeawayCount}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('dine-in')}
            className={`flex-1 py-2.5 px-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all shadow-sm ${
              activeTab === 'dine-in'
                ? 'bg-amber-500 text-white shadow-md'
                : 'bg-transparent text-stone-600 hover:text-stone-900 hover:bg-stone-200/50'
            }`}
          >
            <UtensilsCrossed size={17} />
            <span>Dine-in Tickets</span>
            <span
              className={`text-xs px-2 py-0.5 rounded-full font-extrabold ${
                activeTab === 'dine-in' ? 'bg-amber-600 text-amber-100' : 'bg-stone-300 text-stone-700'
              }`}
            >
              {pendingDineInCount}
            </span>
          </button>
        </div>

        {/* ── 2-Column Grid on xl ── */}
        <div className="xl:grid xl:grid-cols-[1fr_440px] xl:gap-6 xl:items-start">

          {/* ── LEFT: Orders tabs (Takeaway / Dine-in) ── */}
          <div>

            {/* ═══════════════════════════════════════════════════════════════
                TAB 1: TAKEAWAY (Bill Lookup & Handover Flow)
            ═══════════════════════════════════════════════════════════════ */}
            {(activeTab === 'takeaway' || activeTab === 'kitchen' || activeTab === 'stream') && (
              <div className={activeTab !== 'takeaway' ? 'hidden xl:block space-y-6' : 'space-y-6'}>
                {/* 1. Sticky Bill Number Lookup Card */}
                <div className="sticky top-0 z-10 bg-stone-50 pt-2 pb-3 -mx-4 px-4">
                  <Card className="p-4 sm:p-6 border-amber-200 bg-gradient-to-b from-amber-50/40 via-white to-white shadow-sm">
                    <div className="max-w-3xl">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-7 h-7 rounded-lg bg-amber-500/10 text-amber-600 flex items-center justify-center font-bold">
                          <Search size={16} />
                        </div>
                        <h2 className="text-base sm:text-lg md:text-xl font-bold text-stone-900">
                          Verify Customer Bill Number
                        </h2>
                      </div>
                      <p className="text-stone-600 text-xs sm:text-sm mb-3">
                        Enter bill or order number to pull the verified ticket and hand over the parcel.
                      </p>

                      <form onSubmit={handleSearchBill} className="flex flex-col sm:flex-row gap-2.5">
                        <div className="relative flex-1">
                          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" size={18} />
                          <input
                            ref={searchInputRef}
                            type="text"
                            id="staff-bill-search-input"
                            value={searchBillQuery}
                            onChange={(e) => setSearchBillQuery(e.target.value)}
                            placeholder="e.g. ORD-1001 or 1001"
                            className="w-full pl-10 pr-9 py-3 rounded-xl border-2 border-stone-300 bg-white text-stone-900 text-base font-bold tracking-wide placeholder-stone-400 shadow-sm focus:outline-none focus:ring-4 focus:ring-amber-500/20 focus:border-amber-500 transition"
                          />
                          {searchBillQuery && (
                            <button
                              type="button"
                              onClick={handleClearSearch}
                              className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-stone-400 hover:text-stone-700 transition"
                              title="Clear search"
                            >
                              <X size={16} />
                            </button>
                          )}
                        </div>
                        <button
                          type="submit"
                          disabled={searchLoading || !searchBillQuery.trim()}
                          className="px-5 py-3 min-h-[48px] bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-white font-bold rounded-xl text-sm sm:text-base shadow-md transition disabled:opacity-50 flex items-center justify-center gap-2 sm:min-w-[140px]"
                        >
                          {searchLoading ? (
                            <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          ) : (
                            <>
                              <ShieldCheck size={18} />
                              <span>Verify Bill</span>
                            </>
                          )}
                        </button>
                      </form>

                      {/* Not Found Alert */}
                      {searchError && (
                        <div className="mt-3 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 flex items-start gap-2.5 animate-fadeIn">
                          <AlertCircle className="text-rose-500 mt-0.5 flex-shrink-0" size={16} />
                          <div>
                            <h4 className="font-bold text-xs sm:text-sm">Order Verification Failed</h4>
                            <p className="text-xs text-rose-700 mt-0.5">{searchError}</p>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Search Result Detail Card */}
                    {searchedOrder && (
                      <div className="mt-4 pt-4 border-t border-stone-200 animate-fadeIn">
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-xs font-bold text-stone-400 uppercase tracking-wider">
                            Verified Result Ticket
                          </span>
                          <button
                            onClick={handleClearSearch}
                            className="text-xs font-semibold text-stone-500 hover:text-stone-900"
                          >
                            Close Card
                          </button>
                        </div>
                        <TakeawayOrderCard
                          order={searchedOrder}
                          isHighlighted={true}
                          onStartHandover={setConfirmingHandoverOrder}
                        />
                      </div>
                    )}
                  </Card>
                </div>

                {/* 2. Today's Takeaway Orders List */}
                <div className="space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <h3 className="text-lg sm:text-xl font-bold text-stone-900">Today's Takeaway Orders</h3>
                      <p className="text-stone-500 text-xs mt-0.5">
                        Orders placed today for counter pickup (newest first)
                      </p>
                    </div>

                    {/* Filter Chips: horizontal scrollable with snap */}
                    <div className="flex overflow-x-auto gap-2 pb-1 snap-x no-scrollbar">
                      {[
                        { key: 'pending', label: 'Pending Handover' },
                        { key: 'handed_over', label: 'Handed Over' },
                        { key: 'all', label: 'All Today' },
                      ].map((f) => (
                        <button
                          key={f.key}
                          onClick={() => setTakeawayFilter(f.key)}
                          className={`snap-start flex-shrink-0 min-h-[44px] flex items-center px-4 py-2 rounded-full text-sm font-semibold transition ${
                            takeawayFilter === f.key
                              ? 'bg-stone-900 text-white shadow-sm'
                              : 'bg-stone-200/70 text-stone-600 hover:text-stone-900 hover:bg-stone-200'
                          }`}
                        >
                          {f.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {loading ? (
                    <div className="py-20 text-center">
                      <span className="w-8 h-8 border-3 border-amber-500 border-t-transparent rounded-full animate-spin inline-block mb-3" />
                      <p className="text-stone-500 text-sm font-medium">Loading takeaway orders…</p>
                    </div>
                  ) : displayedTakeawayOrders.length === 0 ? (
                    <Card className="p-10 text-center text-stone-500">
                      <ShoppingBag size={36} className="mx-auto mb-3 text-stone-400 stroke-1" />
                      <h4 className="font-bold text-base text-stone-700">No Takeaway Orders</h4>
                      <p className="text-xs text-stone-400 mt-1 max-w-sm mx-auto">
                        No takeaway orders matching this filter were placed today.
                      </p>
                    </Card>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                      {displayedTakeawayOrders.map((ord) => (
                        <TakeawayOrderCard
                          key={ord.id}
                          order={ord}
                          onStartHandover={setConfirmingHandoverOrder}
                        />
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ═══════════════════════════════════════════════════════════════
                TAB 2: DINE-IN (Read-Only Customer Orders & Payment Status)
            ═══════════════════════════════════════════════════════════════ */}
            {activeTab === 'dine-in' && (
              <div className="space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-stone-900">
                      Today's Dine-in Food Orders
                    </h2>
                    <p className="text-stone-500 text-xs mt-0.5">
                      Read-only kitchen & counter view of dine-in customers, items ordered, and payment status.
                    </p>
                  </div>

                  {/* Payment Filter Chips: horizontal scrollable with snap */}
                  <div className="flex overflow-x-auto gap-2 pb-1 snap-x no-scrollbar">
                    {[
                      { key: 'all', label: 'All Orders' },
                      { key: 'paid', label: 'Paid' },
                      { key: 'pending', label: 'Pending' },
                      { key: 'cod', label: 'COD / Counter' },
                    ].map((f) => (
                      <button
                        key={f.key}
                        onClick={() => setDineInFilter(f.key)}
                        className={`snap-start flex-shrink-0 min-h-[44px] flex items-center px-4 py-2 rounded-full text-sm font-semibold transition ${
                          dineInFilter === f.key
                            ? 'bg-stone-900 text-white shadow-sm'
                            : 'bg-stone-200/70 text-stone-600 hover:text-stone-900 hover:bg-stone-200'
                        }`}
                      >
                        {f.label}
                      </button>
                    ))}
                  </div>
                </div>

                {loading ? (
                  <div className="py-20 text-center">
                    <span className="w-8 h-8 border-3 border-amber-500 border-t-transparent rounded-full animate-spin inline-block mb-3" />
                    <p className="text-stone-500 text-sm font-medium">Loading dine-in orders…</p>
                  </div>
                ) : displayedDineInOrders.length === 0 ? (
                  <Card className="p-10 text-center text-stone-500">
                    <UtensilsCrossed size={36} className="mx-auto mb-3 text-stone-400 stroke-1" />
                    <h4 className="font-bold text-base text-stone-700">No Dine-in Orders Today</h4>
                    <p className="text-xs text-stone-400 mt-1 max-w-sm mx-auto">
                      No dine-in orders have been placed for this filter today.
                    </p>
                  </Card>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                    {displayedDineInOrders.map((ord) => (
                      <DineInOrderCard key={ord.id} order={ord} />
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>{/* end left column */}

          {/* ── Mobile Kitchen Tab (below xl only) ── */}
          {activeTab === 'kitchen' && (
            <div className="xl:hidden">
              <LiveKitchen
                orders={liveOrders}
                loading={liveLoading}
                onStatusChange={handleKitchenStatusChange}
                role="staff"
              />
            </div>
          )}

          {/* ── Mobile Stream Tab (below xl only) ── */}
          {activeTab === 'stream' && (
            <div className="xl:hidden">
              <OrderStream
                orders={liveOrders}
                loading={liveLoading}
                onStatusChange={handleKitchenStatusChange}
                role="staff"
              />
            </div>
          )}

          {/* ── RIGHT: Live Kitchen + Order Stream (xl only, stacked) ── */}
          <div className="hidden xl:flex xl:flex-col gap-4">
            <div className="max-h-[480px] overflow-y-auto rounded-2xl">
              <LiveKitchen
                orders={liveOrders}
                loading={liveLoading}
                onStatusChange={handleKitchenStatusChange}
                role="staff"
              />
            </div>
            <div className="max-h-[420px] overflow-y-auto rounded-2xl">
              <OrderStream
                orders={liveOrders}
                loading={liveLoading}
                onStatusChange={handleKitchenStatusChange}
                role="staff"
              />
            </div>
          </div>

        </div>{/* end xl:grid */}
      </div>

      {/* ── Fixed Bottom Tab Bar for below-xl screens ── */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 xl:hidden bg-white border-t border-stone-200 flex pb-[env(safe-area-inset-bottom)] shadow-lg">
        <button
          type="button"
          onClick={() => setActiveTab('takeaway')}
          className={`flex-1 flex flex-col items-center justify-center gap-0.5 py-3 min-h-[56px] text-[11px] font-semibold transition-colors ${
            activeTab === 'takeaway' ? 'text-amber-600' : 'text-stone-500'
          }`}
        >
          <div className="relative">
            <Package size={20} />
            {pendingTakeawayCount > 0 && (
              <span className="absolute -top-1.5 -right-2 bg-amber-500 text-white text-[10px] font-bold px-1.5 py-0.2 rounded-full leading-tight">
                {pendingTakeawayCount}
              </span>
            )}
          </div>
          <span>Takeaway</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('dine-in')}
          className={`flex-1 flex flex-col items-center justify-center gap-0.5 py-3 min-h-[56px] text-[11px] font-semibold transition-colors ${
            activeTab === 'dine-in' ? 'text-amber-600' : 'text-stone-500'
          }`}
        >
          <div className="relative">
            <UtensilsCrossed size={20} />
            {pendingDineInCount > 0 && (
              <span className="absolute -top-1.5 -right-2 bg-amber-500 text-white text-[10px] font-bold px-1.5 py-0.2 rounded-full leading-tight">
                {pendingDineInCount}
              </span>
            )}
          </div>
          <span>Dine-in</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('kitchen')}
          className={`flex-1 flex flex-col items-center justify-center gap-0.5 py-3 min-h-[56px] text-[11px] font-semibold transition-colors ${
            activeTab === 'kitchen' ? 'text-amber-600' : 'text-stone-500'
          }`}
        >
          <ChefHat size={20} />
          <span>Live Delivery</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('stream')}
          className={`flex-1 flex flex-col items-center justify-center gap-0.5 py-3 min-h-[56px] text-[11px] font-semibold transition-colors ${
            activeTab === 'stream' ? 'text-amber-600' : 'text-stone-500'
          }`}
        >
          <Radio size={20} />
          <span>All Orders</span>
        </button>
      </nav>

      {/* ── Bottom-Sheet Handover Confirmation Modal ── */}
      {confirmingHandoverOrder && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/50 backdrop-blur-xs animate-fadeIn"
          onClick={(e) => {
            if (e.target === e.currentTarget && !actionLoadingId) {
              setConfirmingHandoverOrder(null);
            }
          }}
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-white fixed sm:relative inset-x-0 bottom-0 sm:inset-auto rounded-t-3xl sm:rounded-3xl max-w-lg w-full max-h-[90vh] flex flex-col shadow-2xl border border-stone-200 overflow-hidden animate-slideUp sm:animate-scaleUp p-5 sm:p-6 space-y-4 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center font-bold">
                  <CheckCircle2 size={22} />
                </div>
                <div>
                  <h3 className="font-extrabold text-stone-900 text-lg">Confirm Handover</h3>
                  <p className="text-xs text-stone-500">Handing parcel over to customer</p>
                </div>
              </div>
              <button
                onClick={() => setConfirmingHandoverOrder(null)}
                disabled={!!actionLoadingId}
                className="p-2 rounded-full hover:bg-stone-100 text-stone-400 hover:text-stone-700 transition"
                aria-label="Close confirmation"
              >
                <X size={20} />
              </button>
            </div>

            <div className="bg-stone-50 rounded-2xl p-4 border border-stone-100 space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-stone-500 text-xs">Bill / Order:</span>
                <span className="font-mono font-extrabold text-stone-900 text-base">
                  {confirmingHandoverOrder.billNumber || `#ORD-${confirmingHandoverOrder.orderNumber}`}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-stone-500 text-xs">Customer:</span>
                <span className="font-bold text-stone-900">
                  {confirmingHandoverOrder.customerName || 'Customer'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-stone-500 text-xs">Total Amount:</span>
                <span className="font-extrabold text-stone-900">
                  ₹{Number(confirmingHandoverOrder.totalAmount || 0).toLocaleString('en-IN')}
                </span>
              </div>
            </div>

            {confirmingHandoverOrder.paymentStatus === 'pending' && (
              <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-center gap-2 font-semibold">
                <AlertTriangle size={16} className="text-amber-600 flex-shrink-0" />
                <span>Payment is PENDING! Collect ₹{confirmingHandoverOrder.totalAmount} before parcel handover.</span>
              </div>
            )}

            <div className="space-y-2 pt-2">
              <button
                type="button"
                onClick={() => handleHandover(confirmingHandoverOrder.id)}
                disabled={actionLoadingId === confirmingHandoverOrder.id}
                className="w-full py-3 min-h-[52px] bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-base font-bold shadow-md transition active:scale-98 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {actionLoadingId === confirmingHandoverOrder.id ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <CheckCircle2 size={18} />
                    <span>Confirm & Mark Handed Over</span>
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={() => setConfirmingHandoverOrder(null)}
                disabled={actionLoadingId === confirmingHandoverOrder.id}
                className="w-full py-3 min-h-[52px] bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xl text-base font-semibold transition flex items-center justify-center"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

/* ─── Takeaway Order Card Component ─── */
function TakeawayOrderCard({
  order,
  isHighlighted = false,
  onStartHandover,
}) {
  const isHandedOver = order.status === 'handed_over';
  const isPaymentPending = order.paymentStatus === 'pending';

  const paymentClass = PAYMENT_BADGE_CLASSES[order.paymentStatus] || PAYMENT_BADGE_CLASSES.pending;
  const statusClass = STATUS_BADGE_CLASSES[order.status] || STATUS_BADGE_CLASSES.pending;

  return (
    <Card
      className={`p-4 sm:p-5 transition-all flex flex-col justify-between ${
        isHighlighted
          ? 'ring-2 ring-amber-500 shadow-md bg-white'
          : isHandedOver
          ? 'bg-stone-50/70 opacity-90'
          : 'hover:border-amber-300'
      }`}
    >
      <div>
        {/* Header: Bill / Order No & Status */}
        <div className="flex items-start justify-between gap-3 pb-3 border-b border-stone-100">
          <div>
            <span className="text-[10px] font-extrabold text-stone-400 uppercase tracking-widest block">
              Bill / Order No
            </span>
            <div className="text-lg sm:text-xl font-extrabold text-stone-900 tracking-tight flex items-center gap-2 font-mono">
              <span>{order.billNumber || `#ORD-${order.orderNumber}`}</span>
            </div>
            <span className="text-xs text-stone-400 flex items-center gap-1 mt-0.5">
              <Clock size={12} />
              {new Date(order.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>

          <div className="flex flex-col items-end gap-1.5">
            <span className={`px-2.5 py-1 rounded-full text-xs font-bold border ${paymentClass}`}>
              {PAYMENT_LABELS[order.paymentStatus] || order.paymentStatus}
            </span>
            <span className={`px-2 py-0.5 rounded-md text-[11px] font-semibold border ${statusClass}`}>
              {order.status === 'handed_over' ? '✓ Handed Over' : order.status}
            </span>
          </div>
        </div>

        {/* Customer Details: Name, Phone, Location */}
        <div className="py-3.5 space-y-2 border-b border-stone-100 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-stone-500 font-medium text-xs">Customer Name:</span>
            <span className="font-bold text-stone-900">{order.customerName || 'Customer'}</span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-stone-500 font-medium text-xs">Phone Number:</span>
            {order.customerPhone ? (
              <a
                href={`tel:${order.customerPhone}`}
                className="font-bold text-amber-600 hover:text-amber-700 flex items-center gap-1 bg-amber-50 px-2 py-0.5 rounded-md min-h-[32px]"
                title="Tap to call customer"
              >
                <Phone size={13} />
                <span>{order.customerPhone}</span>
              </a>
            ) : (
              <span className="text-stone-400 text-xs">Not Provided</span>
            )}
          </div>

          <div className="flex items-start justify-between gap-2">
            <span className="text-stone-500 font-medium text-xs flex-shrink-0">Location:</span>
            <span className="text-stone-700 text-xs font-medium text-right line-clamp-2">
              {order.locationDetails || 'Dood Cafe Counter'}
            </span>
          </div>
        </div>

        {/* Food Items Ordered (name x qty) */}
        <div className="py-3">
          <span className="text-[11px] font-bold text-stone-400 uppercase tracking-wider block mb-2">
            Ordered Items
          </span>
          <div className="space-y-1.5 max-h-40 overflow-y-auto">
            {order.items?.map((it, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between py-1 px-2.5 rounded-lg bg-stone-50 text-xs font-medium"
              >
                <span className="text-stone-800 font-semibold">{it.name}</span>
                <span className="font-extrabold text-amber-700 bg-amber-100/70 px-2 py-0.5 rounded-md">
                  × {it.quantity}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Footer: Handover Action / Status Alert */}
      <div className="pt-3 border-t border-stone-100 mt-2">
        {isHandedOver ? (
          <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 flex items-center gap-2 min-h-[52px]">
            <CheckCircle2 size={18} className="text-emerald-600 flex-shrink-0" />
            <div className="text-xs">
              <span className="font-bold">Parcel Handed Over</span>
              {order.handedOverAt && (
                <span className="block text-[11px] text-emerald-700 opacity-90">
                  Time: {new Date(order.handedOverAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                </span>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            {isPaymentPending && (
              <div className="px-3 py-1.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-[11px] flex items-center gap-1.5 font-medium">
                <AlertTriangle size={13} className="text-amber-600 flex-shrink-0" />
                <span>Collect payment of ₹{order.totalAmount} if not already received!</span>
              </div>
            )}

            <button
              type="button"
              onClick={() => onStartHandover(order)}
              className="w-full py-3 min-h-[52px] bg-stone-900 hover:bg-black text-white rounded-xl text-sm font-bold shadow-sm transition flex items-center justify-center gap-2 active:scale-98"
            >
              <CheckCircle2 size={16} />
              <span>Mark as Handed Over</span>
            </button>
          </div>
        )}
      </div>
    </Card>
  );
}

/* ─── Dine-In Order Card Component (Read-Only) ─── */
function DineInOrderCard({ order }) {
  const paymentClass = PAYMENT_BADGE_CLASSES[order.paymentStatus] || PAYMENT_BADGE_CLASSES.pending;
  const tableNum = order.tableNumber || order.tableNo || order.deliveryAddress?.match(/Table\s+(\w+)/i)?.[1] || order.customer_location?.match(/Table\s+(\w+)/i)?.[1] || '1';

  return (
    <Card className="p-4 sm:p-5 flex flex-col justify-between hover:border-amber-300 transition">
      <div>
        {/* Header: Order No, Table Badge & Payment Badge */}
        <div className="flex items-start justify-between gap-2 pb-3 border-b border-stone-100">
          <div>
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <span className="px-2.5 py-0.5 rounded-md text-xs font-black bg-blue-600 text-white shadow-xs">
                Table {tableNum}
              </span>
              <span className="text-[10px] font-extrabold text-stone-400 uppercase tracking-widest">
                Dine-in
              </span>
            </div>
            <div className="text-base sm:text-lg font-extrabold text-stone-900 tracking-tight font-mono">
              {order.billNumber || `#ORD-${order.orderNumber}`}
            </div>
            <span className="text-[11px] text-stone-400 flex items-center gap-1 mt-0.5">
              <Clock size={11} />
              {new Date(order.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>

          <span className={`px-2.5 py-1 rounded-full text-xs font-bold border ${paymentClass}`}>
            {PAYMENT_LABELS[order.paymentStatus] || order.paymentStatus}
          </span>
        </div>

        {/* Food Items Ordered (name x qty) */}
        <div className="py-3">
          <span className="text-[11px] font-bold text-stone-400 uppercase tracking-wider block mb-2">
            Dishes Ordered
          </span>
          <div className="space-y-1.5 max-h-48 overflow-y-auto">
            {order.items?.map((it, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between py-1.5 px-3 rounded-lg bg-stone-50 text-xs font-medium"
              >
                <span className="text-stone-800 font-semibold">{it.name}</span>
                <span className="font-extrabold text-amber-700 bg-amber-100/70 px-2 py-0.5 rounded-md">
                  × {it.quantity}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Read-Only Total Bill Amount */}
      <div className="pt-3 border-t border-stone-100 flex items-center justify-between text-xs">
        <span className="font-medium text-stone-500">Total Payable:</span>
        <span className="text-sm font-extrabold text-stone-900">
          ₹{Number(order.totalAmount || 0).toLocaleString('en-IN')}
        </span>
      </div>
    </Card>
  );
}

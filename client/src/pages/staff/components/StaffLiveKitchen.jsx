import { useState } from 'react';
import { ChefHat, Clock, CheckCircle2, Flame, ArrowRight } from 'lucide-react';
import { STATUS_CONFIG, getStatusMeta } from './staffOrderStatus';

export default function StaffLiveKitchen({
  orders = [],
  loading = false,
  onStatusChange,
  _role = 'staff',
}) {
  const [kitchenFilter, setKitchenFilter] = useState('active'); // 'active' | 'pending' | 'preparing' | 'ready'
  const [actionLoadingId, setActionLoadingId] = useState(null);

  // Filter orders relevant to kitchen
  const kitchenOrders = orders.filter((ord) => {
    if (!ord) return false;
    const s = ord.status;
    if (kitchenFilter === 'active') {
      return ['pending', 'confirmed', 'preparing', 'ready'].includes(s);
    }
    if (kitchenFilter === 'pending') {
      return ['pending', 'confirmed'].includes(s);
    }
    return s === kitchenFilter;
  });

  const handleAction = async (orderId, nextStatus) => {
    if (!onStatusChange || !nextStatus) return;
    setActionLoadingId(orderId);
    try {
      await onStatusChange(orderId, nextStatus);
    } finally {
      setActionLoadingId(null);
    }
  };

  const getElapsedTime = (dateStr) => {
    if (!dateStr) return '';
    const diffMs = Date.now() - new Date(dateStr).getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return 'Just now';
    if (diffMins >= 60) {
      const hours = Math.floor(diffMins / 60);
      return `${hours}h ${diffMins % 60}m ago`;
    }
    return `${diffMins}m ago`;
  };

  return (
    <div className="bg-white border border-stone-200 rounded-3xl p-4 sm:p-5 shadow-sm space-y-4">
      {/* Kitchen Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-stone-100">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-600 flex items-center justify-center">
            <ChefHat size={22} />
          </div>
          <div>
            <h3 className="font-extrabold text-stone-900 text-lg tracking-tight">Live Kitchen Display</h3>
            <p className="text-xs text-stone-500 font-medium">Real-time dish preparation & ticket flow</p>
          </div>
        </div>

        {/* Filter Pills */}
        <div className="flex overflow-x-auto gap-2 pb-1 snap-x no-scrollbar bg-stone-100 p-1 rounded-xl text-xs font-semibold">
          {[
            { id: 'active', label: 'All Active' },
            { id: 'pending', label: 'To Cook' },
            { id: 'preparing', label: 'Cooking' },
            { id: 'ready', label: 'Ready' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setKitchenFilter(tab.id)}
              className={`snap-start flex-shrink-0 min-h-[38px] px-3.5 py-1.5 rounded-lg transition flex items-center ${
                kitchenFilter === tab.id
                  ? 'bg-white text-stone-900 shadow-xs font-bold'
                  : 'text-stone-500 hover:text-stone-800'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Orders List / Grid */}
      {loading ? (
        <div className="py-12 flex flex-col items-center justify-center text-stone-400 gap-2">
          <div className="w-8 h-8 border-3 border-amber-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-xs font-medium">Loading kitchen tickets…</span>
        </div>
      ) : kitchenOrders.length === 0 ? (
        <div className="py-12 flex flex-col items-center justify-center text-stone-400 gap-2 text-center">
          <ChefHat size={36} className="text-stone-300 stroke-[1.5]" />
          <p className="text-sm font-semibold text-stone-600">No active kitchen orders</p>
          <span className="text-xs text-stone-400">Incoming kitchen orders will appear here automatically.</span>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {kitchenOrders.map((ord) => {
            const orderId = ord.id || ord._id;
            const statusMeta = getStatusMeta(ord.status);
            const isActionLoading = actionLoadingId === orderId;
            const items = Array.isArray(ord.items)
              ? ord.items
              : typeof ord.items === 'string'
              ? JSON.parse(ord.items || '[]')
              : [];

            const isPending = ['pending', 'confirmed'].includes(ord.status);
            const isCooking = ord.status === 'preparing';
            const isReady = ord.status === 'ready';

            return (
              <div
                key={orderId}
                className={`border rounded-2xl p-4 flex flex-col justify-between transition-all ${
                  isCooking
                    ? 'border-blue-300 bg-blue-50/20 shadow-xs'
                    : isReady
                    ? 'border-purple-300 bg-purple-50/20'
                    : 'border-stone-200 bg-white'
                }`}
              >
                <div>
                  {/* Card Header */}
                  <div className="flex items-start justify-between gap-2 pb-2.5 border-b border-stone-100">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-base font-extrabold text-stone-900 tracking-tight font-mono">
                          {ord.billNumber || `#ORD-${ord.orderNumber || (orderId ? String(orderId).slice(-5) : '1')}`}
                        </span>
                        <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-stone-100 text-stone-700 capitalize">
                          {ord.orderType || 'Order'}
                        </span>
                      </div>
                      <span className="text-[11px] text-stone-400 flex items-center gap-1 mt-0.5 font-medium">
                        <Clock size={11} />
                        {getElapsedTime(ord.createdAt)}
                      </span>
                    </div>

                    <span
                      className="px-2.5 py-0.5 rounded-full text-xs font-bold border"
                      style={{ color: statusMeta.color, background: statusMeta.bg }}
                    >
                      {statusMeta.label}
                    </span>
                  </div>

                  {/* Items List */}
                  <div className="py-3 space-y-1.5">
                    {items.map((it, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between text-xs py-1 px-2.5 rounded-xl bg-stone-50/80 font-medium"
                      >
                        <span className="font-bold text-stone-900">{it.name}</span>
                        <span className="font-extrabold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-lg text-[11px]">
                          ×{it.quantity}
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* Special Kitchen Instructions */}
                  {ord.specialInstructions && (
                    <div className="mb-3 px-3 py-1.5 bg-amber-50/80 border border-amber-200/80 rounded-xl text-xs text-amber-900 font-medium flex items-center gap-1.5">
                      <Flame size={13} className="text-amber-600 flex-shrink-0" />
                      <span>{ord.specialInstructions}</span>
                    </div>
                  )}
                </div>

                {/* Footer Action */}
                <div className="pt-2 border-t border-stone-100">
                  {statusMeta.next ? (
                    <button
                      type="button"
                      disabled={isActionLoading}
                      onClick={() => handleAction(orderId, statusMeta.next)}
                      className={`w-full py-3 min-h-[52px] rounded-xl text-xs sm:text-sm font-bold shadow-xs transition flex items-center justify-center gap-1.5 active:scale-95 disabled:opacity-50 ${
                        isPending
                          ? 'bg-blue-600 hover:bg-blue-700 text-white'
                          : isCooking
                          ? 'bg-purple-600 hover:bg-purple-700 text-white'
                          : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                      }`}
                    >
                      {isActionLoading ? (
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <>
                          <span>{statusMeta.nextLabel || `Mark ${STATUS_CONFIG[statusMeta.next]?.label}`}</span>
                          <ArrowRight size={14} />
                        </>
                      )}
                    </button>
                  ) : (
                    <div className="w-full py-3 min-h-[52px] text-center text-xs sm:text-sm font-bold text-emerald-700 flex items-center justify-center gap-1.5 bg-emerald-50 rounded-xl border border-emerald-100">
                      <CheckCircle2 size={16} />
                      <span>Ready / Completed</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

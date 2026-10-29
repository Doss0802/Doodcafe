import { useState } from 'react';
import {
  Radio,
  ShoppingBag,
  UserRound,
  CheckCircle2,
  Clock,
  ArrowRight,
} from 'lucide-react';
import { STATUS_CONFIG, getStatusMeta } from './staffOrderStatus';
import StaffCustomerModal from './StaffCustomerModal';

export default function StaffOrderStream({
  orders = [],
  loading = false,
  onStatusChange,
  _role = 'staff',
}) {
  const [filter, setFilter] = useState('all'); // 'all' | 'takeaway' | 'dine-in' | 'delivery'
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [actionLoadingId, setActionLoadingId] = useState(null);

  const isTakeaway = (ord) => {
    const type = (ord?.orderType || ord?.type || '').toLowerCase();
    if (type === 'takeaway') return true;
    if (!type && !ord?.tableNumber && !ord?.tableNo && !ord?.deliveryAddress) return true;
    return false;
  };

  const isDineIn = (ord) => {
    const type = (ord?.orderType || ord?.type || '').toLowerCase();
    return (
      type === 'dine-in' ||
      type === 'dinein' ||
      Boolean(ord?.tableNumber) ||
      Boolean(ord?.tableNo) ||
      Boolean(ord?.deliveryAddress?.toLowerCase().includes('dine-in')) ||
      Boolean(ord?.customer_location?.toLowerCase().includes('dine-in'))
    );
  };

  const isDelivery = (ord) => {
    const type = (ord?.orderType || ord?.type || '').toLowerCase();
    return type === 'delivery' || (Boolean(ord?.deliveryAddress) && !isDineIn(ord));
  };

  // Sort orders newest first
  const sortedOrders = [...orders]
    .filter(Boolean)
    .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));

  const displayedOrders = sortedOrders.filter((ord) => {
    if (!ord) return false;
    if (filter === 'takeaway') return isTakeaway(ord);
    if (filter === 'dine-in') return isDineIn(ord);
    if (filter === 'delivery') return isDelivery(ord);
    return true; // 'all' -> combined view
  });

  const counts = {
    all: sortedOrders.length,
    takeaway: sortedOrders.filter(isTakeaway).length,
    'dine-in': sortedOrders.filter(isDineIn).length,
    delivery: sortedOrders.filter(isDelivery).length,
  };

  const getOrderTypeMeta = (ord) => {
    const tableNum =
      ord?.tableNumber ||
      ord?.tableNo ||
      ord?.deliveryAddress?.match(/Table\s+(\w+)/i)?.[1] ||
      ord?.customer_location?.match(/Table\s+(\w+)/i)?.[1];
    if (isDineIn(ord)) {
      return {
        label: tableNum ? `Table ${tableNum}` : 'Table not set',
        className: 'bg-blue-600 text-white border-blue-600 font-extrabold shadow-xs',
      };
    }
    if (isDelivery(ord)) {
      return {
        label: 'Live Delivery',
        className: 'bg-emerald-50 text-emerald-700 border-emerald-200 font-bold',
      };
    }
    return {
      label: 'Takeaway',
      className: 'bg-amber-50 text-amber-700 border-amber-200 font-bold',
    };
  };

  const handleAction = async (orderId, nextStatus) => {
    if (!onStatusChange || !nextStatus) return;
    setActionLoadingId(orderId);
    try {
      await onStatusChange(orderId, nextStatus);
    } finally {
      setActionLoadingId(null);
    }
  };

  return (
    <div className="bg-white border border-stone-200 rounded-3xl p-4 sm:p-5 shadow-sm space-y-4">
      {/* Stream Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-stone-100">
        <div className="flex items-center gap-2.5">
          <div className="relative">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
              <Radio size={20} className="animate-pulse" />
            </div>
            <span className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-emerald-500 border-2 border-white rounded-full" />
          </div>
          <div>
            <h3 className="font-extrabold text-stone-900 text-lg tracking-tight">All Orders Monitoring</h3>
            <p className="text-xs text-stone-500 font-medium">Real-time order monitoring (newest first) with instant status management</p>
          </div>
        </div>

        {/* Filter Pills */}
        <div className="flex overflow-x-auto gap-2 pb-1 snap-x no-scrollbar bg-stone-100 p-1 rounded-xl text-xs font-semibold">
          {[
            { id: 'all', label: 'All Orders' },
            { id: 'takeaway', label: 'Takeaway' },
            { id: 'dine-in', label: 'Dine-in' },
            { id: 'delivery', label: 'Live Delivery' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilter(tab.id)}
              className={`snap-start flex-shrink-0 min-h-[38px] px-3.5 py-1.5 rounded-lg transition flex items-center gap-1.5 cursor-pointer ${
                filter === tab.id
                  ? 'bg-white text-stone-900 shadow-xs font-bold'
                  : 'text-stone-500 hover:text-stone-800'
              }`}
            >
              <span>{tab.label}</span>
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                  filter === tab.id ? 'bg-amber-100 text-amber-800' : 'bg-stone-200 text-stone-600'
                }`}
              >
                {counts[tab.id] || 0}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Table / List View */}
      {loading ? (
        <div className="py-12 flex flex-col items-center justify-center text-stone-400 gap-2">
          <div className="w-8 h-8 border-3 border-amber-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-xs font-medium">Listening for live orders…</span>
        </div>
      ) : displayedOrders.length === 0 ? (
        <div className="py-12 flex flex-col items-center justify-center text-stone-400 gap-2 text-center">
          <ShoppingBag size={36} className="text-stone-300 stroke-[1.5]" />
          <p className="text-sm font-semibold text-stone-600">No orders found</p>
          <span className="text-xs text-stone-400">
            {filter === 'all'
              ? 'Incoming orders will appear here in real time.'
              : `No ${filter === 'delivery' ? 'live delivery' : filter} orders found.`}
          </span>
        </div>
      ) : (
        <>
          {/* Mobile Card-Based Layout (below md) */}
          <div className="md:hidden space-y-3">
            {displayedOrders.map((ord) => {
              const orderId = ord.id || ord._id;
              const statusMeta = getStatusMeta(ord.status);
              const typeMeta = getOrderTypeMeta(ord);
              const isActionLoading = actionLoadingId === orderId;
              const customerName = ord.user?.name || ord.customerName || 'Customer';
              const customerPhone = ord.user?.phone || ord.customerPhone || 'No phone';
              const items = Array.isArray(ord.items)
                ? ord.items
                : typeof ord.items === 'string'
                  ? JSON.parse(ord.items || '[]')
                  : [];

              return (
                <div
                  key={orderId}
                  className="border border-stone-200 rounded-2xl p-4 bg-white space-y-3 shadow-xs"
                >
                  {/* Header: Bill / Order No, Type & Status */}
                  <div className="flex items-start justify-between gap-2 pb-2.5 border-b border-stone-100">
                    <div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-extrabold text-stone-900 font-mono text-base">
                          {ord.billNumber || `#ORD-${ord.orderNumber || (orderId ? String(orderId).slice(-5) : '1')}`}
                        </span>
                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${typeMeta.className}`}>
                          {typeMeta.label}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 text-[11px] text-stone-400 mt-0.5 font-medium">
                        <Clock size={11} />
                        {new Date(ord.createdAt).toLocaleTimeString('en-IN', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </div>
                    </div>
                    <span
                      className="px-2.5 py-1 rounded-full text-xs font-bold border shrink-0"
                      style={{ color: statusMeta.color, background: statusMeta.bg }}
                    >
                      {statusMeta.label}
                    </span>
                  </div>

                  {/* Customer info */}
                  <div className="flex items-center justify-between text-xs">
                    <div>
                      <span className="font-bold text-stone-900 block">{customerName}</span>
                      <span className="text-stone-500 font-medium">{customerPhone}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSelectedOrder(ord)}
                      className="min-h-[44px] px-3 py-1.5 bg-amber-50 text-amber-700 hover:bg-amber-100 rounded-xl text-xs font-bold flex items-center gap-1 transition cursor-pointer"
                    >
                      <UserRound size={13} />
                      <span>Details</span>
                    </button>
                  </div>

                  {/* Dishes */}
                  <div className="flex flex-wrap gap-1.5 py-1">
                    {items.map((it, idx) => (
                      <span
                        key={idx}
                        className="inline-block py-1 px-2.5 bg-stone-100 rounded-lg text-xs font-semibold text-stone-800"
                      >
                        {it.name} <strong className="text-amber-700">×{it.quantity}</strong>
                      </span>
                    ))}
                  </div>

                  {/* Total and Action */}
                  <div className="pt-2.5 border-t border-stone-100 flex items-center justify-between gap-3">
                    <div>
                      <span className="text-[10px] text-stone-400 uppercase tracking-widest font-extrabold block">
                        Total
                      </span>
                      <span className="text-base font-extrabold text-stone-900">
                        ₹{Number(ord.totalAmount || 0).toLocaleString('en-IN')}
                      </span>
                    </div>
                    <div className="flex-1 max-w-[200px] flex justify-end">
                      {isDineIn(ord) ? (
                        <span
                          className="px-3 py-1.5 rounded-xl text-xs font-bold border inline-flex items-center gap-1.5"
                          style={{ color: statusMeta.color, background: statusMeta.bg }}
                        >
                          {statusMeta.label}
                        </span>
                      ) : statusMeta.next ? (
                        <button
                          type="button"
                          disabled={isActionLoading}
                          onClick={() => handleAction(orderId, statusMeta.next)}
                          className="w-full min-h-[52px] py-3 px-3 bg-stone-900 hover:bg-black text-white rounded-xl text-xs font-bold transition shadow-xs active:scale-95 disabled:opacity-50 inline-flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          {isActionLoading ? (
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          ) : (
                            <>
                              <span>{statusMeta.nextLabel || `Mark ${STATUS_CONFIG[statusMeta.next]?.label}`}</span>
                              <ArrowRight size={13} />
                            </>
                          )}
                        </button>
                      ) : (
                        <div className="w-full min-h-[52px] inline-flex items-center justify-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-50 rounded-xl border border-emerald-100">
                          <CheckCircle2 size={15} />
                          <span>Completed</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Desktop Table View (md and above) */}
          <div className="hidden md:block overflow-x-auto rounded-2xl border border-stone-200/80">
            <table className="w-full text-left text-xs text-stone-700">
              <thead className="bg-stone-50 text-[11px] uppercase tracking-wider font-extrabold text-stone-400 border-b border-stone-200">
                <tr>
                  <th className="py-3 px-4">Order</th>
                  <th className="py-3 px-4">Customer</th>
                  <th className="py-3 px-4">Dishes</th>
                  <th className="py-3 px-4">Total</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {displayedOrders.map((ord) => {
                  const orderId = ord.id || ord._id;
                  const statusMeta = getStatusMeta(ord.status);
                  const typeMeta = getOrderTypeMeta(ord);
                  const isActionLoading = actionLoadingId === orderId;
                  const customerName = ord.user?.name || ord.customerName || 'Customer';
                  const customerPhone = ord.user?.phone || ord.customerPhone || 'No phone';
                  const items = Array.isArray(ord.items)
                    ? ord.items
                    : typeof ord.items === 'string'
                      ? JSON.parse(ord.items || '[]')
                      : [];

                  return (
                    <tr
                      key={orderId}
                      className="hover:bg-stone-50/70 transition-colors"
                    >
                      {/* Order Col */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <span className="font-extrabold text-stone-900 font-mono text-sm">
                            {ord.billNumber || `#ORD-${ord.orderNumber || (orderId ? String(orderId).slice(-5) : '1')}`}
                          </span>
                          <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${typeMeta.className}`}>
                            {typeMeta.label}
                          </span>
                        </div>
                        <div className="flex items-center gap-1 text-[11px] text-stone-400 mt-0.5 font-medium">
                          <Clock size={11} />
                          {new Date(ord.createdAt).toLocaleTimeString('en-IN', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </div>
                      </td>

                      {/* Customer Col */}
                      <td className="py-3 px-4">
                        <div className="font-bold text-stone-900">{customerName}</div>
                        <div className="text-[11px] text-stone-500 font-medium">{customerPhone}</div>
                        <button
                          type="button"
                          onClick={() => setSelectedOrder(ord)}
                          className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-600 hover:text-amber-700 hover:underline mt-0.5 min-h-[32px] cursor-pointer"
                        >
                          <UserRound size={11} />
                          <span>View Details</span>
                        </button>
                      </td>

                      {/* Dishes Col */}
                      <td className="py-3 px-4">
                        <div className="flex flex-wrap gap-1 max-w-xs">
                          {items.map((it, idx) => (
                            <span
                              key={idx}
                              className="inline-block py-0.5 px-2 bg-stone-100 rounded-md text-[11px] font-medium text-stone-800"
                            >
                              {it.name} <strong className="text-amber-700 font-bold">×{it.quantity}</strong>
                            </span>
                          ))}
                        </div>
                      </td>

                      {/* Total Amount Col */}
                      <td className="py-3 px-4 font-mono font-bold text-stone-900 text-sm whitespace-nowrap">
                        ₹{Number(ord.totalAmount || 0).toLocaleString('en-IN')}
                      </td>

                      {/* Status Badge Col */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span
                          className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold border"
                          style={{
                            color: statusMeta.color,
                            backgroundColor: statusMeta.bg,
                          }}
                        >
                          {statusMeta.label}
                        </span>
                      </td>

                      {/* Next Action Col */}
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        {isDineIn(ord) ? (
                          <span
                            className="inline-flex items-center px-3 py-1.5 rounded-xl text-xs font-bold border"
                            style={{
                              color: statusMeta.color,
                              backgroundColor: statusMeta.bg,
                            }}
                          >
                            {statusMeta.label}
                          </span>
                        ) : statusMeta.next ? (
                          <button
                            type="button"
                            disabled={isActionLoading}
                            onClick={() => handleAction(orderId, statusMeta.next)}
                            className="min-h-[44px] py-2 px-3.5 bg-stone-900 hover:bg-black text-white rounded-xl text-xs font-bold transition shadow-xs active:scale-95 disabled:opacity-50 inline-flex items-center gap-1.5 cursor-pointer"
                          >
                            {isActionLoading ? (
                              <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            ) : (
                              <>
                                <span>{statusMeta.nextLabel || `Mark ${STATUS_CONFIG[statusMeta.next]?.label}`}</span>
                                <ArrowRight size={13} />
                              </>
                            )}
                          </button>
                        ) : (
                          <span className="min-h-[44px] inline-flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-100">
                            <CheckCircle2 size={14} />
                            Completed
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* Customer / Order Details Modal */}
      {selectedOrder && (
        <StaffCustomerModal
          order={selectedOrder}
          onClose={() => setSelectedOrder(null)}
          onStatusChange={onStatusChange}
          role={_role}
        />
      )}
    </div>
  );
}

import { useState, useMemo } from 'react';
import {
  Search,
  ShoppingBag,
  Clock,
  Phone,
  MapPin,
  Printer,
  X,
} from 'lucide-react';
import {
  getStatusMeta,
  getPaymentBadgeClass,
  getPaymentLabel,
} from './staffOrderStatus';
import { printBillOrder } from '../../../utils/printBill';

const STATUS_TABS = [
  { id: 'all', label: 'All' },
  { id: 'placed', label: 'Placed' },
  { id: 'preparing', label: 'Preparing' },
  { id: 'ready', label: 'Ready' },
  { id: 'completed', label: 'Completed' },
];

const istDateFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Kolkata',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

function resolveOrderType(ord) {
  const raw = (ord?.orderType || ord?.type || '').toLowerCase().trim();
  if (raw === 'dine-in' || raw === 'dinein') return 'dine-in';
  if (raw === 'delivery') return 'delivery';
  if (raw === 'takeaway') return 'takeaway';
  if (
    ord?.tableNumber ||
    ord?.tableNo ||
    ord?.deliveryAddress?.toLowerCase().includes('dine-in') ||
    ord?.customer_location?.toLowerCase().includes('dine-in')
  ) {
    return 'dine-in';
  }
  if (ord?.deliveryAddress) return 'delivery';
  return 'takeaway';
}

function parseOrderItems(rawItems) {
  if (Array.isArray(rawItems)) return rawItems;
  if (typeof rawItems === 'string') {
    try {
      const parsed = JSON.parse(rawItems);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
}

function extractTableNum(ord) {
  return (
    ord?.tableNumber ||
    ord?.tableNo ||
    ord?.deliveryAddress?.match(/Table\s+(\w+)/i)?.[1] ||
    ord?.customer_location?.match(/Table\s+(\w+)/i)?.[1] ||
    ''
  );
}

function extractDeliveryAddress(ord) {
  const raw = ord?.deliveryAddress || ord?.customer_location || '';
  if (!raw) return '';
  return raw.split('| Maps:')[0].trim();
}

function formatTimeIST(dateInput) {
  if (!dateInput) return '';
  const d = new Date(dateInput);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Asia/Kolkata',
  });
}

function matchesStatusTab(status, tabId) {
  if (tabId === 'all') return true;
  if (tabId === 'placed') return ['pending', 'confirmed'].includes(status);
  if (tabId === 'preparing') return status === 'preparing';
  if (tabId === 'ready') return status === 'ready';
  if (tabId === 'completed') return ['delivered', 'handed_over'].includes(status);
  return true;
}

/**
 * View-only reusable Order Monitoring panel filtered strictly by orderType and today (IST).
 */
export default function OrderMonitor({
  orderType = 'takeaway',
  title = 'Order Monitoring',
  orders = [],
  loading = false,
}) {
  const [statusFilter, setStatusFilter] = useState('all');
  const [paymentFilter, setPaymentFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Strictly filter by orderType, online (UPI) payment visibility rule, and today (IST), newest first
  const baseOrders = useMemo(() => {
    const todayIst = istDateFormatter.format(new Date());
    return (Array.isArray(orders) ? orders : [])
      .filter((ord) => {
        if (!ord) return false;
        if (resolveOrderType(ord) !== orderType) return false;

        // Exclude online (upi) orders with pending or failed payment
        const mode = (ord.paymentMode || '').toLowerCase();
        const payStatus = (ord.paymentStatus || '').toLowerCase();
        if (mode === 'upi' && payStatus !== 'paid') return false;

        if (!ord.createdAt) return false;
        const d = new Date(ord.createdAt);
        if (Number.isNaN(d.getTime())) return false;
        return istDateFormatter.format(d) === todayIst;
      })
      .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
  }, [orders, orderType]);

  // Status filter pill counts
  const counts = useMemo(() => {
    const res = { all: baseOrders.length, placed: 0, preparing: 0, ready: 0, completed: 0 };
    for (const ord of baseOrders) {
      const s = ord.status;
      if (['pending', 'confirmed'].includes(s)) res.placed += 1;
      else if (s === 'preparing') res.preparing += 1;
      else if (s === 'ready') res.ready += 1;
      else if (['delivered', 'handed_over'].includes(s)) res.completed += 1;
    }
    return res;
  }, [baseOrders]);

  // Apply selected status pill and search query (bill number, name, phone, or table)
  const displayedOrders = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return baseOrders.filter((ord) => {
      if (!matchesStatusTab(ord.status, statusFilter)) return false;
      // Payment filter — only active for dine-in
      if (orderType === 'dine-in' && paymentFilter !== 'all') {
        if (ord.paymentStatus !== paymentFilter) return false;
      }
      if (!q) return true;

      const orderId = ord.id || ord._id || '';
      const billNum = (
        ord.billNumber ||
        (ord.orderNumber ? `ORD-${ord.orderNumber}` : String(orderId).slice(-5))
      ).toLowerCase();
      const rawNum = String(ord.orderNumber || '').toLowerCase();
      const name = (ord.customerName || ord.user?.name || '').toLowerCase();
      const phone = (ord.customerPhone || ord.user?.phone || '').toLowerCase();
      const tableNum = String(extractTableNum(ord)).toLowerCase();

      return (
        billNum.includes(q) ||
        rawNum.includes(q) ||
        name.includes(q) ||
        phone.includes(q) ||
        tableNum.includes(q) ||
        (tableNum && `table ${tableNum}`.includes(q))
      );
    });
  }, [baseOrders, statusFilter, paymentFilter, searchQuery, orderType]);

  const handlePrint = (ord) => {
    printBillOrder({ ...ord, orderType });
  };

  return (
    <div className="bg-white border border-stone-200 rounded-3xl p-4 sm:p-5 shadow-sm space-y-4">
      {/* Header & Status Pills */}
      <div className="flex flex-col gap-3 pb-3 border-b border-stone-100">
        <div>
          <h4 className="font-extrabold text-stone-900 text-base sm:text-lg tracking-tight">
            {title}
          </h4>
          <p className="text-xs text-stone-500 font-medium">
            Today&apos;s orders (IST, newest first) · View-only monitor
          </p>
        </div>

        {/* Status Filter Pills with Counts */}
        <div className="flex overflow-x-auto sm:overflow-visible sm:flex-wrap gap-2 pb-1 sm:pb-0 snap-x no-scrollbar bg-stone-100 p-1 rounded-xl text-xs font-semibold">
          {STATUS_TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setStatusFilter(tab.id)}
              className={`snap-start flex-shrink-0 min-h-[44px] px-3.5 py-2 rounded-xl transition flex items-center gap-1.5 cursor-pointer clay-btn ${
                statusFilter === tab.id ? 'clay-dark clay-active' : 'clay-light'
              }`}
            >
              <span>{tab.label}</span>
              <span
                className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                  statusFilter === tab.id ? 'bg-amber-100 text-amber-800' : 'bg-stone-200 text-stone-600'
                }`}
              >
                {counts[tab.id] || 0}
              </span>
            </button>
          ))}
        </div>

        {/* Payment Filter Pills — dine-in only */}
        {orderType === 'dine-in' && (
          <div className="flex overflow-x-auto sm:overflow-visible sm:flex-wrap gap-2 no-scrollbar text-xs font-semibold">
            {[
              { id: 'all', label: 'All Payments' },
              { id: 'paid', label: 'Paid' },
              { id: 'pending', label: 'Pending' },
              { id: 'cod', label: 'COD' },
            ].map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setPaymentFilter(f.id)}
                className={`snap-start flex-shrink-0 min-h-[36px] px-3 py-1.5 rounded-xl transition flex items-center gap-1 cursor-pointer clay-btn ${
                  paymentFilter === f.id ? 'clay-dark clay-active' : 'clay-light'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Search Box */}
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" size={16} />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search by bill no, name, phone, or table…"
          className="w-full pl-10 pr-9 py-2.5 rounded-xl border-2 border-stone-200 bg-white text-stone-900 text-sm font-medium placeholder-stone-400 focus:outline-none focus:ring-3 focus:ring-amber-500/20 focus:border-amber-500 transition"
        />
        {searchQuery && (
          <button
            type="button"
            onClick={() => setSearchQuery('')}
            aria-label="Clear search"
            className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-stone-400 hover:text-stone-700 transition"
          >
            <X size={16} />
          </button>
        )}
      </div>

      {/* Content: Loading / Empty / Mobile Cards + Desktop Table */}
      {loading ? (
        <div className="py-12 flex flex-col items-center justify-center text-stone-400 gap-2">
          <div className="w-8 h-8 border-3 border-amber-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-xs font-medium">Loading today&apos;s orders…</span>
        </div>
      ) : displayedOrders.length === 0 ? (
        <div className="py-12 flex flex-col items-center justify-center text-stone-400 gap-2 text-center">
          <ShoppingBag size={36} className="text-stone-300 stroke-[1.5]" />
          <p className="text-sm font-semibold text-stone-600">
            {searchQuery.trim() ? 'No matching orders found' : 'No orders found'}
          </p>
          <span className="text-xs text-stone-400 max-w-sm">
            {searchQuery.trim()
              ? `No ${orderType} orders matched "${searchQuery.trim()}".`
              : `No ${orderType} orders for this status filter today.`}
          </span>
        </div>
      ) : (
        <>
          {/* Mobile Cards (below md) */}
          <div className="md:hidden space-y-3">
            {displayedOrders.map((ord) => {
              const orderId = ord.id || ord._id;
              const orderNo =
                ord.billNumber ||
                `#ORD-${ord.orderNumber || (orderId ? String(orderId).slice(-5) : '1')}`;
              const statusMeta = getStatusMeta(ord.status);
              const paymentClass = getPaymentBadgeClass(ord.paymentStatus);
              const paymentLabel = getPaymentLabel(ord);
              const customerName = ord.customerName || ord.user?.name || 'Customer';
              const customerPhone = ord.customerPhone || ord.user?.phone || '';
              const items = parseOrderItems(ord.items);
              const tableNum = orderType === 'dine-in' ? extractTableNum(ord) : '';
              const address = orderType === 'delivery' ? extractDeliveryAddress(ord) : '';

              return (
                <div
                  key={orderId}
                  className="border border-stone-200 rounded-2xl p-4 bg-white space-y-3 shadow-xs"
                >
                  {/* Card Header: Order No, Table/Time, Status */}
                  <div className="flex items-start justify-between gap-2 pb-2.5 border-b border-stone-100">
                    <div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-extrabold text-stone-900 font-mono text-base">
                          {orderNo}
                        </span>
                        {orderType === 'dine-in' && (
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-blue-600 text-white">
                            {tableNum ? `Table ${tableNum}` : 'Table not set'}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1 text-[11px] text-stone-400 mt-0.5 font-medium">
                        <Clock size={11} />
                        <span>{formatTimeIST(ord.createdAt)}</span>
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <span
                        className="px-2.5 py-0.5 rounded-full text-xs font-bold border"
                        style={{
                          color: statusMeta.color,
                          backgroundColor: statusMeta.bg,
                        }}
                      >
                        {statusMeta.label}
                      </span>
                      <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold border ${paymentClass}`}>
                        {paymentLabel}
                      </span>
                    </div>
                  </div>

                  {/* Customer & Delivery Address */}
                  <div className="flex items-center justify-between gap-2 text-xs flex-wrap">
                    <span className="font-bold text-stone-900">{customerName}</span>
                    {customerPhone ? (
                      <a
                        href={`tel:${customerPhone}`}
                        className="font-bold text-amber-600 hover:text-amber-700 inline-flex items-center gap-1 bg-amber-50 px-2 py-1 rounded-md min-h-[32px]"
                      >
                        <Phone size={12} />
                        <span>{customerPhone}</span>
                      </a>
                    ) : (
                      <span className="text-stone-400">No phone</span>
                    )}
                  </div>

                  {orderType === 'delivery' && address && (
                    <div className="flex items-start gap-1.5 text-xs text-stone-600 bg-stone-50 px-2.5 py-1.5 rounded-xl">
                      <MapPin size={13} className="text-stone-400 mt-0.5 shrink-0" />
                      <span>{address}</span>
                    </div>
                  )}

                  {/* Items (name x qty) */}
                  <div className="flex flex-wrap gap-1.5">
                    {items.map((it, idx) => (
                      <span
                        key={idx}
                        className="inline-block py-1 px-2.5 bg-stone-100 rounded-lg text-xs font-semibold text-stone-800"
                      >
                        {it.name} <strong className="text-amber-700">×{it.quantity}</strong>
                      </span>
                    ))}
                  </div>

                  {/* Total & Print Bill */}
                  <div className="pt-2.5 border-t border-stone-100 flex items-center justify-between gap-3">
                    <div>
                      <span className="text-[10px] text-stone-400 uppercase tracking-widest font-extrabold block">
                        Total
                      </span>
                      <span className="text-base font-extrabold text-stone-900 font-mono">
                        ₹{Number(ord.totalAmount || 0).toLocaleString('en-IN')}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handlePrint(ord)}
                      className="clay-btn clay-light min-h-[44px] px-4 py-2 text-xs font-bold flex items-center justify-center gap-1.5 text-stone-900 border border-stone-300"
                    >
                      <Printer size={14} />
                      <span>Print Bill</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Desktop Table (md and above) */}
          <div className="hidden md:block overflow-x-auto rounded-2xl border border-stone-200/80">
            <table className="w-full text-left text-xs text-stone-700">
              <thead className="bg-stone-50 text-[11px] uppercase tracking-wider font-extrabold text-stone-400 border-b border-stone-200">
                <tr>
                  <th className="py-3 px-3">Order No</th>
                  <th className="py-3 px-3">Customer</th>
                  <th className="py-3 px-3">Items</th>
                  <th className="py-3 px-3">Total</th>
                  <th className="py-3 px-3">Payment</th>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-3 text-right">Bill</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {displayedOrders.map((ord) => {
                  const orderId = ord.id || ord._id;
                  const orderNo =
                    ord.billNumber ||
                    `#ORD-${ord.orderNumber || (orderId ? String(orderId).slice(-5) : '1')}`;
                  const statusMeta = getStatusMeta(ord.status);
                  const paymentClass = getPaymentBadgeClass(ord.paymentStatus);
                  const paymentLabel = getPaymentLabel(ord);
                  const customerName = ord.customerName || ord.user?.name || 'Customer';
                  const customerPhone = ord.customerPhone || ord.user?.phone || '';
                  const items = parseOrderItems(ord.items);
                  const tableNum = orderType === 'dine-in' ? extractTableNum(ord) : '';
                  const address = orderType === 'delivery' ? extractDeliveryAddress(ord) : '';

                  return (
                    <tr key={orderId} className="hover:bg-stone-50/70 transition-colors align-top">
                      <td className="py-3 px-3 whitespace-nowrap">
                        <div className="font-extrabold text-stone-900 font-mono text-sm">
                          {orderNo}
                        </div>
                        {orderType === 'dine-in' && (
                          <span className="inline-block mt-1 px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-blue-600 text-white">
                            {tableNum ? `Table ${tableNum}` : 'Table not set'}
                          </span>
                        )}
                        <div className="flex items-center gap-1 text-[11px] text-stone-400 mt-0.5 font-medium">
                          <Clock size={11} />
                          <span>{formatTimeIST(ord.createdAt)}</span>
                        </div>
                      </td>

                      <td className="py-3 px-3">
                        <div className="font-bold text-stone-900">{customerName}</div>
                        <div className="text-[11px] text-stone-500 font-medium">
                          {customerPhone ? (
                            <a href={`tel:${customerPhone}`} className="text-amber-700 hover:underline">
                              {customerPhone}
                            </a>
                          ) : (
                            'No phone'
                          )}
                        </div>
                        {orderType === 'delivery' && address && (
                          <div className="text-[11px] text-stone-500 mt-1 max-w-[200px] leading-snug">
                            {address}
                          </div>
                        )}
                      </td>

                      <td className="py-3 px-3">
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

                      <td className="py-3 px-3 font-mono font-bold text-stone-900 text-sm whitespace-nowrap">
                        ₹{Number(ord.totalAmount || 0).toLocaleString('en-IN')}
                      </td>

                      <td className="py-3 px-3 whitespace-nowrap">
                        <span className={`inline-flex px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${paymentClass}`}>
                          {paymentLabel}
                        </span>
                      </td>

                      <td className="py-3 px-3 whitespace-nowrap">
                        <span
                          className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold border"
                          style={{
                            color: statusMeta.color,
                            backgroundColor: statusMeta.bg,
                          }}
                        >
                          {statusMeta.label}
                        </span>
                      </td>

                      <td className="py-3 px-3 text-right whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => handlePrint(ord)}
                          className="clay-btn clay-light min-h-[38px] px-3 py-1.5 text-xs font-bold inline-flex items-center gap-1.5 text-stone-900 border border-stone-300 cursor-pointer"
                        >
                          <Printer size={13} />
                          <span>Print Bill</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

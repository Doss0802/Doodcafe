import { useEffect } from 'react';
import { X, Phone, MapPin, ExternalLink, ShoppingBag } from 'lucide-react';
import { getStatusMeta, getPaymentBadgeClass } from './staffOrderStatus';

export default function StaffCustomerModal({ order, onClose }) {
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

  const customerName = order.user?.name || order.customerName || 'Customer';
  const customerPhone = order.user?.phone || order.customerPhone || null;
  const customerEmail = order.user?.email || order.customerEmail || null;
  const statusMeta = getStatusMeta(order.status);
  const paymentClass = getPaymentBadgeClass(order.paymentStatus);

  const rawLocation = order.customer_location || order.deliveryAddress || order.locationDetails || '';
  let textAddress = rawLocation;
  let mapsLink = null;

  if (rawLocation.includes('Maps:')) {
    const parts = rawLocation.split('Maps:');
    textAddress = parts[0].replace(/\|$/, '').trim();
    mapsLink = parts[1]?.trim();
  } else if (order.coordinates?.lat && order.coordinates?.lng) {
    mapsLink = `https://www.google.com/maps?q=${order.coordinates.lat},${order.coordinates.lng}`;
  }

  const items = Array.isArray(order.items)
    ? order.items
    : typeof order.items === 'string'
    ? JSON.parse(order.items || '[]')
    : [];

  const handleBackdrop = (e) => {
    if (e.target === e.currentTarget) onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/50 backdrop-blur-xs animate-fadeIn"
      onClick={handleBackdrop}
      role="dialog"
      aria-modal="true"
    >
      <div className="bg-white fixed sm:relative inset-x-0 bottom-0 sm:inset-auto rounded-t-3xl sm:rounded-3xl max-w-lg w-full max-h-[90vh] flex flex-col shadow-2xl border border-stone-200 overflow-hidden animate-slideUp sm:animate-scaleUp">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-stone-100 flex items-center justify-between bg-stone-50/50">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-base font-extrabold text-stone-900 bg-stone-200/70 px-2.5 py-1 rounded-lg">
              {order.billNumber || `#ORD-${order.orderNumber || (order.id ? String(order.id).slice(-5) : '1')}`}
            </span>
            <span
              className="px-2.5 py-1 rounded-full text-xs font-bold border"
              style={{ color: statusMeta.color, background: statusMeta.bg }}
            >
              {statusMeta.label}
            </span>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-stone-100 text-stone-700 capitalize">
              {order.orderType || 'Order'}
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-2 sm:p-1.5 rounded-full hover:bg-stone-200 text-stone-500 hover:text-stone-800 transition min-w-[44px] min-h-[44px] sm:min-w-0 sm:min-h-0 flex items-center justify-center"
            aria-label="Close modal"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 sm:space-y-5 text-sm text-stone-800">
          {/* Customer Details Box */}
          <div className="bg-stone-50 p-4 rounded-2xl border border-stone-200/80 space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-stone-400">
              Customer Information
            </h4>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-stone-500 text-xs">Name:</span>
                <span className="font-bold text-stone-900">{customerName}</span>
              </div>

              {customerPhone ? (
                <div className="flex items-center justify-between">
                  <span className="text-stone-500 text-xs">Phone:</span>
                  <a
                    href={`tel:${customerPhone}`}
                    className="inline-flex items-center gap-1.5 font-bold text-amber-600 hover:text-amber-700 bg-amber-50 px-3 py-1.5 rounded-lg transition min-h-[44px] flex items-center"
                  >
                    <Phone size={14} />
                    <span>{customerPhone}</span>
                  </a>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <span className="text-stone-500 text-xs">Phone:</span>
                  <span className="text-stone-400 text-xs">Not provided</span>
                </div>
              )}

              {customerEmail && (
                <div className="flex items-center justify-between">
                  <span className="text-stone-500 text-xs">Email:</span>
                  <span className="text-stone-700 font-medium text-xs">{customerEmail}</span>
                </div>
              )}
            </div>
          </div>

          {/* Location & Address */}
          {textAddress && (
            <div className="bg-stone-50 p-4 rounded-2xl border border-stone-200/80 space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-stone-400 flex items-center gap-1.5">
                <MapPin size={13} />
                <span>Delivery / Pickup Location</span>
              </h4>
              <p className="text-xs text-stone-700 leading-relaxed font-medium">{textAddress}</p>
              {mapsLink && (
                <a
                  href={mapsLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs font-bold text-blue-600 hover:underline pt-1 min-h-[44px] flex items-center"
                >
                  <ExternalLink size={13} />
                  <span>Open in Google Maps</span>
                </a>
              )}
            </div>
          )}

          {/* Ordered Dishes */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-stone-400 mb-2 flex items-center gap-1.5">
              <ShoppingBag size={13} />
              <span>Items Ordered ({items.length})</span>
            </h4>
            <div className="space-y-1.5 max-h-48 overflow-y-auto">
              {items.map((item, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between py-2 px-3 bg-stone-50 rounded-xl border border-stone-100"
                >
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-md bg-amber-100 text-amber-800 font-bold text-xs flex items-center justify-center">
                      {item.quantity}×
                    </span>
                    <span className="font-semibold text-stone-900 text-xs">{item.name}</span>
                  </div>
                  <span className="font-bold text-stone-800 text-xs">
                    ₹{Number(item.price || item.unitPrice || 0) * (item.quantity || 1)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Special Instructions */}
          {order.specialInstructions && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900">
              <strong className="block font-bold mb-0.5">Note from customer:</strong>
              <p>{order.specialInstructions}</p>
            </div>
          )}

          {/* Payment & Bill Summary */}
          <div className="pt-3 border-t border-stone-200 flex items-center justify-between">
            <div>
              <span className="text-[10px] text-stone-400 uppercase tracking-widest font-extrabold block">
                Payment Status
              </span>
              <span className={`inline-block mt-0.5 px-2.5 py-0.5 rounded-full text-xs font-bold border ${paymentClass}`}>
                {(order.paymentStatus || 'pending').toUpperCase()} ({(order.paymentMode || 'cash').toUpperCase()})
              </span>
            </div>
            <div className="text-right">
              <span className="text-[10px] text-stone-400 uppercase tracking-widest font-extrabold block">
                Total Amount
              </span>
              <span className="text-lg font-black text-stone-900">
                ₹{Number(order.totalAmount || 0).toLocaleString('en-IN')}
              </span>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-stone-50 border-t border-stone-200 flex items-center justify-end gap-3 pb-[max(1rem,env(safe-area-inset-bottom))]">
          {customerPhone && (
            <a
              href={`tel:${customerPhone}`}
              className="flex-1 sm:flex-initial px-5 py-3 min-h-[52px] bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-sm font-bold shadow-sm inline-flex items-center justify-center gap-2 transition active:scale-95"
            >
              <Phone size={16} />
              <span>Call Customer</span>
            </a>
          )}
          <button
            onClick={onClose}
            className="flex-1 sm:flex-initial px-5 py-3 min-h-[52px] bg-stone-200 hover:bg-stone-300 text-stone-700 rounded-xl text-sm font-bold transition flex items-center justify-center"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}


/**
 * Staff & Kitchen Order Status Configuration & Tailwind Styling
 */

export const STATUS_CONFIG = {
  pending: {
    label: 'Placed',
    color: '#D97706',
    bg: '#FEF3C7',
    badge: 'bg-amber-50 text-amber-700 border-amber-200',
    next: 'preparing',
    nextLabel: 'Start Preparing',
  },
  confirmed: {
    label: 'Placed',
    color: '#D97706',
    bg: '#FEF3C7',
    badge: 'bg-amber-50 text-amber-700 border-amber-200',
    next: 'preparing',
    nextLabel: 'Start Preparing',
  },
  preparing: {
    label: 'Preparing',
    color: '#2563EB',
    bg: '#EFF6FF',
    badge: 'bg-blue-50 text-blue-700 border-blue-200',
    next: 'ready',
    nextLabel: 'Mark Ready',
  },
  ready: {
    label: 'Ready for Pickup',
    color: '#059669',
    bg: '#ECFDF5',
    badge: 'bg-purple-50 text-purple-700 border-purple-200',
    next: 'delivered',
    nextLabel: 'Mark Completed',
  },
  delivered: {
    label: 'Completed',
    color: '#10B981',
    bg: '#ECFDF5',
    badge: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    next: null,
    nextLabel: null,
  },
  handed_over: {
    label: 'Handed Over',
    color: '#047857',
    bg: '#D1FAE5',
    badge: 'bg-emerald-100 text-emerald-800 border-emerald-300 font-bold',
    next: null,
    nextLabel: null,
  },
  cancelled: {
    label: 'Cancelled',
    color: '#EF4444',
    bg: '#FEF2F2',
    badge: 'bg-rose-50 text-rose-700 border-rose-200',
    next: null,
    nextLabel: null,
  },
};

export const PAYMENT_BADGE_CLASSES = {
  paid: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  pending: 'bg-amber-50 text-amber-700 border-amber-200',
  cod: 'bg-blue-50 text-blue-700 border-blue-200',
};

export const STATUS_BADGE_CLASSES = {
  pending: 'bg-amber-50 text-amber-700 border-amber-200',
  confirmed: 'bg-amber-50 text-amber-700 border-amber-200',
  preparing: 'bg-blue-50 text-blue-700 border-blue-200',
  ready: 'bg-purple-50 text-purple-700 border-purple-200',
  delivered: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  handed_over: 'bg-emerald-100 text-emerald-800 border-emerald-300 font-bold',
  cancelled: 'bg-rose-50 text-rose-700 border-rose-200',
};

export const PAYMENT_LABELS = {
  paid: 'Paid (Online / UPI)',
  pending: 'Payment Pending',
  cod: 'Cash on Delivery (COD)',
};

export const getStatusMeta = (status) => STATUS_CONFIG[status] || STATUS_CONFIG.pending;
export const getStatusBadgeClass = (status) => STATUS_BADGE_CLASSES[status] || STATUS_BADGE_CLASSES.pending;
export const getPaymentBadgeClass = (paymentStatus) => PAYMENT_BADGE_CLASSES[paymentStatus] || PAYMENT_BADGE_CLASSES.pending;


/**
 * Order Notification Configuration
 *
 * Real status value staff sets with "Mark Complete" is 'delivered'.
 * Can be changed to 'ready' to notify customers earlier when food is ready.
 */
export const NOTIFY_ON_STATUS = 'delivered';

// Real-time polling frequency for customer active order tracking (in milliseconds)
export const CUSTOMER_ORDER_POLL_INTERVAL_MS = 10000; // 10 seconds

// ── Notification Sound Loading ───────────────────────────────────────────────
// Vite eager glob for audio file discovery in client/src/notification
const audioModules = import.meta.glob(
  '/src/notification/*.{mp3,wav,ogg,m4a,MP3,WAV,OGG,M4A}',
  { eager: true, query: '?url', import: 'default' }
);
const audioPaths = Object.values(audioModules);
export const BELL_SOUND_URL = audioPaths.length > 0 ? audioPaths[0] : null;

/**
 * Checks whether an order's status matches the configured notification status.
 * Also considers 'handed_over' equivalent to completed when configured for 'delivered'.
 */
export const isNotificationStatus = (status) => {
  if (!status) return false;
  const s = String(status).toLowerCase();
  const target = NOTIFY_ON_STATUS.toLowerCase();
  if (s === target) return true;
  if (target === 'delivered' && s === 'handed_over') return true;
  return false;
};

/**
 * Get the in-page toast text based on order type and order number.
 *
 * Requirements:
 * - takeaway: "Your order is ready, please collect it at the counter"
 * - dine-in: "Your order is ready"
 * - live delivery: "Your order has been completed"
 */
export const getOrderCompletedToastMessage = (order) => {
  const prefix = order?.orderNumber ? `Order #${order.orderNumber}: ` : '';
  const type = order?.orderType?.toLowerCase();
  if (type === 'delivery') {
    return `${prefix}Your order has been completed`;
  }
  if (type === 'dine-in' || type === 'dinein') {
    return `${prefix}Your order is ready`;
  }
  if (type === 'takeaway') {
    return `${prefix}Your order is ready, please collect it at the counter`;
  }
  return `${prefix}Your order is ready for pickup`;
};

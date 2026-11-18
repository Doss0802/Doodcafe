import { useState, useEffect, useRef, useCallback } from 'react';
import toast from 'react-hot-toast';
import SoundBanner from '../components/SoundBanner';
import {
  BELL_SOUND_URL,
  isNotificationStatus,
  getOrderCompletedToastMessage,
} from '../config/notificationConfig';

// ── LocalStorage Idempotency Helpers ─────────────────────────────────────────
const STORAGE_KEY = 'doodcafe_notified_orders';

const getNotifiedOrderKeys = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw);
    return new Set(Array.isArray(parsed) ? parsed : []);
  } catch (_) {
    return new Set();
  }
};

const recordOrderNotified = (order) => {
  if (!order) return;
  try {
    const set = getNotifiedOrderKeys();
    const idKey = order.id ? String(order.id) : (order._id ? String(order._id) : null);
    const numKey = order.orderNumber ? `num_${order.orderNumber}` : null;
    if (idKey) set.add(idKey);
    if (numKey) set.add(numKey);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(set)));
  } catch (_) {}
};

const isOrderNotified = (order) => {
  if (!order) return true;
  const set = getNotifiedOrderKeys();
  const idKey = order.id ? String(order.id) : (order._id ? String(order._id) : null);
  const numKey = order.orderNumber ? `num_${order.orderNumber}` : null;
  if (idKey && set.has(idKey)) return true;
  if (numKey && set.has(numKey)) return true;
  return false;
};

const getOrderKey = (order) => {
  if (!order) return '';
  return String(order.id || order._id || order.orderNumber || '');
};

/**
 * Custom hook to manage customer order completion bell notifications.
 *
 * @param {Object|Array} ordersInput - Single order object or array of orders
 * @returns {{
 *   soundBlocked: boolean,
 *   enableSound: Function,
 *   SoundBanner: Function
 * }}
 */
export function useOrderBell(ordersInput) {
  const [soundBlocked, setSoundBlocked] = useState(true);
  const isUnlockedRef = useRef(false);
  const initialCompletedIdsRef = useRef(new Set());
  const initialSeenRef = useRef(false);
  const timersRef = useRef([]);

  // Unlock audio via user gesture
  const enableSound = useCallback(() => {
    if (!BELL_SOUND_URL) {
      setSoundBlocked(false);
      return;
    }
    try {
      const audio = new Audio(BELL_SOUND_URL);
      audio.volume = 0;
      const playPromise = audio.play();
      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            audio.pause();
            audio.currentTime = 0;
            isUnlockedRef.current = true;
            setSoundBlocked(false);
          })
          .catch(() => {
            // Browser still requires direct gesture
          });
      }
    } catch (_) {}
  }, []);

  // Listen for the first user tap/click anywhere on the page to unlock audio silently
  useEffect(() => {
    const handleFirstGesture = () => {
      enableSound();
    };

    const gestureEvents = ['click', 'touchstart', 'keydown'];
    gestureEvents.forEach((ev) =>
      window.addEventListener(ev, handleFirstGesture, { passive: true, once: true })
    );

    return () => {
      gestureEvents.forEach((ev) =>
        window.removeEventListener(ev, handleFirstGesture)
      );
    };
  }, [enableSound]);

  // Cleanup all scheduled secondary bell timers on unmount
  useEffect(() => {
    return () => {
      timersRef.current.forEach((t) => clearTimeout(t));
      timersRef.current = [];
    };
  }, []);

  // Play bell sound 2 times (~1 second apart, volume 1.0)
  const playBellSoundTwice = useCallback(async () => {
    if (!BELL_SOUND_URL) return;

    try {
      const audio1 = new Audio(BELL_SOUND_URL);
      audio1.volume = 1.0;
      await audio1.play();
      isUnlockedRef.current = true;
      setSoundBlocked(false);
    } catch (_) {
      // Browser blocked autoplay
      setSoundBlocked(true);
    }

    // Play second time ~1 second apart so it is noticed
    const secondTimer = setTimeout(() => {
      try {
        const audio2 = new Audio(BELL_SOUND_URL);
        audio2.volume = 1.0;
        audio2.play().catch(() => {});
      } catch (_) {}
    }, 1000);

    timersRef.current.push(secondTimer);
  }, []);

  // Dispatch full notification sequence: bell x2 + vibration + toast
  const triggerOrderNotification = useCallback(
    async (order) => {
      if (!order) return;

      // 1. Immediately record in localStorage so reload/reconnect never replays it
      recordOrderNotified(order);

      // 2. Play sound twice
      try {
        await playBellSoundTwice();
      } catch (_) {}

      // 3. Vibrate on supported mobile phones
      try {
        if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
          navigator.vibrate([200, 100, 200]);
        }
      } catch (_) {}

      // 4. In-page Toast with order number and per-type message
      const toastMsg = getOrderCompletedToastMessage(order);
      toast.success(toastMsg, {
        duration: 6000,
        icon: '🔔',
      });
    },
    [playBellSoundTwice]
  );

  // Monitor order(s) for status transition to completed
  useEffect(() => {
    if (!ordersInput) return;

    const list = Array.isArray(ordersInput) ? ordersInput : [ordersInput];
    if (list.length === 0) return;

    // First time orders are loaded:
    // Mark any orders that were ALREADY complete on page load so they never play
    if (!initialSeenRef.current) {
      list.forEach((ord) => {
        if (ord && isNotificationStatus(ord.status)) {
          const key = getOrderKey(ord);
          if (key) initialCompletedIdsRef.current.add(key);
          recordOrderNotified(ord);
        }
      });
      initialSeenRef.current = true;
      return;
    }

    // Subsequent updates: check for orders newly transitioned to completed
    list.forEach((ord) => {
      if (!ord) return;
      const key = getOrderKey(ord);
      if (
        isNotificationStatus(ord.status) &&
        !initialCompletedIdsRef.current.has(key) &&
        !isOrderNotified(ord)
      ) {
        triggerOrderNotification(ord);
      }
    });
  }, [ordersInput, triggerOrderNotification]);

  // Convenience component renderer for the sound banner
  const BannerComponent = useCallback(() => {
    if (!soundBlocked) return null;
    return <SoundBanner onEnable={enableSound} />;
  }, [soundBlocked, enableSound]);

  return {
    soundBlocked,
    enableSound,
    SoundBanner: BannerComponent,
  };
}

export default useOrderBell;

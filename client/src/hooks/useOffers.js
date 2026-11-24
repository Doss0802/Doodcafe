import { useEffect } from 'react';
import { create } from 'zustand';
import axiosInstance from '../api/axiosInstance';

/**
 * Shared Zustand store for live cafe offers.
 * Stores all live offers (both dine-in and delivery) fetched from GET /api/offers.
 */
export const useOffersStore = create((set, get) => ({
  offers: [],
  loading: false,
  error: null,
  lastFetched: null,

  fetchOffers: async () => {
    // Prevent duplicate in-flight requests
    if (get().loading) return;

    set({ loading: true, error: null });
    try {
      const res = await axiosInstance.get('/offers');
      const raw = res.data?.data || [];

      // Sort newest first: by createdAt DESC, falling back to startAt DESC
      const sorted = [...raw].sort((a, b) => {
        const timeA = new Date(a.createdAt || a.startAt || 0).getTime();
        const timeB = new Date(b.createdAt || b.startAt || 0).getTime();
        return timeB - timeA;
      });

      set({
        offers: sorted,
        loading: false,
        lastFetched: Date.now(),
      });
    } catch (err) {
      set({ error: err, loading: false });
    }
  },
}));

// Global subscriber tracker and poll interval for the custom hook
let activeSubscribers = 0;
let pollTimer = null;
let focusHandler = null;
let visibilityHandler = null;

/**
 * Custom hook to consume offers.
 * Loads on mount, refetches on window focus and visibility change,
 * and polls every 30 seconds while subscribed.
 * Multiple components share the same store without duplicate requests.
 */
export function useOffers() {
  const { offers, loading, error, fetchOffers } = useOffersStore();

  useEffect(() => {
    activeSubscribers += 1;

    // Start background listeners on first active subscriber
    if (activeSubscribers === 1) {
      fetchOffers();

      focusHandler = () => {
        useOffersStore.getState().fetchOffers();
      };

      visibilityHandler = () => {
        if (document.visibilityState === 'visible') {
          useOffersStore.getState().fetchOffers();
        }
      };

      window.addEventListener('focus', focusHandler);
      document.addEventListener('visibilitychange', visibilityHandler);

      pollTimer = setInterval(() => {
        useOffersStore.getState().fetchOffers();
      }, 30000);
    }

    return () => {
      activeSubscribers -= 1;
      if (activeSubscribers <= 0) {
        activeSubscribers = 0;
        if (pollTimer) {
          clearInterval(pollTimer);
          pollTimer = null;
        }
        if (focusHandler) {
          window.removeEventListener('focus', focusHandler);
          focusHandler = null;
        }
        if (visibilityHandler) {
          document.removeEventListener('visibilitychange', visibilityHandler);
          visibilityHandler = null;
        }
      }
    };
  }, [fetchOffers]);

  return {
    offers,
    loading,
    error,
    refetch: fetchOffers,
  };
}

export default useOffers;

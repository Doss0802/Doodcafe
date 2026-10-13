import { create } from 'zustand';

/**
 * Zustand 5 store for managing menu item state globally across admin and client views.
 */
const useMenuStore = create((set, get) => ({
  items: [],
  meta: { total: 0, pages: 1 },
  loading: false,

  setLoading: (loading) => set({ loading }),

  setItems: (items, meta = {}) =>
    set({
      items: Array.isArray(items) ? items : [],
      meta: {
        total: meta.total ?? (Array.isArray(items) ? items.length : 0),
        pages: meta.pages ?? 1,
      },
      loading: false,
    }),

  addItem: (newItem) =>
    set((state) => ({
      items: [newItem, ...state.items],
      meta: {
        ...state.meta,
        total: (state.meta?.total || 0) + 1,
      },
    })),

  updateItem: (updatedItem) =>
    set((state) => ({
      items: state.items.map((item) =>
        item._id === updatedItem._id ? { ...item, ...updatedItem } : item
      ),
    })),

  removeItem: (id) =>
    set((state) => ({
      items: state.items.filter((item) => item._id !== id),
      meta: {
        ...state.meta,
        total: Math.max(0, (state.meta?.total || 1) - 1),
      },
    })),
}));

export default useMenuStore;

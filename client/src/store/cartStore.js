import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const useCartStore = create(
  persist(
    (set, get) => ({
      items: [],
      orderType: 'takeaway',
      paymentMode: 'cash',
      specialInstructions: '',
      isOpen: false,

      // Open/close cart drawer
      openCart: () => set({ isOpen: true }),
      closeCart: () => set({ isOpen: false }),
      toggleCart: () => set((s) => ({ isOpen: !s.isOpen })),

      addItem: (menuItem) => {
        const items = get().items;
        const existing = items.find((i) => i._id === menuItem._id);
        if (existing) {
          set({ items: items.map((i) => i._id === menuItem._id ? { ...i, quantity: i.quantity + 1 } : i) });
        } else {
          set({ items: [...items, { ...menuItem, quantity: 1 }] });
        }
      },

      removeItem: (id) => {
        set({ items: get().items.filter((i) => i._id !== id) });
      },

      updateQuantity: (id, quantity) => {
        if (quantity < 1) {
          set({ items: get().items.filter((i) => i._id !== id) });
        } else {
          set({ items: get().items.map((i) => i._id === id ? { ...i, quantity } : i) });
        }
      },

      clearCart: () => set({ items: [], specialInstructions: '' }),

      setOrderType: (type) => set({ orderType: type }),
      setPaymentMode: (mode) => set({ paymentMode: mode }),
      setSpecialInstructions: (text) => set({ specialInstructions: text }),

      // Computed
      get totalItems() {
        return get().items.reduce((sum, i) => sum + i.quantity, 0);
      },

      get totalAmount() {
        return get().items.reduce((sum, i) => sum + i.price * i.quantity, 0);
      },
    }),
    {
      name: 'doodcafe-cart',
      partialize: (state) => ({
        items: state.items,
        orderType: state.orderType,
        paymentMode: state.paymentMode,
        specialInstructions: state.specialInstructions,
      }),
    }
  )
);

export default useCartStore;

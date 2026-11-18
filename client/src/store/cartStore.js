import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/**
 * Extracts a normalized, non-empty string ID from an item or ID parameter.
 * Returns null if the ID is missing, null, undefined, or empty.
 */
export const getItemId = (itemOrId) => {
  if (!itemOrId) return null;
  if (typeof itemOrId === 'string' || typeof itemOrId === 'number') {
    const s = String(itemOrId).trim();
    return s.length > 0 ? s : null;
  }
  const rawId = itemOrId._id ?? itemOrId.id ?? itemOrId.menuItemId;
  if (rawId === undefined || rawId === null) return null;
  const s = String(rawId).trim();
  return s.length > 0 ? s : null;
};

/**
 * Sanitizes an array of cart items, dropping any items without a valid ID
 * and ensuring consistent id, _id, and menuItemId properties.
 */
export const sanitizeCartItems = (rawItems) => {
  if (!Array.isArray(rawItems)) return [];
  return rawItems
    .filter((item) => typeof item === 'object' && item !== null && getItemId(item) !== null)
    .map((item) => {
      const id = getItemId(item);
      return {
        ...item,
        _id: id,
        id: id,
        menuItemId: id,
        quantity: Math.max(1, parseInt(item.quantity, 10) || 1),
      };
    });
};

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
        const targetId = getItemId(menuItem);
        if (!targetId) return; // Guard: never add item without valid ID

        const items = get().items;
        const existingIndex = items.findIndex((i) => getItemId(i) === targetId);
        if (existingIndex > -1) {
          const updated = [...items];
          updated[existingIndex] = {
            ...updated[existingIndex],
            quantity: updated[existingIndex].quantity + 1,
          };
          set({ items: updated });
        } else {
          set({
            items: [
              ...items,
              {
                ...menuItem,
                _id: targetId,
                id: targetId,
                menuItemId: targetId,
                quantity: 1,
              },
            ],
          });
        }
      },

      removeItem: (idOrItem) => {
        const targetId = getItemId(idOrItem);
        if (!targetId) return; // Guard: undefined ID never matches anything
        set({ items: get().items.filter((i) => getItemId(i) !== targetId) });
      },

      updateQuantity: (idOrItem, quantity) => {
        const targetId = getItemId(idOrItem);
        if (!targetId) return; // Guard: undefined ID never matches anything

        if (quantity < 1) {
          set({ items: get().items.filter((i) => getItemId(i) !== targetId) });
        } else {
          set({
            items: get().items.map((i) =>
              getItemId(i) === targetId ? { ...i, quantity } : i
            ),
          });
        }
      },

      getItemQuantity: (idOrItem) => {
        const targetId = getItemId(idOrItem);
        if (!targetId) return 0;
        const found = get().items.find((i) => getItemId(i) === targetId);
        return found ? found.quantity : 0;
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
      merge: (persistedState, currentState) => ({
        ...currentState,
        ...persistedState,
        items: sanitizeCartItems(persistedState?.items),
      }),
    }
  )
);

export default useCartStore;

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { CartItem, Product } from '../../../types';
import { PLATFORM_CONFIG } from '../../../core/config/constants';

interface CartState {
  items: CartItem[];
  addItem: (product: Product, variantId?: string) => void;
  removeItem: (productId: string, variantId?: string) => void;
  updateQuantity: (productId: string, quantity: number, variantId?: string) => void;
  clearCart: () => void;
  getCartSubtotal: () => number;
  getCartTotal: () => number;
  getItemsCount: () => number;
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],

      addItem: (product, variantId) => set((state) => {
        const existingIdx = state.items.findIndex(
          (item) => item.product.id === product.id && item.selectedVariantId === variantId
        );

        let newItems = [...state.items];
        if (existingIdx > -1) {
          newItems[existingIdx].quantity += 1;
        } else {
          newItems.push({ product, selectedVariantId: variantId, quantity: 1 });
        }

        return { items: newItems };
      }),

      removeItem: (productId, variantId) => set((state) => ({
        items: state.items.filter(
          (item) => !(item.product.id === productId && item.selectedVariantId === variantId)
        ),
      })),

      updateQuantity: (productId, quantity, variantId) => set((state) => {
        if (quantity <= 0) {
          return {
            items: state.items.filter(
              (item) => !(item.product.id === productId && item.selectedVariantId === variantId)
            ),
          };
        }

        const newItems = state.items.map((item) => {
          if (item.product.id === productId && item.selectedVariantId === variantId) {
            return { ...item, quantity };
          }
          return item;
        });

        return { items: newItems };
      }),

      clearCart: () => set({ items: [] }),

      getCartSubtotal: () => {
        return get().items.reduce((sum, item) => {
          // Resolve variant price if selected
          const variant = item.product.variants?.find((v) => v.id === item.selectedVariantId);
          const price = variant ? variant.price : item.product.price;
          return sum + price * item.quantity;
        }, 0);
      },

      getItemsCount: () => {
        return get().items.reduce((sum, item) => sum + item.quantity, 0);
      },

      getCartTotal: () => {
        const subtotal = get().getCartSubtotal();
        if (subtotal === 0) return 0;
        
        const deliveryFee = subtotal >= PLATFORM_CONFIG.freeDeliveryThreshold ? 0 : PLATFORM_CONFIG.defaultDeliveryFee;
        const total = subtotal + deliveryFee + PLATFORM_CONFIG.handlingFee + PLATFORM_CONFIG.surgeFee;
        const tax = total * PLATFORM_CONFIG.taxRate;
        
        return parseFloat((total + tax).toFixed(2));
      },
    }),
    {
      name: 'aether-cart-storage',
      partialize: (state) => ({
        items: state.items,
      }),
    }
  )
);

export default useCartStore;

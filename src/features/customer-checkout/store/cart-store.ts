/**
 * cart-store.ts — Minimal Zustand store for OPTIMISTIC UI state only.
 *
 * ⚠️  The backend (GET /cart) is the single source of truth for:
 *   - Item prices
 *   - Totals
 *   - Delivery fee
 *   - Tax
 *   - Discounts
 *
 * This store is ONLY used to:
 *   1. Track how many items are in the cart badge (count only, from React Query cache)
 *   2. Provide addItem/removeItem/updateQuantity for optimistic updates
 *      (immediately replaced by backend response via useCartMutations)
 *
 * Do NOT use getCartSubtotal / getCartTotal here — all pricing comes from
 * PricingData returned by POST /cart/recalculate via useQuery.
 */
import { create } from 'zustand';

interface CartCountState {
  /** Local optimistic item count. Synced from React Query cart cache. */
  itemCount: number;
  setItemCount: (count: number) => void;
}

/**
 * Lightweight store to drive the cart badge count in the header.
 * The authoritative cart data lives in React Query (queryKeys.cart()).
 */
export const useCartCountStore = create<CartCountState>()((set) => ({
  itemCount: 0,
  setItemCount: (count) => set({ itemCount: count }),
}));

export default useCartCountStore;

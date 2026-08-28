import { useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../../../core/network/queryKeys';
import { cartService } from '../services/cart-service';
import { useToast } from '../../../hooks/useToast';
import { parseApiError } from '../../../core/network/api-error-parser';
import { useModalStore } from '../../../components/ui/modal-manager/modal-store';
import type { CartData } from '../../../types';

/**
 * Centralized cart mutations hook.
 * All four cart actions (add, update, remove, clear) implement:
 *  - Optimistic updates: UI responds instantly
 *  - Automatic rollback: if API fails, cache is restored
 *  - Targeted invalidation: only cart queries are invalidated
 *  - Error toasts: every failure shows a user-facing message
 */
export function useCartMutations() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  // ─── Snapshot helper ────────────────────────────────────────────────────────

  const getSnapshot = () =>
    queryClient.getQueryData<CartData>(queryKeys.cart());

  const rollback = (snapshot: CartData | undefined) => {
    if (snapshot !== undefined) {
      queryClient.setQueryData(queryKeys.cart(), snapshot);
    }
  };

  const invalidateCart = () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.cart() });
  };

  // ─── Add to Cart ────────────────────────────────────────────────────────────

  const addToCartMutation = useMutation({
    mutationFn: ({
      productId,
      variantId,
      quantity,
    }: {
      productId: string;
      variantId?: string;
      quantity?: number;
    }) => cartService.addItem(productId, variantId, quantity),

    onMutate: async ({ productId, variantId, quantity = 1 }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.cart() });
      const snapshot = getSnapshot();

      // Optimistic: increment quantity or add new item
      const current = snapshot ?? emptyCart();
      const existingIdx = current.items.findIndex(
        (i) => i.productId === productId && (variantId ? (i.variantId === variantId || !i.variantId) : true),
      );

      let optimisticItems = [...current.items];
      if (existingIdx > -1) {
        optimisticItems = optimisticItems.map((item, idx) =>
          idx === existingIdx
            ? { ...item, quantity: item.quantity + quantity, total: item.price * (item.quantity + quantity) }
            : item,
        );
      } else {
        optimisticItems.push({
          productId,
          variantId: variantId ?? null,
          quantity,
          name: '',
          imageUrl: '',
          price: 0,
          total: 0,
          variantName: null,
        });
      }

      queryClient.setQueryData(queryKeys.cart(), {
        ...current,
        items: optimisticItems,
      });

      return { snapshot };
    },

    onError: (_err, vars, context) => {
      rollback(context?.snapshot);
      const err = parseApiError(_err);

      if (err.code === 'TOKEN_MISSING' || err.status === 401) {
        showToast({
          type: 'info',
          title: 'Login Required',
          description: 'Please log in to add items to your cart.',
        });
        window.location.href = '/auth';
        return;
      }

      if (err.code === 'STORE_CONFLICT') {
        useModalStore.getState().openModal('CONFIRM', {
          title: 'Your cart contains items from another store',
          message: 'You can clear your current cart and start a new order from this store.',
          confirmText: 'Clear Cart & Add',
          cancelText: 'Keep Current Cart',
          isDestructive: true,
          onConfirm: async () => {
            try {
              await cartService.clearCart();
              const newCart = await cartService.addItem(vars.productId, vars.variantId, vars.quantity ?? 1);
              queryClient.setQueryData(queryKeys.cart(), newCart);
              showToast({
                type: 'success',
                title: 'Cart Replaced',
                description: 'Cleared previous items and added product from new store.',
              });
            } catch (error) {
              const clearErr = parseApiError(error);
              showToast({
                type: 'error',
                title: 'Cart Reset Failed',
                description: clearErr.message,
              });
            }
          },
        });
        return;
      }

      showToast({
        type: 'error',
        title: cartErrorTitle(err.code),
        description: err.message,
      });
    },

    onSuccess: (updatedCart) => {
      // Hydrate cache with real backend data
      queryClient.setQueryData(queryKeys.cart(), updatedCart);
    },
  });

  // ─── Update Quantity ────────────────────────────────────────────────────────

  const updateQuantityMutation = useMutation({
    mutationFn: ({
      productId,
      quantity,
      variantId,
    }: {
      productId: string;
      quantity: number;
      variantId?: string;
    }) => cartService.updateItem(productId, quantity, variantId),

    onMutate: async ({ productId, quantity, variantId }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.cart() });
      const snapshot = getSnapshot();

      const current = snapshot ?? emptyCart();
      let optimisticItems = current.items
        .map((item) => {
          const match = item.productId === productId && (variantId ? (item.variantId === variantId || !item.variantId) : true);
          if (match) {
            return { ...item, quantity, total: item.price * quantity };
          }
          return item;
        })
        .filter((item) => item.quantity > 0);

      queryClient.setQueryData(queryKeys.cart(), {
        ...current,
        items: optimisticItems,
      });

      return { snapshot };
    },

    onError: (_err, _vars, context) => {
      rollback(context?.snapshot);
      const err = parseApiError(_err);
      showToast({
        type: 'error',
        title: cartErrorTitle(err.code),
        description: err.message,
      });
    },

    onSuccess: (updatedCart) => {
      queryClient.setQueryData(queryKeys.cart(), updatedCart);
    },
  });

  // ─── Remove Item ────────────────────────────────────────────────────────────

  const removeItemMutation = useMutation({
    mutationFn: ({ productId, variantId }: { productId: string; variantId?: string }) =>
      cartService.removeItem(productId, variantId),

    onMutate: async ({ productId, variantId }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.cart() });
      const snapshot = getSnapshot();

      const current = snapshot ?? emptyCart();
      queryClient.setQueryData(queryKeys.cart(), {
        ...current,
        items: current.items.filter(
          (item) =>
            !(item.productId === productId && (variantId ? (item.variantId === variantId || !item.variantId) : true)),
        ),
      });

      return { snapshot };
    },

    onError: (_err, _vars, context) => {
      rollback(context?.snapshot);
      const err = parseApiError(_err);
      showToast({
        type: 'error',
        title: 'Remove Failed',
        description: err.message,
      });
    },

    onSuccess: (updatedCart) => {
      queryClient.setQueryData(queryKeys.cart(), updatedCart);
    },
  });

  // ─── Clear Cart ─────────────────────────────────────────────────────────────

  const clearCartMutation = useMutation({
    mutationFn: () => cartService.clearCart(),

    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: queryKeys.cart() });
      const snapshot = getSnapshot();
      queryClient.setQueryData(queryKeys.cart(), emptyCart());
      return { snapshot };
    },

    onError: (_err, _vars, context) => {
      rollback(context?.snapshot);
      const err = parseApiError(_err);
      showToast({
        type: 'error',
        title: 'Clear Failed',
        description: err.message,
      });
    },

    onSuccess: (updatedCart) => {
      queryClient.setQueryData(queryKeys.cart(), updatedCart);
    },
  });

  // ─── Invalidate cart (after order placed) ────────────────────────────────────

  const invalidate = () => invalidateCart();

  return {
    addToCart: addToCartMutation.mutate,
    addToCartAsync: addToCartMutation.mutateAsync,
    isAddingToCart: addToCartMutation.isPending,

    updateQuantity: updateQuantityMutation.mutate,
    updateQuantityAsync: updateQuantityMutation.mutateAsync,
    isUpdatingQuantity: updateQuantityMutation.isPending,

    removeItem: removeItemMutation.mutate,
    removeItemAsync: removeItemMutation.mutateAsync,
    isRemoving: removeItemMutation.isPending,

    clearCart: clearCartMutation.mutate,
    clearCartAsync: clearCartMutation.mutateAsync,
    isClearing: clearCartMutation.isPending,

    invalidateCart: invalidate,
  };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function emptyCart(): CartData {
  return {
    id: null,
    store: null,
    items: [],
    subtotal: 0,
    discount: 0,
    tax: 0,
    packagingFee: 0,
    handlingFee: 0,
    deliveryFee: 0,
    surgeFee: 0,
    driverTip: 0,
    ecoPackaging: false,
    totalAmount: 0,
    coupon: null,
  };
}

function cartErrorTitle(code?: string): string {
  switch (code) {
    case 'OUT_OF_STOCK':
      return 'Out of Stock';
    case 'STORE_CLOSED':
      return 'Store Closed';
    case 'STORE_CONFLICT':
      return 'Multi-Store Cart';
    default:
      return 'Cart Error';
  }
}

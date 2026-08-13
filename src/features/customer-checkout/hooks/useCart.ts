import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '../../../core/network/queryKeys';
import { cartService } from '../services/cart-service';
import { useAuthStore } from '../../auth/store/auth-store';
import type { CartData, CartItemData } from '../../../types';

export const EMPTY_CART_DATA: CartData = {
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

/**
 * Central reactive hook for reading the customer's cart state.
 * Subscribes component to React Query cache for queryKeys.cart().
 */
export function useCart() {
  const { isAuthenticated } = useAuthStore();

  const query = useQuery<CartData>({
    queryKey: queryKeys.cart(),
    queryFn: () => cartService.getCart(),
    enabled: isAuthenticated,
    staleTime: 10_000,
    retry: 1,
  });

  const cart = query.data ?? EMPTY_CART_DATA;
  const items: CartItemData[] = cart.items ?? [];
  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);

  return {
    cart,
    items,
    itemCount,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  };
}

export default useCart;

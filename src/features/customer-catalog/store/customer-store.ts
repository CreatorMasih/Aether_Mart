import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { SelectedLocation, Product } from '../../../types';

interface CustomerState {
  selectedAddress: SelectedLocation | null;
  wishlist: Product[];
  recentlyViewed: Product[];
  searchHistory: string[];
  setSelectedAddress: (address: SelectedLocation | null) => void;
  toggleWishlist: (product: Product) => void;
  addRecentlyViewed: (product: Product) => void;
  addSearchQuery: (query: string) => void;
  clearSearchHistory: () => void;
}

export const useCustomerStore = create<CustomerState>()(
  persist(
    (set) => ({
      selectedAddress: null,
      wishlist: [],
      recentlyViewed: [],
      searchHistory: [],

      setSelectedAddress: (address) => set({ selectedAddress: address }),

      toggleWishlist: (product) => set((state) => {
        const exists = state.wishlist.some((item) => item.id === product.id);
        const newWishlist = exists
          ? state.wishlist.filter((item) => item.id !== product.id)
          : [...state.wishlist, product];
        return { wishlist: newWishlist };
      }),

      addRecentlyViewed: (product) => set((state) => {
        const filtered = state.recentlyViewed.filter((item) => item.id !== product.id);
        const newRecent = [product, ...filtered].slice(0, 10); // Keep last 10 items
        return { recentlyViewed: newRecent };
      }),

      addSearchQuery: (query) => set((state) => {
        const clean = query.trim();
        if (clean.length === 0) return {};
        const filtered = state.searchHistory.filter((q) => q.toLowerCase() !== clean.toLowerCase());
        const newHistory = [clean, ...filtered].slice(0, 5); // Keep last 5 queries
        return { searchHistory: newHistory };
      }),

      clearSearchHistory: () => set({ searchHistory: [] }),
    }),
    {
      name: 'aether-customer-storage',
      partialize: (state) => ({
        selectedAddress: state.selectedAddress,
        wishlist: state.wishlist,
        recentlyViewed: state.recentlyViewed,
        searchHistory: state.searchHistory,
      }),
    }
  )
);

export default useCustomerStore;

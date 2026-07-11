import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Product, Order } from '../../../types';

export interface MerchantOrder extends Order {
  packingCheckedItems?: string[]; // checked items in packing checklist
}

interface MerchantSettings {
  name: string;
  phone: string;
  deliveryRadiusKm: number;
  minimumOrderValue: number;
  deliveryFee: number;
  isOpen: boolean;
  holidayMode: boolean;
  bankAccount: string;
  bankName: string;
  gstin: string;
}

interface MerchantState {
  settings: MerchantSettings;
  orders: MerchantOrder[];
  products: Product[];
  payouts: {
    settledAmount: number;
    pendingAmount: number;
    history: Array<{ id: string; date: string; amount: number; status: 'SUCCESS' | 'PENDING' }>;
  };
  updateSettings: (settings: Partial<MerchantSettings>) => void;
  acceptOrder: (orderId: string) => void;
  markOrderPacking: (orderId: string) => void;
  toggleCheckItem: (orderId: string, itemId: string) => void;
  markOrderReady: (orderId: string) => void;
  cancelOrder: (orderId: string, reason: string) => void;
  addProduct: (product: Product) => void;
  updateProduct: (productId: string, product: Partial<Product>) => void;
  deleteProduct: (productId: string) => void;
}

const INITIAL_PRODUCTS: Product[] = [
  {
    id: 'p1',
    name: 'Fresh Organic Bananas',
    description: 'Perfectly ripened bananas loaded with nutrients.',
    imageUrl: 'https://images.unsplash.com/photo-1571771894821-ce9b6c11b08e?auto=format&fit=crop&w=400&q=80',
    price: 60,
    unit: '500g',
    weightGrams: 500,
    isOrganic: true,
    stock: 25,
    sku: 'FRT-BAN-01',
    categorySlug: 'fresh-fruits-and-vegetables'
  },
  {
    id: 'p2',
    name: 'Full Cream Milk',
    description: 'Pasteurized homogenised farm fresh whole milk.',
    imageUrl: 'https://images.unsplash.com/photo-1550583724-b2692b85b150?auto=format&fit=crop&w=400&q=80',
    price: 40,
    unit: '500ml',
    weightGrams: 500,
    stock: 5, // low stock alert trigger
    sku: 'MLK-CR-02',
    categorySlug: 'daily-essentials'
  },
  {
    id: 'p3',
    name: 'Organic Avocados',
    description: 'Creamy Hass avocados high in dietary fats.',
    imageUrl: 'https://images.unsplash.com/photo-1523049673857-eb18f1d7b578?auto=format&fit=crop&w=400&q=80',
    price: 180,
    unit: '1 Unit',
    weightGrams: 200,
    isOrganic: true,
    stock: 0, // out of stock trigger
    sku: 'FRT-AVO-03',
    categorySlug: 'fresh-fruits-and-vegetables'
  }
];

const INITIAL_ORDERS: MerchantOrder[] = [
  {
    id: 'ORD-982231',
    customerId: 'cust-1',
    storeId: 'store-1',
    status: 'PLACED', // New Order
    deliveryAddress: {
      id: 'addr-1',
      label: 'Home',
      receiverName: 'Ramesh Kumar',
      receiverPhone: '9988223344',
      streetAddress: '123 Fresh Lane, Koramangala',
      postalCode: '560034',
      city: 'Bengaluru',
      coordinates: { latitude: 12.9716, longitude: 77.5946 }
    },
    paymentMethod: 'UPI',
    deliveryFee: 25,
    handlingFee: 5,
    tax: 18,
    discount: 0,
    totalAmount: 148,
    createdAt: 'Today, 10:24 AM',
    items: [
      { productId: 'p1', productName: 'Fresh Organic Bananas', quantity: 2, unitPrice: 60, imageUrl: 'https://images.unsplash.com/photo-1571771894821-ce9b6c11b08e?auto=format&fit=crop&w=400&q=80' }
    ],
    packingCheckedItems: []
  },
  {
    id: 'ORD-761234',
    customerId: 'cust-2',
    storeId: 'store-1',
    status: 'PACKING', // Packed progress
    deliveryAddress: {
      id: 'addr-2',
      label: 'Work',
      receiverName: 'Sneha Patel',
      receiverPhone: '9876543210',
      streetAddress: 'Apollo Towers, Indira Nagar',
      postalCode: '560038',
      city: 'Bengaluru',
      coordinates: { latitude: 12.9784, longitude: 77.6408 }
    },
    paymentMethod: 'CARD',
    deliveryFee: 0,
    handlingFee: 5,
    tax: 36,
    discount: 50,
    totalAmount: 191,
    createdAt: 'Today, 09:12 AM',
    items: [
      { productId: 'p1', productName: 'Fresh Organic Bananas', quantity: 1, unitPrice: 60, imageUrl: 'https://images.unsplash.com/photo-1571771894821-ce9b6c11b08e?auto=format&fit=crop&w=400&q=80' },
      { productId: 'p2', productName: 'Full Cream Milk', quantity: 2, unitPrice: 40, imageUrl: 'https://images.unsplash.com/photo-1550583724-b2692b85b150?auto=format&fit=crop&w=400&q=80' }
    ],
    packingCheckedItems: ['p1']
  }
];

export const useMerchantStore = create<MerchantState>()(
  persist(
    (set) => ({
      settings: {
        name: 'Aether Fresh Market',
        phone: '9880011223',
        deliveryRadiusKm: 5,
        minimumOrderValue: 150,
        deliveryFee: 25,
        isOpen: true,
        holidayMode: false,
        bankAccount: '•••• •••• 9922',
        bankName: 'HDFC Bank',
        gstin: '29AAAAA1111A1Z1'
      },
      orders: INITIAL_ORDERS,
      products: INITIAL_PRODUCTS,
      payouts: {
        settledAmount: 18450,
        pendingAmount: 3420,
        history: [
          { id: 'SET-99120', date: '01 July 2026', amount: 8400, status: 'SUCCESS' },
          { id: 'SET-88231', date: '24 June 2026', amount: 10050, status: 'SUCCESS' }
        ]
      },

      updateSettings: (newSettings) => set((state) => ({
        settings: { ...state.settings, ...newSettings }
      })),

      acceptOrder: (orderId) => set((state) => ({
        orders: state.orders.map((o) => o.id === orderId ? { ...o, status: 'CONFIRMED' } : o)
      })),

      markOrderPacking: (orderId) => set((state) => ({
        orders: state.orders.map((o) => o.id === orderId ? { ...o, status: 'PACKING' } : o)
      })),

      toggleCheckItem: (orderId, itemId) => set((state) => ({
        orders: state.orders.map((o) => {
          if (o.id !== orderId) return o;
          const checked = o.packingCheckedItems || [];
          const nextChecked = checked.includes(itemId)
            ? checked.filter(id => id !== itemId)
            : [...checked, itemId];
          return { ...o, packingCheckedItems: nextChecked };
        })
      })),

      markOrderReady: (orderId) => set((state) => ({
        orders: state.orders.map((o) => o.id === orderId ? { ...o, status: 'READY_FOR_PICKUP' } : o)
      })),

      cancelOrder: (orderId) => set((state) => ({
        orders: state.orders.map((o) => o.id === orderId ? { ...o, status: 'CANCELLED' } : o)
      })),

      addProduct: (prod) => set((state) => ({
        products: [prod, ...state.products]
      })),

      updateProduct: (id, fields) => set((state) => ({
        products: state.products.map((p) => p.id === id ? { ...p, ...fields } : p)
      })),

      deleteProduct: (id) => set((state) => ({
        products: state.products.filter((p) => p.id !== id)
      }))
    }),
    {
      name: 'aether-merchant-store-storage',
      partialize: (state) => ({
        settings: state.settings,
        orders: state.orders,
        products: state.products,
        payouts: state.payouts
      })
    }
  )
);

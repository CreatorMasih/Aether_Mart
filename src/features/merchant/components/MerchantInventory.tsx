import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Package,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownRight,
  Plus,
  Search,
  X,
} from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../../../core/network/queryKeys';
import { apiClient } from '../../../core/network/api-client';
import { useToast } from '../../../hooks/useToast';
import { formatCurrency } from '../../../utils/formatters';
import { cn } from '../../../utils/cn';

interface InventoryItem {
  id: string;
  productId: string;
  productName: string;
  sku: string;
  category: string;
  stockQty: number;
  reservedQty: number;
  lowStockThreshold: number;
  purchasePrice: number;
  sellingPrice: number;
}

const STOCK_REASONS = [
  { key: 'STOCK_RECEIVED', label: 'Stock Received (+)' },
  { key: 'CORRECTION', label: 'Manual Correction (+/-)' },
  { key: 'DAMAGED', label: 'Damaged Goods (-)' },
  { key: 'EXPIRED', label: 'Expired Product (-)' },
];

export const MerchantInventory: React.FC = () => {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'LOW_STOCK' | 'OUT_OF_STOCK'>('ALL');

  // Adjustment Modal State
  const [adjustTarget, setAdjustTarget] = useState<InventoryItem | null>(null);
  const [adjustQty, setAdjustQty] = useState<number | ''>('');
  const [adjustType, setAdjustType] = useState<'ADD' | 'SUBTRACT'>('ADD');
  const [adjustReason, setAdjustReason] = useState('STOCK_RECEIVED');

  // 1. Queries
  const { data: profileMe } = useQuery({
    queryKey: ['auth', 'me'],
    queryFn: async () => {
      const res = await apiClient.get('/auth/me');
      return res.data.data;
    },
  });

  const store = profileMe?.profile?.store;

  const { data: productsData, isLoading } = useQuery({
    queryKey: queryKeys.merchantProducts(store?.id || ''),
    queryFn: async () => {
      const res = await apiClient.get(`/products?storeId=${store.id}`);
      return res.data.data.products;
    },
    enabled: !!store?.id,
  });

  const productsList = productsData ?? [];

  // Map products to inventory structure
  const inventoryList: InventoryItem[] = productsList.map((p: any) => {
    const firstVariant = p.variants?.[0];
    const stockQty = firstVariant?.stock ?? p.stock ?? 0;
    return {
      id: p.id,
      productId: p.id,
      productName: p.name,
      sku: p.sku || 'AM-GROC-1001',
      category: p.category?.name || 'GROCERY',
      stockQty,
      reservedQty: 0,
      lowStockThreshold: p.lowStockThreshold || 5,
      purchasePrice: Math.round(p.price * 0.75), // Calculated 25% margin baseline
      sellingPrice: p.price,
    };
  });

  const lowStockCount = inventoryList.filter((i) => i.stockQty > 0 && i.stockQty <= i.lowStockThreshold).length;
  const outOfStockCount = inventoryList.filter((i) => i.stockQty === 0).length;

  const filteredInventory = inventoryList.filter((item) => {
    const matchesSearch =
      item.productName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.sku.toLowerCase().includes(searchQuery.toLowerCase());

    if (filterStatus === 'LOW_STOCK') {
      return matchesSearch && item.stockQty > 0 && item.stockQty <= item.lowStockThreshold;
    }
    if (filterStatus === 'OUT_OF_STOCK') {
      return matchesSearch && item.stockQty === 0;
    }

    return matchesSearch;
  });

  const handleAdjustSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustTarget || adjustQty === '' || Number(adjustQty) <= 0) {
      showToast({ type: 'error', title: 'Invalid Quantity', description: 'Please enter a valid quantity adjustment.' });
      return;
    }

    const delta = adjustType === 'ADD' ? Number(adjustQty) : -Number(adjustQty);
    const newQty = Math.max(0, adjustTarget.stockQty + delta);

    // Optimistically update products cache
    queryClient.setQueryData(queryKeys.merchantProducts(store?.id || ''), (oldData: any) => {
      if (!oldData) return oldData;
      return oldData.map((p: any) => {
        if (p.id === adjustTarget.productId) {
          const updatedVariants = p.variants?.map((v: any) => ({ ...v, stock: newQty }));
          return { ...p, stock: newQty, variants: updatedVariants };
        }
        return p;
      });
    });

    showToast({
      type: 'success',
      title: 'Stock Adjusted',
      description: `Updated ${adjustTarget.productName} stock to ${newQty} units.`,
    });

    setAdjustTarget(null);
    setAdjustQty('');
  };

  if (isLoading) {
    return (
      <div className="space-y-4 p-4 animate-pulse">
        <div className="h-8 bg-border/40 rounded-xl w-48" />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[1, 2, 3].map((n) => (
            <div key={n} className="h-28 bg-border/30 rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-text-primary">Stock & Inventory Management</h1>
        <p className="text-xs text-text-secondary">
          Track stock levels, low-stock threshold alerts, and record stock adjustments
        </p>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 bg-surface border border-border rounded-2xl flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-text-secondary">Total Active Stock</p>
            <p className="text-2xl font-extrabold text-text-primary mt-1">
              {inventoryList.reduce((acc, curr) => acc + curr.stockQty, 0)} Units
            </p>
          </div>
          <div className="w-10 h-10 rounded-full bg-brand-primary/10 text-brand-primary flex items-center justify-center">
            <Package className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 bg-surface border border-border rounded-2xl flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-text-secondary">Low Stock Alerts</p>
            <p className="text-2xl font-extrabold text-warning mt-1">{lowStockCount} Products</p>
          </div>
          <div className="w-10 h-10 rounded-full bg-warning/10 text-warning flex items-center justify-center">
            <AlertTriangle className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 bg-surface border border-border rounded-2xl flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-text-secondary">Out of Stock</p>
            <p className="text-2xl font-extrabold text-error mt-1">{outOfStockCount} Products</p>
          </div>
          <div className="w-10 h-10 rounded-full bg-error/10 text-error flex items-center justify-center">
            <X className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-surface p-3 rounded-2xl border border-border">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" />
          <input
            type="text"
            placeholder="Search by Product Name or SKU..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-surface-subtle border border-border rounded-xl text-xs text-text-primary focus:outline-none focus:border-brand-primary"
          />
        </div>

        <div className="flex items-center space-x-2 w-full sm:w-auto">
          <button
            onClick={() => setFilterStatus('ALL')}
            className={cn(
              'px-3 py-1.5 rounded-xl text-xs font-semibold transition-all',
              filterStatus === 'ALL'
                ? 'bg-brand-primary text-white shadow-xs'
                : 'bg-surface-subtle text-text-secondary hover:text-text-primary'
            )}
          >
            All Items
          </button>
          <button
            onClick={() => setFilterStatus('LOW_STOCK')}
            className={cn(
              'px-3 py-1.5 rounded-xl text-xs font-semibold transition-all',
              filterStatus === 'LOW_STOCK'
                ? 'bg-warning text-white shadow-xs'
                : 'bg-surface-subtle text-text-secondary hover:text-text-primary'
            )}
          >
            Low Stock ({lowStockCount})
          </button>
          <button
            onClick={() => setFilterStatus('OUT_OF_STOCK')}
            className={cn(
              'px-3 py-1.5 rounded-xl text-xs font-semibold transition-all',
              filterStatus === 'OUT_OF_STOCK'
                ? 'bg-error text-white shadow-xs'
                : 'bg-surface-subtle text-text-secondary hover:text-text-primary'
            )}
          >
            Out of Stock ({outOfStockCount})
          </button>
        </div>
      </div>

      {/* Inventory Table */}
      <div className="bg-surface border border-border rounded-2xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead className="bg-surface-subtle border-b border-border font-bold text-text-secondary">
              <tr>
                <th className="p-3.5">Product</th>
                <th className="p-3.5">SKU</th>
                <th className="p-3.5">Category</th>
                <th className="p-3.5">Available Stock</th>
                <th className="p-3.5">Status</th>
                <th className="p-3.5">Selling Price</th>
                <th className="p-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border font-medium">
              {filteredInventory.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-text-secondary">
                    No matching inventory items found.
                  </td>
                </tr>
              ) : (
                filteredInventory.map((item) => {
                  const isLow = item.stockQty > 0 && item.stockQty <= item.lowStockThreshold;
                  const isOut = item.stockQty === 0;

                  return (
                    <tr key={item.id} className="hover:bg-surface-subtle/50 transition-colors">
                      <td className="p-3.5 font-bold text-text-primary">{item.productName}</td>
                      <td className="p-3.5 font-mono text-text-secondary">{item.sku}</td>
                      <td className="p-3.5 text-text-secondary">{item.category}</td>
                      <td className="p-3.5 font-bold text-text-primary">{item.stockQty} units</td>
                      <td className="p-3.5">
                        {isOut ? (
                          <span className="px-2 py-0.5 rounded-md bg-error/10 text-error font-bold text-[10px]">
                            Out of Stock
                          </span>
                        ) : isLow ? (
                          <span className="px-2 py-0.5 rounded-md bg-warning/10 text-warning font-bold text-[10px]">
                            Low Stock Alert
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-md bg-success/10 text-success font-bold text-[10px]">
                            In Stock
                          </span>
                        )}
                      </td>
                      <td className="p-3.5 font-bold text-text-primary">{formatCurrency(item.sellingPrice)}</td>
                      <td className="p-3.5 text-right">
                        <button
                          onClick={() => setAdjustTarget(item)}
                          className="px-3 py-1.5 bg-brand-primary/10 hover:bg-brand-primary/20 text-brand-primary font-bold text-xs rounded-xl transition-all inline-flex items-center space-x-1"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Adjust Stock</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ADJUST STOCK MODAL */}
      <AnimatePresence>
        {adjustTarget && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md bg-surface border border-border rounded-2xl p-6 shadow-2xl space-y-4"
            >
              <div className="flex items-center justify-between border-b border-border pb-3">
                <div>
                  <h3 className="text-base font-bold text-text-primary">Stock Adjustment</h3>
                  <p className="text-xs text-text-secondary">{adjustTarget.productName}</p>
                </div>
                <button
                  onClick={() => setAdjustTarget(null)}
                  className="p-1 text-text-secondary hover:text-text-primary rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleAdjustSubmit} className="space-y-4">
                {/* Current Stock Banner */}
                <div className="p-3 bg-surface-subtle border border-border rounded-xl flex items-center justify-between">
                  <span className="text-xs font-medium text-text-secondary">Current Stock</span>
                  <span className="text-sm font-extrabold text-text-primary">{adjustTarget.stockQty} Units</span>
                </div>

                {/* Adjustment Type (+ / -) */}
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setAdjustType('ADD')}
                    className={cn(
                      'py-2 rounded-xl text-xs font-bold transition-all border flex items-center justify-center space-x-1.5',
                      adjustType === 'ADD'
                        ? 'bg-success/10 text-success border-success/30 ring-1 ring-success/20'
                        : 'bg-surface border-border text-text-secondary'
                    )}
                  >
                    <ArrowUpRight className="w-4 h-4" />
                    <span>Add Stock (+)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setAdjustType('SUBTRACT')}
                    className={cn(
                      'py-2 rounded-xl text-xs font-bold transition-all border flex items-center justify-center space-x-1.5',
                      adjustType === 'SUBTRACT'
                        ? 'bg-error/10 text-error border-error/30 ring-1 ring-error/20'
                        : 'bg-surface border-border text-text-secondary'
                    )}
                  >
                    <ArrowDownRight className="w-4 h-4" />
                    <span>Reduce Stock (-)</span>
                  </button>
                </div>

                {/* Quantity */}
                <div>
                  <label className="block text-xs font-bold text-text-primary mb-1">
                    Quantity Change <span className="text-error">*</span>
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    placeholder="e.g. 20"
                    value={adjustQty}
                    onChange={(e) => setAdjustQty(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-full px-3.5 py-2.5 bg-surface-subtle border border-border rounded-xl text-xs font-bold text-text-primary focus:outline-none focus:border-brand-primary"
                  />
                </div>

                {/* Reason */}
                <div>
                  <label className="block text-xs font-bold text-text-primary mb-1">Adjustment Reason</label>
                  <select
                    value={adjustReason}
                    onChange={(e) => setAdjustReason(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-surface-subtle border border-border rounded-xl text-xs font-semibold text-text-primary focus:outline-none"
                  >
                    {STOCK_REASONS.map((r) => (
                      <option key={r.key} value={r.key}>
                        {r.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Modal Footer Actions */}
                <div className="flex items-center justify-end space-x-3 pt-3 border-t border-border">
                  <button
                    type="button"
                    onClick={() => setAdjustTarget(null)}
                    className="px-4 py-2 text-xs font-semibold text-text-secondary hover:text-text-primary bg-surface-subtle hover:bg-border rounded-xl transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 text-xs font-bold text-white bg-brand-primary hover:bg-brand-primary/90 rounded-xl transition-all shadow-sm"
                  >
                    Save Stock Adjustment
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

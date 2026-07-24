import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus,
  Trash2,
  Search,
  ChevronDown,
  ChevronUp,
  HelpCircle,
  Sparkles,
  Barcode as BarcodeIcon,
  FileSpreadsheet,
  X,
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../../../core/network/queryKeys';
import { merchantService } from '../services/merchant-service';
import { catalogService } from '../../customer-catalog/services/catalog-service';
import { apiClient } from '../../../core/network/api-client';
import { useToast } from '../../../hooks/useToast';
import { formatCurrency } from '../../../utils/formatters';
import { cn } from '../../../utils/cn';
import { ProductImageUpload } from '../../../components/ui/ProductImageUpload';
import type { ImageAngleItem } from '../../../components/ui/ProductImageUpload';
import { BarcodePreview } from '../../../components/ui/BarcodePreview';
import { ConfirmationModal } from '../../../components/ui/ConfirmationModal';
import { BulkProductUploadModal } from './BulkProductUploadModal';

const DRAFT_KEY = 'aether_merchant_product_draft';

// Category to SKU prefix mapping
const CATEGORY_SKU_PREFIXES: Record<string, string> = {
  VEGETABLES: 'AM-VEG',
  FRUITS: 'AM-FRU',
  DAIRY: 'AM-DAIRY',
  SNACKS: 'AM-SNACK',
  BEVERAGES: 'AM-BEV',
  GROCERY: 'AM-GROC',
  BAKERY: 'AM-BAKERY',
  PERSONAL_CARE: 'AM-CARE',
};

export const MerchantCatalog: React.FC = () => {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilterCategory, setSelectedFilterCategory] = useState<string>('ALL');

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [showBulkUploadModal, setShowBulkUploadModal] = useState(false);

  // Delete Confirmation
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

  // Expandable Advanced Settings
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Top 5 Essential Required Fields
  const [newName, setNewName] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState('');
  const [newPrice, setNewPrice] = useState<number | ''>('');
  const [newStock, setNewStock] = useState<number | ''>(10);
  const [images, setImages] = useState<ImageAngleItem[]>([]);

  // Category Auto-SKU State
  const [newSku, setNewSku] = useState('');
  const [isCustomSku, setIsCustomSku] = useState(false);

  // Advanced Optional Fields
  const [newBrand, setNewBrand] = useState('');
  const [newUnit, setNewUnit] = useState('500g');
  const [newMrp, setNewMrp] = useState<number | ''>('');
  const [newTaxRate] = useState<number | ''>(0);
  const [newDesc, setNewDesc] = useState('');
  const [newOrganic, setNewOrganic] = useState(false);
  const [newVeg, setNewVeg] = useState(true);

  // Draft indicator
  const [hasDraft, setHasDraft] = useState(false);

  // 1. Queries
  const { data: profileMe } = useQuery({
    queryKey: ['auth', 'me'],
    queryFn: async () => {
      const res = await apiClient.get('/auth/me');
      return res.data.data;
    },
  });

  const store = profileMe?.profile?.store;

  const { data: productsData, isLoading: productsLoading } = useQuery({
    queryKey: queryKeys.merchantProducts(store?.id || ''),
    queryFn: async () => {
      const res = await apiClient.get(`/products?storeId=${store.id}`);
      return res.data.data.products;
    },
    enabled: !!store?.id,
  });

  const { data: categoriesData } = useQuery({
    queryKey: queryKeys.categories(),
    queryFn: () => catalogService.getCategories(),
  });

  const productsList = productsData ?? [];
  const categoriesList = categoriesData ?? [];

  // Auto-generate SKU based on category
  const generateCategorySku = (catId: string) => {
    const categoryObj = categoriesList.find((c: any) => c.id === catId);
    const catName = (categoryObj?.name || 'GROCERY').toUpperCase();

    let prefix = 'AM-GROC';
    for (const [key, val] of Object.entries(CATEGORY_SKU_PREFIXES)) {
      if (catName.includes(key)) {
        prefix = val;
        break;
      }
    }

    const randomNum = Math.floor(1000 + Math.random() * 9000);
    return `${prefix}-${randomNum}`;
  };

  // Initialize category & SKU
  useEffect(() => {
    if (categoriesList.length > 0 && !selectedCategoryId) {
      const firstCatId = categoriesList[0].id;
      setSelectedCategoryId(firstCatId);
      if (!newSku) {
        setNewSku(generateCategorySku(firstCatId));
      }
    }
  }, [categoriesList, selectedCategoryId]);

  // Check saved draft on mount
  useEffect(() => {
    const savedDraft = localStorage.getItem(DRAFT_KEY);
    if (savedDraft) {
      setHasDraft(true);
    }
  }, []);

  // Auto-save form draft on changes
  useEffect(() => {
    if (newName || newPrice !== '') {
      const draftData = {
        newName,
        selectedCategoryId,
        newPrice,
        newStock,
        newSku,
        newBrand,
        newUnit,
        newMrp,
        newTaxRate,
        newDesc,
        newOrganic,
        newVeg,
        images,
      };
      localStorage.setItem(DRAFT_KEY, JSON.stringify(draftData));
    }
  }, [newName, selectedCategoryId, newPrice, newStock, newSku, newBrand, newUnit, newMrp, newTaxRate, newDesc, newOrganic, newVeg, images]);

  const handleRestoreDraft = () => {
    try {
      const savedDraft = localStorage.getItem(DRAFT_KEY);
      if (savedDraft) {
        const parsed = JSON.parse(savedDraft);
        if (parsed.newName) setNewName(parsed.newName);
        if (parsed.selectedCategoryId) setSelectedCategoryId(parsed.selectedCategoryId);
        if (parsed.newPrice !== undefined) setNewPrice(parsed.newPrice);
        if (parsed.newStock !== undefined) setNewStock(parsed.newStock);
        if (parsed.newSku) setNewSku(parsed.newSku);
        if (parsed.newBrand) setNewBrand(parsed.newBrand);
        if (parsed.newUnit) setNewUnit(parsed.newUnit);
        if (parsed.images) setImages(parsed.images);
        showToast({ type: 'success', title: 'Draft Restored', description: 'Restored your unsaved product form.' });
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleCategoryChange = (catId: string) => {
    setSelectedCategoryId(catId);
    if (!isCustomSku) {
      setNewSku(generateCategorySku(catId));
    }
  };

  // Mutations
  const createProductMutation = useMutation({
    mutationFn: (params: Parameters<typeof merchantService.createProduct>[0]) =>
      merchantService.createProduct(params),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.merchantProducts(store?.id || '') });
      queryClient.invalidateQueries({ queryKey: queryKeys.merchantDashboard() });
      showToast({ type: 'success', title: 'Product Added Successfully! 🎉', description: 'Item is now live in your store.' });
      setShowAddModal(false);
      localStorage.removeItem(DRAFT_KEY);
      setHasDraft(false);

      // Reset form
      setNewName('');
      setNewPrice('');
      setNewStock(10);
      setImages([]);
      setNewSku(generateCategorySku(selectedCategoryId));
      setIsCustomSku(false);
      setNewBrand('');
      setNewMrp('');
      setNewDesc('');
    },
    onError: (err: any) => {
      showToast({ type: 'error', title: 'Failed to Add Product', description: err.message || 'Please check all required fields.' });
    },
  });

  const deleteProductMutation = useMutation({
    mutationFn: (id: string) => merchantService.deleteProduct(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.merchantProducts(store?.id || '') });
      queryClient.invalidateQueries({ queryKey: queryKeys.merchantDashboard() });
      showToast({ type: 'success', title: 'Product Removed', description: 'Catalog item removed from store.' });
      setDeleteTargetId(null);
    },
    onError: (err: any) => {
      showToast({ type: 'error', title: 'Delete Failed', description: err.message });
      setDeleteTargetId(null);
    },
  });

  const filteredProducts = productsList.filter((p: any) => {
    const matchesSearch =
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.sku || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.brand || '').toLowerCase().includes(searchQuery.toLowerCase());

    const matchesCategory =
      selectedFilterCategory === 'ALL' || p.categoryId === selectedFilterCategory;

    return matchesSearch && matchesCategory;
  });

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Human-friendly Validation
    if (!newName.trim()) {
      showToast({ type: 'error', title: 'Missing Product Name', description: 'Please enter a product name before saving.' });
      return;
    }
    if (newPrice === '' || Number(newPrice) <= 0) {
      showToast({ type: 'error', title: 'Invalid Price', description: 'Selling price must be greater than ₹0.' });
      return;
    }
    if (newStock === '' || Number(newStock) < 0) {
      showToast({ type: 'error', title: 'Invalid Stock', description: 'Stock quantity cannot be negative.' });
      return;
    }

    const finalSku = newSku || generateCategorySku(selectedCategoryId);

    createProductMutation.mutate({
      name: newName.trim(),
      description: newDesc.trim() || `${newName} fresh Kirana catalog product.`,
      categoryId: selectedCategoryId,
      brand: newBrand.trim() || undefined,
      mrp: newMrp !== '' ? Number(newMrp) : undefined,
      taxRate: newTaxRate !== '' ? Number(newTaxRate) : 0,
      isOrganic: newOrganic,
      isVegetarian: newVeg,
      weightGrams: parseInt(newUnit.replace(/\D/g, '')) || 500,
      sku: finalSku,
      variants: [
        {
          name: newUnit,
          price: Number(newPrice),
          sku: finalSku,
          stock: Number(newStock),
        },
      ],
      images: images.map((img, index) => ({
        url: img.url,
        angle: img.angle,
        isPrimary: img.isPrimary || index === 0,
      })),
    });
  };

  const handleBulkImportComplete = (importedRows: any[]) => {
    showToast({
      type: 'success',
      title: 'Bulk Products Added',
      description: `${importedRows.length} items successfully imported into your catalog.`,
    });
    queryClient.invalidateQueries({ queryKey: queryKeys.merchantProducts(store?.id || '') });
  };

  if (productsLoading) {
    return (
      <div className="space-y-4 p-4 animate-pulse">
        <div className="h-8 bg-border/40 rounded-xl w-48" />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[1, 2, 3].map((n) => (
            <div key={n} className="h-32 bg-border/30 rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12">
      {/* Top Action Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-text-primary">Product Catalog</h1>
          <p className="text-xs text-text-secondary">
            Manage your store items, stock inventory, and auto-generated SKUs
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            type="button"
            onClick={() => setShowBulkUploadModal(true)}
            className="px-4 py-2 bg-surface border border-border hover:bg-border text-text-primary text-xs font-semibold rounded-xl transition-all flex items-center space-x-2 shadow-xs"
          >
            <FileSpreadsheet className="w-4 h-4 text-brand-primary" />
            <span>Bulk Import CSV</span>
          </button>

          <button
            type="button"
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2 bg-brand-primary hover:bg-brand-primary/90 text-white text-xs font-bold rounded-xl transition-all flex items-center space-x-2 shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>Add New Product</span>
          </button>
        </div>
      </div>

      {/* Unsaved Draft Banner */}
      {hasDraft && !showAddModal && (
        <div className="p-3 bg-brand-primary/10 border border-brand-primary/20 rounded-2xl flex items-center justify-between">
          <div className="flex items-center space-x-2 text-xs font-medium text-brand-primary">
            <Sparkles className="w-4 h-4 shrink-0" />
            <span>You have an unsaved product draft from your last session.</span>
          </div>
          <button
            onClick={() => {
              setShowAddModal(true);
              handleRestoreDraft();
            }}
            className="px-3 py-1 bg-brand-primary text-white text-xs font-bold rounded-xl shadow-xs"
          >
            Restore Draft
          </button>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-surface p-3 rounded-2xl border border-border">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" />
          <input
            type="text"
            placeholder="Search by Product Name, SKU, Brand..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-surface-subtle border border-border rounded-xl text-xs text-text-primary focus:outline-none focus:border-brand-primary"
          />
        </div>

        <div className="flex items-center space-x-2 w-full sm:w-auto">
          <span className="text-xs text-text-secondary font-medium whitespace-nowrap">Category:</span>
          <select
            value={selectedFilterCategory}
            onChange={(e) => setSelectedFilterCategory(e.target.value)}
            className="px-3 py-2 bg-surface-subtle border border-border rounded-xl text-xs font-semibold text-text-primary focus:outline-none"
          >
            <option value="ALL">All Categories</option>
            {categoriesList.map((c: any) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Product List Grid */}
      {filteredProducts.length === 0 ? (
        <div className="h-64 border border-dashed border-border rounded-2xl flex flex-col items-center justify-center p-6 text-center">
          <Sparkles className="w-8 h-8 text-text-secondary/40 mb-2" />
          <p className="text-sm font-bold text-text-primary">No products found in catalog</p>
          <p className="text-xs text-text-secondary max-w-xs mt-1">
            Click "Add New Product" to quickly add your first item to the store.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredProducts.map((p: any) => {
            const firstVariant = p.variants?.[0];
            const stockQty = firstVariant?.stock ?? p.stock ?? 0;
            const primaryImg = p.images?.find((img: any) => img.isPrimary)?.url || p.images?.[0]?.url || 'https://images.unsplash.com/photo-1542838132-92c53300491e';

            return (
              <div
                key={p.id}
                className="p-4 bg-surface border border-border rounded-2xl hover:border-brand-primary/40 transition-all flex flex-col justify-between space-y-3 group shadow-2xs"
              >
                <div className="flex items-start space-x-3">
                  <img
                    src={primaryImg}
                    alt={p.name}
                    className="w-16 h-16 rounded-xl object-cover border border-border shrink-0"
                  />
                  <div className="flex-1 min-w-0 space-y-1">
                    <span className="text-[10px] font-bold text-brand-primary bg-brand-primary/10 px-2 py-0.5 rounded-md uppercase">
                      {p.category?.name || 'GROCERY'}
                    </span>
                    <h3 className="text-sm font-bold text-text-primary truncate">{p.name}</h3>
                    <p className="text-xs text-text-secondary font-mono">{p.sku}</p>
                  </div>
                </div>

                {/* Price & Stock info */}
                <div className="flex items-center justify-between border-t border-border pt-3">
                  <div>
                    <p className="text-xs font-bold text-text-primary">{formatCurrency(p.price)}</p>
                    {p.mrp && p.mrp > p.price && (
                      <p className="text-[10px] text-text-secondary line-through">{formatCurrency(p.mrp)}</p>
                    )}
                  </div>

                  <span
                    className={cn(
                      'text-xs font-bold px-2.5 py-1 rounded-xl',
                      stockQty <= 3
                        ? 'bg-error/10 text-error'
                        : stockQty <= 10
                        ? 'bg-warning/10 text-warning'
                        : 'bg-success/10 text-success'
                    )}
                  >
                    Stock: {stockQty}
                  </span>
                </div>

                {/* Card Footer Actions */}
                <div className="flex items-center justify-end space-x-2 pt-1 border-t border-border/50">
                  <button
                    onClick={() => setDeleteTargetId(p.id)}
                    className="p-1.5 text-text-secondary hover:text-error rounded-lg transition-colors"
                    title="Delete product"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* SIMPLIFIED ADD PRODUCT MODAL */}
      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-2xl bg-surface border border-border rounded-2xl p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between border-b border-border pb-3">
                <div>
                  <h3 className="text-base font-bold text-text-primary">Add New Product</h3>
                  <p className="text-xs text-text-secondary">Fill essential fields to publish item instantly</p>
                </div>
                <button
                  onClick={() => setShowAddModal(false)}
                  className="p-1.5 text-text-secondary hover:text-text-primary rounded-xl"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleAddSubmit} className="space-y-4">
                {/* 1. Product Name */}
                <div>
                  <label className="block text-xs font-bold text-text-primary mb-1">
                    Product Name <span className="text-error">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Fresh Strawberries 250g Box"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-surface-subtle border border-border rounded-xl text-xs text-text-primary font-medium focus:outline-none focus:border-brand-primary"
                  />
                </div>

                {/* 2. Image Upload */}
                <ProductImageUpload images={images} onChange={setImages} maxImages={5} />

                {/* 3. Category & Auto-SKU */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-text-primary mb-1">
                      Category <span className="text-error">*</span>
                    </label>
                    <select
                      value={selectedCategoryId}
                      onChange={(e) => handleCategoryChange(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-surface-subtle border border-border rounded-xl text-xs font-semibold text-text-primary focus:outline-none"
                    >
                      {categoriesList.map((c: any) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-xs font-bold text-text-primary flex items-center space-x-1">
                        <span>Auto SKU</span>
                        <div title="Stock Keeping Unit (Auto-generated based on category). Editable if needed.">
                          <HelpCircle className="w-3.5 h-3.5 text-text-secondary" />
                        </div>
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          setNewSku(generateCategorySku(selectedCategoryId));
                          setIsCustomSku(false);
                        }}
                        className="text-[10px] font-bold text-brand-primary hover:underline"
                      >
                        Regenerate
                      </button>
                    </div>
                    <input
                      type="text"
                      value={newSku}
                      onChange={(e) => {
                        setNewSku(e.target.value);
                        setIsCustomSku(true);
                      }}
                      className="w-full px-3.5 py-2.5 bg-surface-subtle border border-border rounded-xl text-xs font-mono text-text-primary focus:outline-none uppercase"
                    />
                  </div>
                </div>

                {/* Barcode Preview */}
                {newSku && (
                  <div className="p-3 bg-surface-subtle rounded-xl border border-border flex items-center justify-between">
                    <div>
                      <p className="text-xs font-bold text-text-primary flex items-center space-x-1">
                        <BarcodeIcon className="w-4 h-4 text-brand-primary" />
                        <span>Auto-Generated EAN Barcode</span>
                      </p>
                      <p className="text-[10px] text-text-secondary">Ready for future barcode scanners</p>
                    </div>
                    <BarcodePreview sku={newSku} className="w-36 py-1" />
                  </div>
                )}

                {/* 4. Price & Stock */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-text-primary mb-1">
                      Selling Price (₹) <span className="text-error">*</span>
                    </label>
                    <input
                      type="number"
                      required
                      min="1"
                      placeholder="e.g. 99"
                      value={newPrice}
                      onChange={(e) => setNewPrice(e.target.value === '' ? '' : Number(e.target.value))}
                      className="w-full px-3.5 py-2.5 bg-surface-subtle border border-border rounded-xl text-xs text-text-primary font-bold focus:outline-none focus:border-brand-primary"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-text-primary mb-1">
                      Initial Stock Qty <span className="text-error">*</span>
                    </label>
                    <input
                      type="number"
                      required
                      min="0"
                      placeholder="e.g. 10"
                      value={newStock}
                      onChange={(e) => setNewStock(e.target.value === '' ? '' : Number(e.target.value))}
                      className="w-full px-3.5 py-2.5 bg-surface-subtle border border-border rounded-xl text-xs text-text-primary font-bold focus:outline-none focus:border-brand-primary"
                    />
                  </div>
                </div>

                {/* Expandable Advanced Settings */}
                <div className="border-t border-border pt-3">
                  <button
                    type="button"
                    onClick={() => setShowAdvanced(!showAdvanced)}
                    className="w-full py-2 bg-surface-subtle border border-border rounded-xl text-xs font-bold text-text-secondary hover:text-text-primary flex items-center justify-between px-3"
                  >
                    <span>Advanced Product Settings (MRP, Tax, Brand, Unit)</span>
                    {showAdvanced ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>

                  {showAdvanced && (
                    <div className="mt-3 space-y-3 p-3 bg-surface-subtle rounded-xl border border-border">
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div>
                          <label className="block text-[11px] font-semibold text-text-secondary mb-1">Brand</label>
                          <input
                            type="text"
                            placeholder="e.g. Amul, Britannia"
                            value={newBrand}
                            onChange={(e) => setNewBrand(e.target.value)}
                            className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-xs"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-semibold text-text-secondary mb-1">Unit / Pack Size</label>
                          <input
                            type="text"
                            placeholder="e.g. 500g, 1L"
                            value={newUnit}
                            onChange={(e) => setNewUnit(e.target.value)}
                            className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-xs"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-semibold text-text-secondary mb-1">MRP (₹)</label>
                          <input
                            type="number"
                            placeholder="e.g. 120"
                            value={newMrp}
                            onChange={(e) => setNewMrp(e.target.value === '' ? '' : Number(e.target.value))}
                            className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-xs"
                          />
                        </div>
                      </div>

                      <div className="flex items-center space-x-6 pt-1">
                        <label className="flex items-center space-x-2 text-xs font-semibold text-text-primary cursor-pointer">
                          <input
                            type="checkbox"
                            checked={newOrganic}
                            onChange={(e) => setNewOrganic(e.target.checked)}
                            className="w-4 h-4 accent-brand-primary"
                          />
                          <span>Organic Product</span>
                        </label>

                        <label className="flex items-center space-x-2 text-xs font-semibold text-text-primary cursor-pointer">
                          <input
                            type="checkbox"
                            checked={newVeg}
                            onChange={(e) => setNewVeg(e.target.checked)}
                            className="w-4 h-4 accent-brand-primary"
                          />
                          <span>100% Vegetarian</span>
                        </label>
                      </div>
                    </div>
                  )}
                </div>

                {/* Form Footer Buttons */}
                <div className="flex items-center justify-end space-x-3 pt-3 border-t border-border">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="px-4 py-2 text-xs font-semibold text-text-secondary hover:text-text-primary bg-surface-subtle hover:bg-border rounded-xl transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={createProductMutation.isPending}
                    className="px-5 py-2.5 text-xs font-bold text-white bg-brand-primary hover:bg-brand-primary/90 rounded-xl shadow-sm disabled:opacity-50"
                  >
                    {createProductMutation.isPending ? 'Publishing...' : 'Publish Product'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* DESTRUCTIVE ACTION CONFIRMATION MODAL */}
      <ConfirmationModal
        isOpen={!!deleteTargetId}
        onClose={() => setDeleteTargetId(null)}
        onConfirm={() => {
          if (deleteTargetId) deleteProductMutation.mutate(deleteTargetId);
        }}
        title="Delete Product"
        message="Are you sure you want to remove this item from your catalog? This action cannot be undone."
        confirmText="Delete Item"
        isDanger={true}
        isLoading={deleteProductMutation.isPending}
      />

      {/* BULK UPLOAD MODAL */}
      <BulkProductUploadModal
        isOpen={showBulkUploadModal}
        onClose={() => setShowBulkUploadModal(false)}
        onImportSuccess={handleBulkImportComplete}
      />
    </div>
  );
};

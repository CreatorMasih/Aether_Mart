import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Plus, 
  Trash2, 
  Edit, 
  Upload, 
  Search
} from 'lucide-react';
import { useMerchantStore } from '../store/merchant-store';
import { formatCurrency } from '../../../utils/formatters';
import { cn } from '../../../utils/cn';
import type { Product } from '../../../types';

export const MerchantCatalog: React.FC = () => {
  const { products, addProduct, updateProduct, deleteProduct } = useMerchantStore();

  const [searchQuery, setSearchQuery] = useState('');
  
  // Modals visibility toggles
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [activeEditProduct, setActiveEditProduct] = useState<Product | null>(null);

  // Add Form states
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newPrice, setNewPrice] = useState(0);
  const [newUnit, setNewUnit] = useState('500g');
  const [newStock, setNewStock] = useState(10);
  const [newOrganic, setNewOrganic] = useState(false);
  const [newSku, setNewSku] = useState('');

  // Edit Form states
  const [editName, setEditName] = useState('');
  const [editPrice, setEditPrice] = useState(0);
  const [editStock, setEditStock] = useState(0);

  const filteredProducts = products.filter(
    (p) => p.name.toLowerCase().includes(searchQuery.toLowerCase()) || p.sku.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleOpenEdit = (product: Product) => {
    setActiveEditProduct(product);
    setEditName(product.name);
    setEditPrice(product.price);
    setEditStock(product.stock);
    setShowEditModal(true);
  };

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName || !newSku) {
      alert('Product name and SKU are required fields.');
      return;
    }

    const prod: Product = {
      id: `p-${Date.now()}`,
      name: newName,
      description: newDesc || 'Fresh catalog store product.',
      imageUrl: 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=400&q=80',
      price: newPrice,
      unit: newUnit,
      stock: newStock,
      isOrganic: newOrganic,
      sku: newSku,
      categorySlug: 'grocery'
    };

    addProduct(prod);
    setShowAddModal(false);

    // Reset Add fields
    setNewName('');
    setNewDesc('');
    setNewPrice(0);
    setNewUnit('500g');
    setNewStock(10);
    setNewOrganic(false);
    setNewSku('');
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeEditProduct) return;

    updateProduct(activeEditProduct.id, {
      name: editName,
      price: editPrice,
      stock: editStock
    });

    setShowEditModal(false);
    setActiveEditProduct(null);
  };

  const handleBulkUploadClick = () => {
    alert('Bulk upload CSV processing module (UI Ready). Selected files will parse automatically.');
  };

  return (
    <div className="space-y-6 pb-12 text-xs font-semibold text-text-secondary select-none">
      
      {/* Search & Actions Bar */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-center bg-bg-secondary p-4 rounded-xl border border-border-primary">
        <div className="relative w-full sm:max-w-xs">
          <input
            type="text"
            placeholder="Search SKU or Name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-border-primary rounded-xl text-xs font-semibold bg-bg-tertiary focus:outline-none"
          />
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-text-secondary" />
        </div>

        <div className="flex gap-2 w-full sm:w-auto">
          <button
            onClick={handleBulkUploadClick}
            className="flex-1 sm:flex-none py-2 px-4 border border-border-primary rounded-xl hover:bg-bg-tertiary text-xs font-bold text-text-primary flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <Upload className="h-3.5 w-3.5" /> Bulk Upload
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex-1 sm:flex-none py-2 px-4 bg-brand-emerald hover:bg-brand-emerald-hover text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <Plus className="h-3.5 w-3.5" /> Add Product
          </button>
        </div>
      </div>

      {/* Catalog items grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredProducts.map((p) => {
          const isLowStock = p.stock > 0 && p.stock <= 5;
          const isOutStock = p.stock === 0;

          return (
            <div key={p.id} className="p-4 rounded-xl border border-border-primary bg-bg-secondary flex flex-col justify-between h-44 shadow-subtle relative">
              <div className="flex gap-3">
                <div className="h-16 w-16 rounded-lg bg-bg-tertiary overflow-hidden border border-border-primary flex-shrink-0">
                  <img src={p.imageUrl} alt={p.name} className="h-full w-full object-cover" />
                </div>
                
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[8px] font-extrabold px-1.5 py-0.5 rounded bg-bg-tertiary border border-border-primary text-text-secondary font-heading uppercase">
                      {p.sku}
                    </span>
                    {p.isOrganic && (
                      <span className="text-[7px] font-extrabold px-1 py-0.5 rounded bg-brand-emerald text-white uppercase font-heading">
                        ORGANIC
                      </span>
                    )}
                  </div>
                  <h4 className="text-xs font-bold text-text-primary truncate mt-1.5">{p.name}</h4>
                  <p className="text-[9px] text-text-secondary mt-0.5 font-bold uppercase tracking-wider">{p.unit} unit packs</p>
                </div>
              </div>

              {/* Status details & pricing */}
              <div className="flex items-center justify-between mt-3 pt-3 border-t border-border-primary/60">
                <div>
                  <span className="text-sm font-extrabold text-text-primary font-heading">{formatCurrency(p.price)}</span>
                  <span className={cn(
                    "text-[9px] font-bold block mt-0.5 uppercase tracking-wider",
                    isOutStock ? "text-status-error" : isLowStock ? "text-status-warning" : "text-brand-emerald"
                  )}>
                    {isOutStock ? 'OUT OF STOCK' : isLowStock ? `Only ${p.stock} units left` : `${p.stock} In Stock`}
                  </span>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => handleOpenEdit(p)}
                    className="p-1.5 border border-border-primary rounded-lg hover:bg-bg-tertiary text-text-secondary hover:text-text-primary cursor-pointer"
                    title="Edit Catalog Details"
                  >
                    <Edit className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => deleteProduct(p.id)}
                    className="p-1.5 border border-status-error/30 rounded-lg hover:bg-status-error/5 text-status-error cursor-pointer"
                    title="Delete Item"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}

        {filteredProducts.length === 0 && (
          <div className="p-8 text-center border border-dashed border-border-primary rounded-xl text-text-secondary col-span-full">
            No products matched your search or sku filter queries.
          </div>
        )}
      </div>

      {/* Add Product Modal Dialog */}
      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-overlay flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md p-6 rounded-2xl bg-bg-secondary border border-border-primary shadow-high space-y-4 text-xs font-semibold"
            >
              <h3 className="text-sm font-extrabold text-text-primary tracking-tight font-heading">Add Catalog Product</h3>
              
              <form onSubmit={handleAddSubmit} className="space-y-3.5">
                
                <div className="space-y-1">
                  <label htmlFor="newName" className="text-[10px] font-bold text-text-secondary uppercase">Product Name</label>
                  <input
                    id="newName"
                    placeholder="e.g. Organic Strawberries"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    className="w-full px-3 py-2 border border-border-primary rounded-lg bg-bg-tertiary focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label htmlFor="newDesc" className="text-[10px] font-bold text-text-secondary uppercase">Description</label>
                  <textarea
                    id="newDesc"
                    placeholder="Brief description of product features..."
                    value={newDesc}
                    onChange={(e) => setNewDesc(e.target.value)}
                    className="w-full px-3 py-2 border border-border-primary rounded-lg bg-bg-tertiary focus:outline-none h-16 resize-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label htmlFor="newPrice" className="text-[10px] font-bold text-text-secondary uppercase">Price (₹)</label>
                    <input
                      id="newPrice"
                      type="number"
                      value={newPrice}
                      onChange={(e) => setNewPrice(parseFloat(e.target.value))}
                      className="w-full px-3 py-2 border border-border-primary rounded-lg bg-bg-tertiary focus:outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label htmlFor="newUnit" className="text-[10px] font-bold text-text-secondary uppercase">Unit Pack</label>
                    <input
                      id="newUnit"
                      placeholder="e.g. 500g, 1 Unit"
                      value={newUnit}
                      onChange={(e) => setNewUnit(e.target.value)}
                      className="w-full px-3 py-2 border border-border-primary rounded-lg bg-bg-tertiary focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label htmlFor="newStock" className="text-[10px] font-bold text-text-secondary uppercase">Initial Stock</label>
                    <input
                      id="newStock"
                      type="number"
                      value={newStock}
                      onChange={(e) => setNewStock(parseInt(e.target.value))}
                      className="w-full px-3 py-2 border border-border-primary rounded-lg bg-bg-tertiary focus:outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label htmlFor="newSku" className="text-[10px] font-bold text-text-secondary uppercase">SKU Identifier</label>
                    <input
                      id="newSku"
                      placeholder="e.g. FRT-STR-05"
                      value={newSku}
                      onChange={(e) => setNewSku(e.target.value)}
                      className="w-full px-3 py-2 border border-border-primary rounded-lg bg-bg-tertiary focus:outline-none"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    id="newOrganic"
                    type="checkbox"
                    checked={newOrganic}
                    onChange={(e) => setNewOrganic(e.target.checked)}
                    className="accent-brand-emerald cursor-pointer"
                  />
                  <label htmlFor="newOrganic" className="font-bold text-text-primary block cursor-pointer">Organic Certified</label>
                </div>

                <div className="flex gap-3 pt-3">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="flex-1 py-2.5 border border-border-primary rounded-xl text-text-secondary hover:bg-bg-tertiary cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2.5 bg-brand-emerald text-white hover:bg-brand-emerald-hover rounded-xl cursor-pointer"
                  >
                    Add Product
                  </button>
                </div>

              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Edit Product Modal Dialog */}
      <AnimatePresence>
        {showEditModal && activeEditProduct && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-overlay flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md p-6 rounded-2xl bg-bg-secondary border border-border-primary shadow-high space-y-4 text-xs font-semibold"
            >
              <h3 className="text-sm font-extrabold text-text-primary tracking-tight font-heading">Edit Product: {activeEditProduct.sku}</h3>
              
              <form onSubmit={handleEditSubmit} className="space-y-4">
                
                <div className="space-y-1">
                  <label htmlFor="editName" className="text-[10px] font-bold text-text-secondary uppercase">Product Name</label>
                  <input
                    id="editName"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full px-3 py-2 border border-border-primary rounded-lg bg-bg-tertiary focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label htmlFor="editPrice" className="text-[10px] font-bold text-text-secondary uppercase">Price (₹)</label>
                    <input
                      id="editPrice"
                      type="number"
                      value={editPrice}
                      onChange={(e) => setEditPrice(parseFloat(e.target.value))}
                      className="w-full px-3 py-2 border border-border-primary rounded-lg bg-bg-tertiary focus:outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label htmlFor="editStock" className="text-[10px] font-bold text-text-secondary uppercase">Stock Level</label>
                    <input
                      id="editStock"
                      type="number"
                      value={editStock}
                      onChange={(e) => setEditStock(parseInt(e.target.value))}
                      className="w-full px-3 py-2 border border-border-primary rounded-lg bg-bg-tertiary focus:outline-none"
                    />
                  </div>
                </div>

                <div className="flex gap-3 pt-3">
                  <button
                    type="button"
                    onClick={() => {
                      setShowEditModal(false);
                      setActiveEditProduct(null);
                    }}
                    className="flex-1 py-2.5 border border-border-primary rounded-xl text-text-secondary hover:bg-bg-tertiary cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2.5 bg-brand-emerald text-white hover:bg-brand-emerald-hover rounded-xl cursor-pointer"
                  >
                    Save Changes
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

export default MerchantCatalog;

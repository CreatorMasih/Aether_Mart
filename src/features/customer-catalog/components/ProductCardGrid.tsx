import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Heart, Plus, Minus } from 'lucide-react';
import { useCustomerStore } from '../store/customer-store';
import { useCartMutations } from '../../customer-checkout/hooks/useCartMutations';
import { useCart } from '../../customer-checkout/hooks/useCart';
import { formatCurrency, formatWeight } from '../../../utils/formatters';
import { cn } from '../../../utils/cn';
import { cardHover, buttonPress } from '../../../core/theme/animations';
import type { Product } from '../../../types';

interface ProductCardGridProps {
  products: Product[];
}

export const ProductCardGrid: React.FC<ProductCardGridProps> = ({ products }) => {
  const navigate = useNavigate();
  const { wishlist, toggleWishlist } = useCustomerStore();
  const { addToCart, updateQuantity } = useCartMutations();
  const { items: cartItems } = useCart();

  const handleCardClick = (id: string) => {
    navigate(`/c/product/${id}`);
  };

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
      {products.map((product) => {
        const isWishlisted = wishlist.some((item) => item.id === product.id);
        const cartItem = cartItems.find((item) => item.productId === product.id && !item.variantId);
        const quantity = cartItem?.quantity || 0;

        const effectivePrice = product.discountPrice ?? product.price;
        const showMRP = product.discountPrice !== undefined && product.discountPrice < product.price;
        const discountPct = showMRP
          ? Math.round(((product.price - product.discountPrice!) / product.price) * 100)
          : 0;

        return (
          <motion.div
            key={product.id}
            variants={cardHover}
            initial="initial"
            whileHover="hover"
            className="rounded-2xl border border-border-primary bg-bg-secondary p-3 flex flex-col justify-between shadow-subtle relative overflow-hidden group select-none"
          >
            {/* Absolute Wishlist Button */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                toggleWishlist(product);
              }}
              className="absolute top-3 right-3 p-1.5 rounded-full bg-bg-secondary/80 backdrop-blur-md border border-border-primary/40 shadow-subtle text-text-secondary hover:text-status-error z-10 transition-colors cursor-pointer"
              aria-label={isWishlisted ? "Remove from wishlist" : "Add to wishlist"}
            >
              <Heart className={cn("h-4 w-4 transition-transform active:scale-125", isWishlisted && "fill-status-error text-status-error")} />
            </button>

            {/* Product details wrapper */}
            <div
              onClick={() => handleCardClick(product.id)}
              className="cursor-pointer space-y-2.5 flex-1 flex flex-col justify-between"
            >
              {/* Product Image */}
              <div className="aspect-square w-full rounded-xl overflow-hidden bg-bg-tertiary relative">
                <img
                  src={product.imageUrl}
                  alt={product.name}
                  loading="lazy"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src =
                      'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=300&q=80';
                  }}
                />
                {discountPct > 0 && (
                  <span className="absolute top-2 left-2 text-[8px] font-extrabold px-1.5 py-0.5 rounded bg-status-error text-white shadow-subtle font-heading tracking-wide uppercase">
                    {discountPct}% OFF
                  </span>
                )}
                {product.isOrganic && (
                  <span className="absolute bottom-2 left-2 text-[8px] font-bold px-1.5 py-0.5 rounded-full bg-brand-emerald/90 text-white shadow-subtle font-heading tracking-wide">
                    ORGANIC
                  </span>
                )}
              </div>

              {/* Text metadata */}
              <div>
                <p className="text-[10px] text-text-secondary font-bold uppercase tracking-wider">
                  {product.weightGrams ? formatWeight(product.weightGrams, 'g') : product.unit}
                </p>
                <h4 className="text-xs font-bold text-text-primary mt-0.5 leading-tight line-clamp-2">
                  {product.name}
                </h4>
              </div>
            </div>

            {/* Purchase actions */}
            <div className="flex items-center justify-between mt-3 pt-3 border-t border-border-primary/60">
              <div className="flex flex-col">
                <span className="text-sm font-extrabold text-text-primary font-heading">
                  {formatCurrency(effectivePrice)}
                </span>
                {showMRP && (
                  <span className="text-[10px] text-text-secondary line-through font-semibold">
                    {formatCurrency(product.price)}
                  </span>
                )}
              </div>

              {quantity > 0 ? (
                <div className="flex items-center gap-2 bg-brand-emerald text-white rounded-lg px-2 py-1 shadow-subtle border border-brand-emerald-hover">
                  <button
                    onClick={() => updateQuantity({ productId: product.id, quantity: quantity - 1 })}
                    className="p-0.5 hover:bg-brand-emerald-hover rounded cursor-pointer"
                    aria-label="Decrease quantity"
                  >
                    <Minus className="h-3 w-3" />
                  </button>
                  <span className="text-xs font-extrabold font-heading min-w-4 text-center">{quantity}</span>
                  <button
                    onClick={() => updateQuantity({ productId: product.id, quantity: quantity + 1 })}
                    className="p-0.5 hover:bg-brand-emerald-hover rounded cursor-pointer"
                    aria-label="Increase quantity"
                  >
                    <Plus className="h-3 w-3" />
                  </button>
                </div>
              ) : (
                <motion.button
                  variants={buttonPress}
                  whileTap="whileTap"
                  whileHover="whileHover"
                  onClick={() => addToCart({ productId: product.id, quantity: 1 })}
                  className="px-3 py-1.5 rounded-lg border border-brand-emerald/40 hover:border-brand-emerald bg-bg-secondary text-brand-emerald hover:bg-brand-emerald/5 text-xs font-bold transition-all cursor-pointer flex items-center gap-1"
                >
                  <Plus className="h-3 w-3" />
                  ADD
                </motion.button>
              )}
            </div>

          </motion.div>
        );
      })}
    </div>
  );
};

export default ProductCardGrid;

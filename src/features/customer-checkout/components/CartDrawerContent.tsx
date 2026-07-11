import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Trash2, 
  Clock, 
  Gift, 
  Check, 
  Plus, 
  Minus, 
  ChevronRight, 
  Heart,
  Leaf,
  Store,
  DollarSign
} from 'lucide-react';
import { useCartStore } from '../store/cart-store';
import { useCustomerStore } from '../../customer-catalog/store/customer-store';
import { useDrawerStore } from '../../../components/ui/drawer-manager/drawer-store';
import { formatCurrency, formatWeight } from '../../../utils/formatters';
import { PLATFORM_CONFIG } from '../../../core/config/constants';
import { useToast } from '../../../hooks/useToast';
import { cn } from '../../../utils/cn';

export const CartDrawerContent: React.FC = () => {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const closeDrawer = useDrawerStore((state) => state.closeDrawer);
  const { toggleWishlist } = useCustomerStore();
  
  const { 
    items, 
    updateQuantity, 
    removeItem, 
    getCartSubtotal
  } = useCartStore();

  // Premium State Toggles
  const [replaceUnavailable, setReplaceUnavailable] = useState(true);
  const [ecoFriendly, setEcoFriendly] = useState(false);
  const [driverTip, setDriverTip] = useState<number>(0);
  const [gstToggle, setGstToggle] = useState(false);
  const [gstin, setGstin] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [couponCode, setCouponCode] = useState('');
  const [couponDiscount, setCouponDiscount] = useState(0);

  // Cart Reservation Timer (10 mins)
  const [reservationTime, setReservationTime] = useState('09:59');

  useEffect(() => {
    let secs = 599;
    const interval = setInterval(() => {
      if (secs <= 0) {
        clearInterval(interval);
      } else {
        secs--;
        const m = Math.floor(secs / 60);
        const s = secs % 60;
        setReservationTime(`${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const subtotal = getCartSubtotal();
  const freeDeliveryLimit = PLATFORM_CONFIG.freeDeliveryThreshold;
  const progressToFreeDelivery = Math.min((subtotal / freeDeliveryLimit) * 100, 100);
  const remainingForFreeDelivery = Math.max(freeDeliveryLimit - subtotal, 0);

  // Free Gift Unlock Progress (Unlocks at ₹500)
  const giftLimit = 500;
  const progressToGift = Math.min((subtotal / giftLimit) * 100, 100);
  const remainingForGift = Math.max(giftLimit - subtotal, 0);

  // Delivery Fees Calculation
  const isFreeDelivery = subtotal >= freeDeliveryLimit;
  const deliveryFee = isFreeDelivery ? 0 : PLATFORM_CONFIG.defaultDeliveryFee;
  const packagingFee = ecoFriendly ? 25 : 15; // Eco is more expensive
  const platformFee = PLATFORM_CONFIG.handlingFee;
  const surgeFee = PLATFORM_CONFIG.surgeFee;
  
  // Taxes (18% GST)
  const tax = parseFloat(((subtotal + deliveryFee + packagingFee + platformFee + surgeFee) * 0.18).toFixed(2));
  
  // Grand Total
  const grandTotal = subtotal + deliveryFee + packagingFee + platformFee + surgeFee + tax + driverTip - couponDiscount;

  const handleApplyCoupon = (e: React.FormEvent) => {
    e.preventDefault();
    if (couponCode.toUpperCase() === 'WELCOME50' && subtotal >= 200) {
      setCouponDiscount(50);
      showToast({
        type: 'success',
        title: 'Coupon Applied',
        description: 'WELCOME50 discount coupon of ₹50 applied successfully.',
      });
    } else {
      showToast({
        type: 'error',
        title: 'Invalid Coupon',
        description: 'Try using the coupon code "WELCOME50" (Minimum order ₹200).',
      });
    }
  };

  const handleCheckoutClick = () => {
    closeDrawer();
    navigate('/c/checkout');
  };

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center h-[60vh] space-y-4">
        <span className="text-5xl">🛒</span>
        <h3 className="text-sm font-extrabold text-text-primary font-heading">Your cart is empty</h3>
        <p className="text-xs text-text-secondary max-w-[220px]">
          Add fresh items from our storefront to begin checking out.
        </p>
        <button
          onClick={closeDrawer}
          className="px-4 py-2.5 bg-brand-emerald text-white font-bold text-xs rounded-xl cursor-pointer"
        >
          Browse Products
        </button>
      </div>
    );
  }

  // Split Delivery UI grouping check:
  // If milk/bread is in cart along with shampoo/dogfood, they belong to different default stores
  const storeGroups = items.reduce((acc, item) => {
    const storeName = item.product.categorySlug === 'daily-essentials' || item.product.categorySlug === 'fresh-fruits-and-vegetables' 
      ? 'Aether Fresh Market' 
      : 'Apollo Pharmacy Express';
    if (!acc[storeName]) acc[storeName] = [];
    acc[storeName].push(item);
    return acc;
  }, {} as Record<string, typeof items>);

  return (
    <div className="flex flex-col justify-between h-full relative select-none">
      
      {/* Scrollable body content */}
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6">
        
        {/* Cart Reservation Timer */}
        <div className="p-3 rounded-xl bg-status-warning/10 text-status-warning flex items-center justify-between text-xs font-bold border border-status-warning/15">
          <span className="flex items-center gap-1.5">
            <Clock className="h-4 w-4 animate-spin text-status-warning" />
            Items reserved high demand
          </span>
          <span className="bg-status-warning text-white px-2 py-0.5 rounded text-[10px] font-heading font-extrabold shadow-subtle">
            {reservationTime}
          </span>
        </div>

        {/* Free Delivery & Gift Progress Bar */}
        <div className="space-y-4 p-4 rounded-2xl border border-border-primary bg-bg-secondary shadow-subtle">
          
          {/* Free Delivery indicator */}
          <div className="space-y-1">
            <div className="flex justify-between text-xs font-bold">
              <span className="text-text-primary">Free Delivery Progress</span>
              <span className="text-brand-emerald font-heading">
                {isFreeDelivery ? 'Unlocked' : `Add ${formatCurrency(remainingForFreeDelivery)} more`}
              </span>
            </div>
            <div className="h-2 rounded-full bg-bg-tertiary overflow-hidden">
              <div 
                className="h-full bg-brand-emerald transition-all duration-300" 
                style={{ width: `${progressToFreeDelivery}%` }} 
              />
            </div>
          </div>

          {/* Free Gift indicator */}
          <div className="space-y-1">
            <div className="flex justify-between text-xs font-bold">
              <span className="text-text-primary flex items-center gap-1">
                <Gift className="h-4 w-4 text-brand-violet" />
                Free Gift Avocado
              </span>
              <span className="text-brand-violet font-heading">
                {subtotal >= giftLimit ? 'Unlocked' : `Add ${formatCurrency(remainingForGift)} more`}
              </span>
            </div>
            <div className="h-2 rounded-full bg-bg-tertiary overflow-hidden">
              <div 
                className="h-full bg-brand-violet transition-all duration-300" 
                style={{ width: `${progressToGift}%` }} 
              />
            </div>
          </div>
        </div>

        {/* Group Split Delivery View */}
        <div className="space-y-4">
          {Object.entries(storeGroups).map(([storeName, groupItems], idx) => (
            <div key={idx} className="p-4 rounded-2xl border border-border-primary bg-bg-secondary space-y-3">
              <div className="flex items-center gap-2 border-b border-border-primary/60 pb-2">
                <Store className="h-4 w-4 text-text-secondary" />
                <span className="text-xs font-extrabold text-text-primary">{storeName}</span>
                <span className="text-[8px] font-extrabold px-1.5 py-0.5 rounded bg-brand-emerald/10 text-brand-emerald uppercase tracking-wider ml-auto">
                  Express Delivery
                </span>
              </div>

              {/* Items in this group */}
              <div className="divide-y divide-border-primary/40">
                {groupItems.map((item) => {
                  const variant = item.product.variants?.find(v => v.id === item.selectedVariantId);
                  const price = variant ? variant.price : item.product.price;
                  const displayWeight = variant 
                    ? variant.name 
                    : (item.product.weightGrams ? formatWeight(item.product.weightGrams, 'g') : item.product.unit);

                  return (
                    <div key={item.product.id} className="py-3 flex gap-3 items-start group">
                      <div className="h-12 w-12 rounded-lg bg-bg-tertiary overflow-hidden flex-shrink-0 border border-border-primary/60">
                        <img src={item.product.imageUrl} alt={item.product.name} className="h-full w-full object-cover" />
                      </div>

                      <div className="flex-1 min-w-0">
                        <h4 className="text-xs font-bold text-text-primary truncate">{item.product.name}</h4>
                        <p className="text-[9px] text-text-secondary font-bold mt-0.5 uppercase tracking-wider">
                          {displayWeight}
                        </p>
                        
                        <div className="flex items-center gap-2 mt-2">
                          <button 
                            onClick={() => toggleWishlist(item.product)}
                            className="text-[10px] font-bold text-text-secondary hover:text-status-error flex items-center gap-1 cursor-pointer"
                          >
                            <Heart className="h-3 w-3" /> Save
                          </button>
                          <span className="text-text-secondary/40">|</span>
                          <button 
                            onClick={() => removeItem(item.product.id, item.selectedVariantId)}
                            className="text-[10px] font-bold text-status-error hover:underline flex items-center gap-1 cursor-pointer"
                          >
                            <Trash2 className="h-3 w-3" /> Remove
                          </button>
                        </div>
                      </div>

                      {/* Quantity Controller & Price */}
                      <div className="text-right flex flex-col items-end gap-1.5">
                        <span className="text-xs font-extrabold text-text-primary font-heading">
                          {formatCurrency(price * item.quantity)}
                        </span>
                        
                        <div className="flex items-center gap-2 bg-brand-emerald text-white rounded-lg px-1.5 py-0.5 shadow-subtle border border-brand-emerald-hover">
                          <button 
                            onClick={() => updateQuantity(item.product.id, item.quantity - 1, item.selectedVariantId)}
                            className="p-0.5 hover:bg-brand-emerald-hover rounded cursor-pointer"
                          >
                            <Minus className="h-2.5 w-2.5" />
                          </button>
                          <span className="text-xs font-extrabold font-heading min-w-4 text-center">{item.quantity}</span>
                          <button 
                            onClick={() => updateQuantity(item.product.id, item.quantity + 1, item.selectedVariantId)}
                            className="p-0.5 hover:bg-brand-emerald-hover rounded cursor-pointer"
                          >
                            <Plus className="h-2.5 w-2.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Replacement preference & Packaging upgrades */}
        <div className="p-4 rounded-2xl border border-border-primary bg-bg-secondary space-y-4">
          <div className="flex items-center justify-between text-xs">
            <div>
              <label htmlFor="replaceUnavailable" className="font-bold text-text-primary block cursor-pointer">Replace unavailable items</label>
              <span className="text-[10px] text-text-secondary font-semibold">Call store manager to auto-replace out of stock items</span>
            </div>
            <input 
              id="replaceUnavailable"
              type="checkbox" 
              checked={replaceUnavailable} 
              onChange={(e) => setReplaceUnavailable(e.target.checked)}
              className="h-4.5 w-4.5 rounded border-border-primary text-brand-emerald focus:ring-brand-emerald accent-brand-emerald cursor-pointer"
            />
          </div>

          <div className="border-t border-border-primary/60 pt-3 flex items-center justify-between text-xs">
            <div>
              <label htmlFor="ecoFriendly" className="font-bold text-text-primary flex items-center gap-1 block cursor-pointer">
                <Leaf className="h-4 w-4 text-brand-emerald" />
                Eco-Friendly Packaging
              </label>
              <span className="text-[10px] text-text-secondary font-semibold">Use certified biodegradable compostable carry bags (+₹10)</span>
            </div>
            <input 
              id="ecoFriendly"
              type="checkbox" 
              checked={ecoFriendly} 
              onChange={(e) => setEcoFriendly(e.target.checked)}
              className="h-4.5 w-4.5 rounded border-border-primary text-brand-emerald focus:ring-brand-emerald accent-brand-emerald cursor-pointer"
            />
          </div>
        </div>

        {/* Tip Delivery Partner Option */}
        <div className="p-4 rounded-2xl border border-border-primary bg-bg-secondary space-y-3">
          <span className="text-xs font-bold text-text-secondary uppercase tracking-wider flex items-center gap-1">
            <DollarSign className="h-4 w-4" />
            Support delivery partner
          </span>
          <p className="text-[10px] text-text-secondary font-semibold leading-relaxed">
            100% of your tip goes directly to the delivery rider to support green carbon neutral transit.
          </p>
          <div className="flex gap-2">
            {[10, 20, 30, 50].map((val) => (
              <button
                key={val}
                onClick={() => setDriverTip(prev => prev === val ? 0 : val)}
                className={cn(
                  "flex-1 py-2 rounded-lg border text-xs font-bold cursor-pointer transition-all",
                  driverTip === val 
                    ? "border-brand-emerald bg-brand-emerald/5 text-brand-emerald" 
                    : "border-border-primary text-text-secondary hover:text-text-primary bg-bg-secondary"
                )}
              >
                ₹{val}
              </button>
            ))}
          </div>
        </div>

        {/* Coupon Apply Form */}
        <div className="p-4 rounded-2xl border border-border-primary bg-bg-secondary">
          <form onSubmit={handleApplyCoupon} className="flex gap-2">
            <input
              type="text"
              placeholder="Apply Promo Code (WELCOME50)"
              value={couponCode}
              onChange={(e) => setCouponCode(e.target.value)}
              className="flex-1 px-4 py-2 border border-border-primary rounded-xl text-xs font-semibold bg-bg-tertiary focus:outline-none focus:ring-2 focus:ring-brand-emerald/20 focus:border-brand-emerald uppercase"
            />
            <button
              type="submit"
              className="px-4 py-2 bg-text-primary text-bg-secondary hover:bg-text-primary/95 text-xs font-bold rounded-xl cursor-pointer"
            >
              APPLY
            </button>
          </form>
          {couponDiscount > 0 && (
            <p className="text-[10px] text-brand-emerald font-bold mt-2 flex items-center gap-1">
              <Check className="h-3 w-3" /> Coupon applied! Saved ₹50.
            </p>
          )}
        </div>

        {/* GST Invoice Toggle */}
        <div className="p-4 rounded-2xl border border-border-primary bg-bg-secondary space-y-3">
          <div className="flex items-center justify-between text-xs">
            <div>
              <label htmlFor="gstToggle" className="font-bold text-text-primary block cursor-pointer">Claim GST Invoice</label>
              <span className="text-[10px] text-text-secondary font-semibold">Enter corporate details for tax credit claims</span>
            </div>
            <input 
              id="gstToggle"
              type="checkbox" 
              checked={gstToggle} 
              onChange={(e) => setGstToggle(e.target.checked)}
              className="h-4.5 w-4.5 rounded border-border-primary text-brand-emerald focus:ring-brand-emerald accent-brand-emerald cursor-pointer"
            />
          </div>

          {gstToggle && (
            <div className="space-y-3 pt-2">
              <input
                type="text"
                placeholder="GSTIN (e.g. 29AAAAA1111A1Z1)"
                value={gstin}
                onChange={(e) => setGstin(e.target.value)}
                className="w-full px-4 py-2 border border-border-primary rounded-xl text-xs font-semibold bg-bg-tertiary"
              />
              <input
                type="text"
                placeholder="Registered Company Name"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                className="w-full px-4 py-2 border border-border-primary rounded-xl text-xs font-semibold bg-bg-tertiary"
              />
            </div>
          )}
        </div>

        {/* Detailed Bill Summary */}
        <div className="p-4 rounded-2xl border border-border-primary bg-bg-secondary space-y-3 text-xs font-semibold text-text-secondary">
          <span className="text-[10px] font-bold text-text-primary uppercase tracking-wider block">Bill Details</span>
          
          <div className="flex justify-between">
            <span>Subtotal Items</span>
            <span className="text-text-primary">{formatCurrency(subtotal)}</span>
          </div>

          {couponDiscount > 0 && (
            <div className="flex justify-between text-brand-emerald">
              <span>Coupon Savings</span>
              <span>-{formatCurrency(couponDiscount)}</span>
            </div>
          )}

          <div className="flex justify-between">
            <span>Delivery charges</span>
            <span className="text-text-primary">{isFreeDelivery ? 'FREE' : formatCurrency(deliveryFee)}</span>
          </div>

          <div className="flex justify-between">
            <span>Compostable carrybag & handling</span>
            <span className="text-text-primary">{formatCurrency(packagingFee)}</span>
          </div>

          <div className="flex justify-between">
            <span>Platform surges</span>
            <span className="text-text-primary">{formatCurrency(surgeFee + platformFee)}</span>
          </div>

          <div className="flex justify-between">
            <span>Taxes & Cess (18% GST)</span>
            <span className="text-text-primary">{formatCurrency(tax)}</span>
          </div>

          {driverTip > 0 && (
            <div className="flex justify-between text-brand-violet">
              <span>Delivery partner tip</span>
              <span>{formatCurrency(driverTip)}</span>
            </div>
          )}

          <div className="border-t border-border-primary/60 pt-3 flex justify-between text-sm font-extrabold text-text-primary">
            <span>Grand Total</span>
            <span className="font-heading">{formatCurrency(grandTotal)}</span>
          </div>
        </div>

      </div>

      {/* Sticky Bottom Actions Bar */}
      <div className="sticky bottom-0 left-0 right-0 bg-bg-secondary/90 backdrop-blur-md border-t border-border-primary p-4 flex items-center justify-between shadow-high pointer-events-auto">
        <div className="flex flex-col">
          <span className="text-[10px] text-text-secondary font-bold uppercase tracking-wider">{items.length} Items</span>
          <span className="text-base font-extrabold text-text-primary font-heading">{formatCurrency(grandTotal)}</span>
        </div>

        <button
          onClick={handleCheckoutClick}
          className="py-3.5 px-6 bg-brand-emerald text-white hover:bg-brand-emerald-hover font-semibold text-xs rounded-xl shadow-subtle flex items-center gap-1.5 cursor-pointer"
        >
          Proceed to Pay
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

    </div>
  );
};

export default CartDrawerContent;

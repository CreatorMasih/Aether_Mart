import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  MapPin, 
  Calendar, 
  CreditCard, 
  ShieldCheck, 
  ArrowRight, 
  Plus, 
  Loader2, 
  Check
} from 'lucide-react';
import { useCartStore } from '../store/cart-store';
import { useCustomerStore } from '../../customer-catalog/store/customer-store';
import { useAuthStore } from '../../auth/store/auth-store';
import { useToast } from '../../../hooks/useToast';
import { formatCurrency } from '../../../utils/formatters';
import { PLATFORM_CONFIG } from '../../../core/config/constants';
import { cn } from '../../../utils/cn';
import { pageTransition } from '../../../core/theme/animations';
import type { Address } from '../../../types';

export const CheckoutPage: React.FC = () => {
  const navigate = useNavigate();
  const { showToast } = useToast();
  
  const { user, addSavedAddress } = useAuthStore();
  const { selectedAddress, setSelectedAddress } = useCustomerStore();
  const { items, getCartSubtotal, clearCart } = useCartStore();

  // Onboarding States
  const [selectedSlot, setSelectedSlot] = useState<'EXPRESS' | 'STANDARD' | 'SCHEDULED'>('EXPRESS');
  const [scheduledTime, setScheduledTime] = useState('Tomorrow, 9 AM - 11 AM');
  
  const [paymentMethod, setPaymentMethod] = useState<'UPI' | 'CARD' | 'NET_BANKING' | 'COD'>('UPI');
  const [selectedUpiApp, setSelectedUpiApp] = useState('GPAY');
  
  // New Card form states
  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvv, setCardCvv] = useState('');
  
  // Address Modal form states
  const [showAddAddressModal, setShowAddAddressModal] = useState(false);
  const [newAddrLabel, setNewAddrLabel] = useState<'Home' | 'Work' | 'Other'>('Home');
  const [newAddrStreet, setNewAddrStreet] = useState('');
  const [newAddrZip, setNewAddrZip] = useState('');
  const [newAddrCity, setNewAddrCity] = useState('');
  const [newAddrLandmark, setNewAddrLandmark] = useState('');

  // Payment Sim Loader
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);

  const savedAddresses = user?.savedAddresses || [];
  const activeAddress = selectedAddress || savedAddresses[0] || null;

  // Bill Totals Calculations
  const subtotal = getCartSubtotal();
  const isFreeDelivery = subtotal >= PLATFORM_CONFIG.freeDeliveryThreshold;
  
  const deliveryFee = selectedSlot === 'EXPRESS' 
    ? (isFreeDelivery ? 10 : 25) 
    : (isFreeDelivery ? 0 : 15);
    
  const packagingFee = 15;
  const platformFee = PLATFORM_CONFIG.handlingFee;
  const surgeFee = PLATFORM_CONFIG.surgeFee;
  
  const tax = parseFloat(((subtotal + deliveryFee + packagingFee + platformFee + surgeFee) * 0.18).toFixed(2));
  const grandTotal = subtotal + deliveryFee + packagingFee + platformFee + surgeFee + tax;

  const handleAddNewAddress = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAddrStreet || !newAddrZip || !newAddrCity) {
      showToast({
        type: 'error',
        title: 'Form Incomplete',
        description: 'Please fill in the street address, PIN code, and city.',
      });
      return;
    }

    const newAddress: Address = {
      id: `addr-${Date.now()}`,
      label: newAddrLabel,
      receiverName: user?.fullName || 'Customer',
      receiverPhone: user?.phone || '',
      streetAddress: `${newAddrStreet}${newAddrLandmark ? `, Near ${newAddrLandmark}` : ''}`,
      postalCode: newAddrZip,
      city: newAddrCity,
      coordinates: { latitude: 12.9716, longitude: 77.5946 },
    };

    addSavedAddress(newAddress);
    setSelectedAddress(newAddress);
    setShowAddAddressModal(false);
    showToast({
      type: 'success',
      title: 'Address Registered',
      description: 'Address added to your account profile.',
    });

    // Reset Form
    setNewAddrStreet('');
    setNewAddrZip('');
    setNewAddrCity('');
    setNewAddrLandmark('');
  };

  const handlePlaceOrder = () => {
    if (!activeAddress) {
      showToast({
        type: 'error',
        title: 'Address Required',
        description: 'Please select or add a delivery address to complete your order.',
      });
      return;
    }

    if (paymentMethod === 'CARD' && (!cardNumber || !cardExpiry || !cardCvv)) {
      showToast({
        type: 'error',
        title: 'Card Details Required',
        description: 'Please enter your credit/debit card credentials.',
      });
      return;
    }

    setIsProcessingPayment(true);

    // Simulate payment processing (2.5 seconds)
    setTimeout(() => {
      setIsProcessingPayment(false);
      
      // 90% chance of success, 10% failure simulation
      const isSuccess = Math.random() > 0.1;

      if (isSuccess) {
        clearCart();
        navigate('/c/orders/confirm?status=success');
      } else {
        navigate('/c/orders/confirm?status=failed');
      }
    }, 2500);
  };

  if (items.length === 0) {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center p-6 text-center space-y-4 select-none">
        <span className="text-5xl">🛒</span>
        <h2 className="text-lg font-bold text-text-primary font-heading">Empty Checkout Cart</h2>
        <p className="text-xs text-text-secondary max-w-xs">You have no active products configured in your checkout bag.</p>
        <button onClick={() => navigate('/c/home')} className="px-4 py-2.5 bg-brand-emerald text-white font-bold text-xs rounded-xl cursor-pointer">
          Browse Storefront
        </button>
      </div>
    );
  }

  return (
    <motion.div
      variants={pageTransition}
      initial="initial"
      animate="animate"
      exit="exit"
      className="grid grid-cols-1 lg:grid-cols-3 gap-8 pb-12 select-none"
    >
      {/* Left 2 columns: Checkout settings */}
      <div className="lg:col-span-2 space-y-6">
        
        {/* 1. Delivery Address block */}
        <section className="p-5 rounded-2xl border border-border-primary bg-bg-secondary space-y-4">
          <div className="flex items-center justify-between border-b border-border-primary/60 pb-3">
            <h2 className="text-sm font-extrabold text-text-primary tracking-tight font-heading flex items-center gap-2">
              <MapPin className="h-4.5 w-4.5 text-brand-emerald" />
              Delivery Address
            </h2>
            <button
              onClick={() => setShowAddAddressModal(true)}
              className="text-xs font-bold text-brand-emerald hover:underline flex items-center gap-1 cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5" />
              Add New
            </button>
          </div>

          {savedAddresses.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {savedAddresses.map((addr) => {
                const isSelected = activeAddress?.id === addr.id;
                return (
                  <button
                    key={addr.id}
                    onClick={() => setSelectedAddress(addr)}
                    className={cn(
                      "text-left p-4 rounded-xl border flex items-start gap-3 transition-all cursor-pointer",
                      isSelected 
                        ? "border-brand-emerald bg-brand-emerald/5 text-text-primary" 
                        : "border-border-primary bg-bg-secondary hover:border-text-secondary"
                    )}
                  >
                    <div className="p-2 rounded-lg bg-bg-tertiary">
                      <MapPin className="h-4 w-4 text-text-secondary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-text-primary">{addr.label}</span>
                        {isSelected && <Check className="h-3.5 w-3.5 text-brand-emerald" />}
                      </div>
                      <p className="text-[10px] text-text-secondary mt-1 line-clamp-2">{addr.streetAddress}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-6 border border-dashed border-border-primary rounded-xl">
              <p className="text-xs text-text-secondary">No saved addresses. Please add a delivery address.</p>
            </div>
          )}
        </section>

        {/* 2. Delivery Slot selector */}
        <section className="p-5 rounded-2xl border border-border-primary bg-bg-secondary space-y-4">
          <h2 className="text-sm font-extrabold text-text-primary tracking-tight font-heading flex items-center gap-2 border-b border-border-primary/60 pb-3">
            <Calendar className="h-4.5 w-4.5 text-brand-emerald" />
            Delivery Speed
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[
              { id: 'EXPRESS', title: 'Express Delivery', eta: '12-18 Mins', fee: isFreeDelivery ? 10 : 25, desc: 'Direct rider assignment' },
              { id: 'STANDARD', title: 'Standard Delivery', eta: '45 Mins', fee: isFreeDelivery ? 0 : 15, desc: 'Eco bundled drop' },
              { id: 'SCHEDULED', title: 'Schedule Delivery', eta: 'Choose Slot', fee: 0, desc: 'Pre-book time ranges' }
            ].map((slot) => {
              const isSelected = selectedSlot === slot.id;
              return (
                <button
                  key={slot.id}
                  onClick={() => setSelectedSlot(slot.id as any)}
                  className={cn(
                    "text-left p-4 rounded-xl border flex flex-col justify-between h-28 transition-all cursor-pointer",
                    isSelected 
                      ? "border-brand-emerald bg-brand-emerald/5 text-text-primary" 
                      : "border-border-primary bg-bg-secondary hover:border-text-secondary"
                  )}
                >
                  <div>
                    <span className="text-xs font-bold block">{slot.title}</span>
                    <span className="text-[10px] text-text-secondary mt-0.5 block font-semibold">{slot.desc}</span>
                  </div>
                  <div className="flex justify-between items-center w-full mt-2">
                    <span className="text-[10px] font-bold text-brand-emerald">{slot.eta}</span>
                    <span className="text-xs font-extrabold font-heading">{slot.fee === 0 ? 'FREE' : `₹${slot.fee}`}</span>
                  </div>
                </button>
              );
            })}
          </div>

          {selectedSlot === 'SCHEDULED' && (
            <div className="p-3 bg-bg-tertiary rounded-xl border border-border-primary/60">
              <label htmlFor="scheduledTime" className="text-[10px] font-bold text-text-secondary uppercase tracking-wider block mb-1.5">Select Delivery Window</label>
              <select
                id="scheduledTime"
                value={scheduledTime}
                onChange={(e) => setScheduledTime(e.target.value)}
                className="w-full bg-bg-secondary border border-border-primary rounded-lg p-2 text-xs font-semibold"
              >
                <option value="Tomorrow, 9 AM - 11 AM">Tomorrow, 9 AM - 11 AM</option>
                <option value="Tomorrow, 11 AM - 1 PM">Tomorrow, 11 AM - 1 PM</option>
                <option value="Tomorrow, 4 PM - 6 PM">Tomorrow, 4 PM - 6 PM</option>
                <option value="Tomorrow, 6 PM - 8 PM">Tomorrow, 6 PM - 8 PM</option>
              </select>
            </div>
          )}
        </section>

        {/* 3. Payment Method block */}
        <section className="p-5 rounded-2xl border border-border-primary bg-bg-secondary space-y-4">
          <h2 className="text-sm font-extrabold text-text-primary tracking-tight font-heading flex items-center gap-2 border-b border-border-primary/60 pb-3">
            <CreditCard className="h-4.5 w-4.5 text-brand-emerald" />
            Select Payment Method
          </h2>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { id: 'UPI', label: 'UPI / Apps' },
              { id: 'CARD', label: 'Credit/Debit' },
              { id: 'NET_BANKING', label: 'Net Banking' },
              { id: 'COD', label: 'Cash on Delivery' }
            ].map((pm) => {
              const isSelected = paymentMethod === pm.id;
              return (
                <button
                  key={pm.id}
                  onClick={() => setPaymentMethod(pm.id as any)}
                  className={cn(
                    "py-3.5 text-center text-xs font-bold rounded-xl border transition-all cursor-pointer",
                    isSelected 
                      ? "border-brand-emerald bg-brand-emerald/5 text-brand-emerald" 
                      : "border-border-primary bg-bg-secondary hover:border-text-secondary"
                  )}
                >
                  {pm.label}
                </button>
              );
            })}
          </div>

          <div className="p-4 rounded-xl bg-bg-tertiary border border-border-primary/60">
            {paymentMethod === 'UPI' && (
              <div className="space-y-3">
                <label className="text-[10px] font-bold text-text-secondary uppercase tracking-wider block">UPI Application</label>
                <div className="flex flex-wrap gap-2.5">
                  {[
                    { id: 'GPAY', label: 'Google Pay' },
                    { id: 'PHONEPE', label: 'PhonePe' },
                    { id: 'PAYTM', label: 'Paytm Wallet' }
                  ].map((app) => {
                    const isSelected = selectedUpiApp === app.id;
                    return (
                      <button
                        key={app.id}
                        type="button"
                        onClick={() => setSelectedUpiApp(app.id)}
                        className={cn(
                          "px-4 py-2.5 rounded-lg border text-xs font-bold cursor-pointer transition-all",
                          isSelected 
                            ? "border-brand-emerald bg-bg-secondary text-brand-emerald" 
                            : "border-border-primary bg-bg-secondary text-text-secondary hover:text-text-primary"
                        )}
                      >
                        {app.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {paymentMethod === 'CARD' && (
              <div className="space-y-3 max-w-sm">
                <label className="text-[10px] font-bold text-text-secondary uppercase tracking-wider block">Credit / Debit Card</label>
                <div className="space-y-2.5">
                  <input
                    type="text"
                    placeholder="Card Number (4111 2222 3333 4444)"
                    value={cardNumber}
                    onChange={(e) => setCardNumber(e.target.value)}
                    maxLength={16}
                    className="w-full px-4 py-2.5 border border-border-primary rounded-xl text-xs font-semibold bg-bg-secondary"
                  />
                  <div className="grid grid-cols-2 gap-2.5">
                    <input
                      type="text"
                      placeholder="MM/YY"
                      value={cardExpiry}
                      onChange={(e) => setCardExpiry(e.target.value)}
                      maxLength={5}
                      className="px-4 py-2.5 border border-border-primary rounded-xl text-xs font-semibold bg-bg-secondary"
                    />
                    <input
                      type="password"
                      placeholder="CVV"
                      value={cardCvv}
                      onChange={(e) => setCardCvv(e.target.value)}
                      maxLength={3}
                      className="px-4 py-2.5 border border-border-primary rounded-xl text-xs font-semibold bg-bg-secondary"
                    />
                  </div>
                </div>
              </div>
            )}

            {paymentMethod === 'NET_BANKING' && (
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-text-secondary uppercase tracking-wider block">Popular Banks</label>
                <select className="w-full bg-bg-secondary border border-border-primary rounded-lg p-2 text-xs font-semibold">
                  <option>State Bank of India (SBI)</option>
                  <option>HDFC Bank</option>
                  <option>ICICI Bank</option>
                  <option>Axis Bank</option>
                </select>
              </div>
            )}

            {paymentMethod === 'COD' && (
              <div className="text-xs text-text-secondary leading-relaxed font-semibold">
                Cash / Pay on Delivery is available. Please pay the rider using cash or any UPI barcode scanner on arrival.
              </div>
            )}
          </div>

          {/* Secure gateway labels */}
          <div className="flex items-center gap-1.5 text-[10px] font-bold text-text-secondary uppercase tracking-wider justify-center">
            <ShieldCheck className="h-4.5 w-4.5 text-brand-emerald" />
            PCI-DSS Encrypted Secured Payment Gateway
          </div>
        </section>

      </div>

      {/* Right Column: Checkout Summary & Action */}
      <div className="space-y-6">
        
        {/* Bill summary panel */}
        <div className="p-5 rounded-2xl border border-border-primary bg-bg-secondary space-y-4">
          <h3 className="text-xs font-bold text-text-primary uppercase tracking-wider border-b border-border-primary pb-2">Order summary</h3>
          
          <div className="space-y-3 text-xs font-semibold text-text-secondary">
            <div className="flex justify-between">
              <span>MRP Items Subtotal</span>
              <span className="text-text-primary font-heading font-extrabold">{formatCurrency(subtotal)}</span>
            </div>
            <div className="flex justify-between">
              <span>Delivery charges</span>
              <span className="text-text-primary font-heading font-extrabold">
                {deliveryFee === 0 ? 'FREE' : formatCurrency(deliveryFee)}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Handling & packaging bags</span>
              <span className="text-text-primary font-heading font-extrabold">{formatCurrency(packagingFee)}</span>
            </div>
            <div className="flex justify-between">
              <span>Platform surge fees</span>
              <span className="text-text-primary font-heading font-extrabold">{formatCurrency(surgeFee + platformFee)}</span>
            </div>
            <div className="flex justify-between">
              <span>Taxes & Cess (18% GST)</span>
              <span className="text-text-primary font-heading font-extrabold">{formatCurrency(tax)}</span>
            </div>

            <div className="border-t border-border-primary/60 pt-3 flex justify-between text-sm font-extrabold text-text-primary">
              <span>Grand Total</span>
              <span className="font-heading text-brand-emerald">{formatCurrency(grandTotal)}</span>
            </div>
          </div>

          <button
            onClick={handlePlaceOrder}
            disabled={isProcessingPayment}
            className="w-full py-4 bg-brand-emerald hover:bg-brand-emerald-hover text-white font-bold text-xs rounded-xl shadow-subtle flex items-center justify-center gap-2 cursor-pointer transition-all"
          >
            {isProcessingPayment ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Securing Payment Gateway...
              </>
            ) : (
              <>
                Pay & Place Order
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </button>
        </div>

      </div>

      {/* Address registration Modal */}
      <AnimatePresence>
        {showAddAddressModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-overlay flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md p-6 rounded-2xl bg-bg-secondary border border-border-primary shadow-high space-y-4"
            >
              <h3 className="text-sm font-extrabold text-text-primary tracking-tight font-heading">Add Delivery Address</h3>
              
              <form onSubmit={handleAddNewAddress} className="space-y-3.5 text-xs font-semibold">
                
                {/* Type Selection */}
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-text-secondary uppercase">Address Label</span>
                  <div className="flex gap-2">
                    {(['Home', 'Work', 'Other'] as const).map((lbl) => (
                      <button
                        key={lbl}
                        type="button"
                        onClick={() => setNewAddrLabel(lbl)}
                        className={cn(
                          "flex-1 py-2 rounded-lg border text-xs font-bold cursor-pointer transition-all",
                          newAddrLabel === lbl 
                            ? "border-brand-emerald bg-brand-emerald/5 text-brand-emerald" 
                            : "border-border-primary bg-bg-tertiary"
                        )}
                      >
                        {lbl}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Street Address */}
                <div className="space-y-1">
                  <label htmlFor="newAddrStreet" className="text-[10px] font-bold text-text-secondary uppercase">Street Address</label>
                  <input
                    id="newAddrStreet"
                    placeholder="123 Fresh Lane, Koramangala"
                    value={newAddrStreet}
                    onChange={(e) => setNewAddrStreet(e.target.value)}
                    className="w-full px-3 py-2 border border-border-primary rounded-lg bg-bg-tertiary"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label htmlFor="newAddrZip" className="text-[10px] font-bold text-text-secondary uppercase">PIN Code</label>
                    <input
                      id="newAddrZip"
                      placeholder="560034"
                      value={newAddrZip}
                      onChange={(e) => setNewAddrZip(e.target.value)}
                      className="w-full px-3 py-2 border border-border-primary rounded-lg bg-bg-tertiary"
                    />
                  </div>
                  <div className="space-y-1">
                    <label htmlFor="newAddrCity" className="text-[10px] font-bold text-text-secondary uppercase">City</label>
                    <input
                      id="newAddrCity"
                      placeholder="Bengaluru"
                      value={newAddrCity}
                      onChange={(e) => setNewAddrCity(e.target.value)}
                      className="w-full px-3 py-2 border border-border-primary rounded-lg bg-bg-tertiary"
                    />
                  </div>
                </div>

                {/* Landmark */}
                <div className="space-y-1">
                  <label htmlFor="newAddrLandmark" className="text-[10px] font-bold text-text-secondary uppercase">Landmark (Optional)</label>
                  <input
                    id="newAddrLandmark"
                    placeholder="Near Central Mall"
                    value={newAddrLandmark}
                    onChange={(e) => setNewAddrLandmark(e.target.value)}
                    className="w-full px-3 py-2 border border-border-primary rounded-lg bg-bg-tertiary"
                  />
                </div>

                <div className="flex gap-3 pt-3">
                  <button
                    type="button"
                    onClick={() => setShowAddAddressModal(false)}
                    className="flex-1 py-2.5 border border-border-primary rounded-xl text-text-secondary hover:bg-bg-tertiary transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2.5 bg-brand-emerald text-white hover:bg-brand-emerald-hover rounded-xl cursor-pointer"
                  >
                    Save Address
                  </button>
                </div>

              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </motion.div>
  );
};

export default CheckoutPage;

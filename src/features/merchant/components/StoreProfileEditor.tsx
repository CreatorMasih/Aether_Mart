import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Store as StoreIcon,
  PauseCircle,
  Sun,
  Save,
} from 'lucide-react';
import { queryKeys } from '../../../core/network/queryKeys';
import { apiClient } from '../../../core/network/api-client';
import { useToast } from '../../../hooks/useToast';
import { cn } from '../../../utils/cn';

export const StoreProfileEditor: React.FC = () => {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  // Queries
  const { data: profileMe, isLoading } = useQuery({
    queryKey: ['auth', 'me'],
    queryFn: async () => {
      const res = await apiClient.get('/auth/me');
      return res.data.data;
    },
  });

  const store = profileMe?.profile?.store;
  const merchant = profileMe?.profile;

  // Form states
  const [storeName, setStoreName] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [bannerUrl, setBannerUrl] = useState('');
  const [address, setAddress] = useState('');
  const [deliveryRadiusKm, setDeliveryRadiusKm] = useState<number | ''>(5);
  const [minimumOrderValue, setMinimumOrderValue] = useState<number | ''>(100);
  const [openingTime, setOpeningTime] = useState('08:00');
  const [closingTime, setClosingTime] = useState('22:00');
  const [isOpen, setIsOpen] = useState(true);
  const [isPaused, setIsPaused] = useState(false);
  const [isHoliday, setIsHoliday] = useState(false);

  // Location Coordinates
  const [latitude, setLatitude] = useState<number | ''>(12.9716);
  const [longitude, setLongitude] = useState<number | ''>(77.5946);

  // Business & Financials
  const [gstNumber, setGstNumber] = useState('');
  const [panNumber, setPanNumber] = useState('');
  const [fssaiNumber, setFssaiNumber] = useState('');
  const [bankAccount, setBankAccount] = useState('');
  const [bankName, setBankName] = useState('');
  const [upiId, setUpiId] = useState('');

  useEffect(() => {
    if (store) {
      setStoreName(store.name || '');
      setLogoUrl(store.logoUrl || '🥬');
      setBannerUrl(store.bannerUrl || 'https://images.unsplash.com/photo-1542838132-92c53300491e');
      setAddress(store.address || '');
      setLatitude(store.latitude ?? 12.9716);
      setLongitude(store.longitude ?? 77.5946);
      setDeliveryRadiusKm(store.deliveryRadiusKm ?? 5);
      setMinimumOrderValue(store.minimumOrderValue ?? 100);
      setOpeningTime(store.openingTime || '08:00');
      setClosingTime(store.closingTime || '22:00');
      setIsOpen(store.isOpen ?? true);
      setIsPaused(store.isPaused ?? false);
      setIsHoliday(store.isHoliday ?? false);
      setUpiId(store.upiId || '');
    }
    if (merchant) {
      setOwnerName(merchant.fullName || '');
      setGstNumber(merchant.gstNumber || '');
      setPanNumber(merchant.panNumber || '');
      setFssaiNumber(merchant.fssaiNumber || '');
      setBankAccount(merchant.bankAccount || '');
      setBankName(merchant.bankName || '');
    }
  }, [store, merchant]);

  const updateStoreMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await apiClient.put('/merchant/profile', payload);
      return res.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['auth', 'me'] });
      queryClient.invalidateQueries({ queryKey: queryKeys.merchantDashboard() });
      showToast({
        type: 'success',
        title: 'Profile Updated',
        description: 'Store settings and business profile saved successfully.',
      });
    },
    onError: (err: any) => {
      showToast({
        type: 'error',
        title: 'Update Failed',
        description: err.message || 'Failed to update store settings.',
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!storeName.trim()) {
      showToast({ type: 'error', title: 'Missing Store Name', description: 'Please enter a valid store name.' });
      return;
    }
    if (!address.trim()) {
      showToast({ type: 'error', title: 'Missing Address', description: 'Store address is required.' });
      return;
    }

    updateStoreMutation.mutate({
      name: storeName.trim(),
      ownerName: ownerName.trim(),
      logoUrl,
      bannerUrl,
      address: address.trim(),
      latitude: Number(latitude) || 12.9716,
      longitude: Number(longitude) || 77.5946,
      deliveryRadiusKm: Number(deliveryRadiusKm) || 5,
      minimumOrderValue: Number(minimumOrderValue) || 0,
      openingTime,
      closingTime,
      isOpen,
      isPaused,
      isHoliday,
      gstNumber: gstNumber.trim(),
      panNumber: panNumber.trim(),
      fssaiNumber: fssaiNumber.trim(),
      bankAccount: bankAccount.trim(),
      bankName: bankName.trim(),
      upiId: upiId.trim(),
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-4 p-4 animate-pulse">
        <div className="h-8 bg-border/40 rounded-xl w-48" />
        <div className="h-64 bg-border/30 rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12 max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-text-primary">Store Business Profile</h1>
          <p className="text-xs text-text-secondary">
            Manage your store operating settings, delivery radius, tax credentials, and bank payout details
          </p>
        </div>

        <button
          onClick={handleSubmit}
          disabled={updateStoreMutation.isPending}
          className="px-4 py-2.5 bg-brand-primary hover:bg-brand-primary/90 text-white text-xs font-bold rounded-xl transition-all shadow-sm flex items-center space-x-2 disabled:opacity-50"
        >
          <Save className="w-4 h-4" />
          <span>{updateStoreMutation.isPending ? 'Saving...' : 'Save Profile Changes'}</span>
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Store Availability Toggles Banner */}
        <div className="p-4 bg-surface border border-border rounded-2xl space-y-3 shadow-xs">
          <h3 className="text-xs font-bold text-text-primary uppercase tracking-wider">
            Live Store Status & Order Reception
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div
              onClick={() => setIsOpen(!isOpen)}
              className={cn(
                'p-3 rounded-xl border cursor-pointer transition-all flex items-center justify-between',
                isOpen
                  ? 'bg-success/10 border-success/30 text-success'
                  : 'bg-surface-subtle border-border text-text-secondary'
              )}
            >
              <div className="flex items-center space-x-2">
                <StoreIcon className="w-4 h-4" />
                <span className="text-xs font-bold">{isOpen ? 'Store Open' : 'Store Closed'}</span>
              </div>
              <input type="checkbox" checked={isOpen} onChange={() => {}} className="accent-success cursor-pointer" />
            </div>

            <div
              onClick={() => setIsPaused(!isPaused)}
              className={cn(
                'p-3 rounded-xl border cursor-pointer transition-all flex items-center justify-between',
                isPaused
                  ? 'bg-warning/10 border-warning/30 text-warning'
                  : 'bg-surface-subtle border-border text-text-secondary'
              )}
            >
              <div className="flex items-center space-x-2">
                <PauseCircle className="w-4 h-4" />
                <span className="text-xs font-bold">{isPaused ? 'Orders Paused' : 'Active Orders'}</span>
              </div>
              <input type="checkbox" checked={isPaused} onChange={() => {}} className="accent-warning cursor-pointer" />
            </div>

            <div
              onClick={() => setIsHoliday(!isHoliday)}
              className={cn(
                'p-3 rounded-xl border cursor-pointer transition-all flex items-center justify-between',
                isHoliday
                  ? 'bg-error/10 border-error/30 text-error'
                  : 'bg-surface-subtle border-border text-text-secondary'
              )}
            >
              <div className="flex items-center space-x-2">
                <Sun className="w-4 h-4" />
                <span className="text-xs font-bold">{isHoliday ? 'Holiday Mode' : 'Regular Operating'}</span>
              </div>
              <input type="checkbox" checked={isHoliday} onChange={() => {}} className="accent-error cursor-pointer" />
            </div>
          </div>
        </div>

        {/* Store Basic Information */}
        <div className="p-4 bg-surface border border-border rounded-2xl space-y-4 shadow-xs">
          <h3 className="text-xs font-bold text-text-primary uppercase tracking-wider">
            1. Store Details
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-text-primary mb-1">
                Store Name <span className="text-error">*</span>
              </label>
              <input
                type="text"
                required
                value={storeName}
                onChange={(e) => setStoreName(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-surface-subtle border border-border rounded-xl text-xs text-text-primary font-medium focus:outline-none focus:border-brand-primary"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-text-primary mb-1">Owner Full Name</label>
              <input
                type="text"
                value={ownerName}
                onChange={(e) => setOwnerName(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-surface-subtle border border-border rounded-xl text-xs text-text-primary font-medium focus:outline-none focus:border-brand-primary"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-text-primary mb-1">
              Store Physical Address <span className="text-error">*</span>
            </label>
            <textarea
              rows={2}
              required
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="w-full px-3.5 py-2 bg-surface-subtle border border-border rounded-xl text-xs text-text-primary font-medium focus:outline-none focus:border-brand-primary"
            />
          </div>
        </div>

        {/* Operating Hours & Hyperlocal Radius */}
        <div className="p-4 bg-surface border border-border rounded-2xl space-y-4 shadow-xs">
          <h3 className="text-xs font-bold text-text-primary uppercase tracking-wider">
            2. Hours & Delivery Radius
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-bold text-text-primary mb-1">Opening Time</label>
              <input
                type="time"
                value={openingTime}
                onChange={(e) => setOpeningTime(e.target.value)}
                className="w-full px-3 py-2 bg-surface-subtle border border-border rounded-xl text-xs font-semibold text-text-primary"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-text-primary mb-1">Closing Time</label>
              <input
                type="time"
                value={closingTime}
                onChange={(e) => setClosingTime(e.target.value)}
                className="w-full px-3 py-2 bg-surface-subtle border border-border rounded-xl text-xs font-semibold text-text-primary"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-text-primary mb-1">Delivery Radius (km)</label>
              <input
                type="number"
                min="1"
                max="25"
                value={deliveryRadiusKm}
                onChange={(e) => setDeliveryRadiusKm(e.target.value === '' ? '' : Number(e.target.value))}
                className="w-full px-3 py-2 bg-surface-subtle border border-border rounded-xl text-xs font-bold text-text-primary"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-text-primary mb-1">Min Order Value (₹)</label>
              <input
                type="number"
                min="0"
                value={minimumOrderValue}
                onChange={(e) => setMinimumOrderValue(e.target.value === '' ? '' : Number(e.target.value))}
                className="w-full px-3 py-2 bg-surface-subtle border border-border rounded-xl text-xs font-bold text-text-primary"
              />
            </div>
          </div>
        </div>

        {/* Business Licenses & Financial Payout Details */}
        <div className="p-4 bg-surface border border-border rounded-2xl space-y-4 shadow-xs">
          <h3 className="text-xs font-bold text-text-primary uppercase tracking-wider">
            3. Tax Credentials & Payout Account
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-text-primary mb-1">GST Number</label>
              <input
                type="text"
                placeholder="29AAAAA0000A1Z5"
                value={gstNumber}
                onChange={(e) => setGstNumber(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-surface-subtle border border-border rounded-xl text-xs font-mono uppercase"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-text-primary mb-1">PAN Number</label>
              <input
                type="text"
                placeholder="ABCDE1234F"
                value={panNumber}
                onChange={(e) => setPanNumber(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-surface-subtle border border-border rounded-xl text-xs font-mono uppercase"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-text-primary mb-1">FSSAI License</label>
              <input
                type="text"
                placeholder="10000000000000"
                value={fssaiNumber}
                onChange={(e) => setFssaiNumber(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-surface-subtle border border-border rounded-xl text-xs font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 border-t border-border">
            <div>
              <label className="block text-xs font-bold text-text-primary mb-1">Bank Name</label>
              <input
                type="text"
                placeholder="HDFC Bank"
                value={bankName}
                onChange={(e) => setBankName(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-surface-subtle border border-border rounded-xl text-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-text-primary mb-1">Bank Account Number</label>
              <input
                type="text"
                placeholder="5010000000000"
                value={bankAccount}
                onChange={(e) => setBankAccount(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-surface-subtle border border-border rounded-xl text-xs font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-text-primary mb-1">UPI ID for Payouts</label>
              <input
                type="text"
                placeholder="storename@okicici"
                value={upiId}
                onChange={(e) => setUpiId(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-surface-subtle border border-border rounded-xl text-xs font-medium text-brand-primary"
              />
            </div>
          </div>
        </div>
      </form>
    </div>
  );
};

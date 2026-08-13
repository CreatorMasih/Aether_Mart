import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, MapPin, Navigation, Home, Briefcase, Tag, Loader2, AlertCircle } from 'lucide-react';
import { addressService, type CreateAddressInput } from '../../features/customer-checkout/services/address-service';
import { useCustomerAddresses } from '../../features/customer-checkout/hooks/useCustomerAddresses';
import { useToast } from '../../hooks/useToast';
import { useAuthStore } from '../../features/auth/store/auth-store';
import type { Address } from '../../types';

interface AddAddressModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (address: Address) => void;
  editingAddress?: Address | null;
}

export const AddAddressModal: React.FC<AddAddressModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  editingAddress,
}) => {
  const { user } = useAuthStore();
  const { createAddress, updateAddress, isCreating, isUpdating } = useCustomerAddresses();
  const { showToast } = useToast();

  const [label, setLabel] = useState<'Home' | 'Work' | 'Other'>('Home');
  const [streetAddress, setStreetAddress] = useState('');
  const [apartmentSuite, setApartmentSuite] = useState('');
  const [landmark, setLandmark] = useState('');
  const [postalCode, setPostalCode] = useState('493445');
  const [city, setCity] = useState('Mahasamund');
  const [district, setDistrict] = useState('Mahasamund');
  const [state, setState] = useState('Chhattisgarh');
  const [receiverName, setReceiverName] = useState('');
  const [receiverPhone, setReceiverPhone] = useState('');
  const [latitude, setLatitude] = useState(21.1085);
  const [longitude, setLongitude] = useState(82.0965);

  const [isGeocoding, setIsGeocoding] = useState(false);
  const [isPincodeLoading, setIsPincodeLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serviceabilityWarning, setServiceabilityWarning] = useState<string | null>(null);

  // Populate values when editing or resetting
  useEffect(() => {
    if (editingAddress) {
      setLabel(editingAddress.label || 'Home');
      setStreetAddress(editingAddress.streetAddress || '');
      setApartmentSuite(editingAddress.apartmentSuite || '');
      setLandmark(editingAddress.landmark || '');
      setPostalCode(editingAddress.postalCode || '493445');
      setCity(editingAddress.city || 'Mahasamund');
      setDistrict(editingAddress.district || 'Mahasamund');
      setState(editingAddress.state || 'Chhattisgarh');
      setReceiverName(editingAddress.receiverName || user?.fullName || 'Customer');
      setReceiverPhone(editingAddress.receiverPhone || user?.phone || '');
      setLatitude(editingAddress.latitude || 21.1085);
      setLongitude(editingAddress.longitude || 82.0965);
    } else {
      setLabel('Home');
      setStreetAddress('');
      setApartmentSuite('');
      setLandmark('');
      setPostalCode('493445');
      setCity('Mahasamund');
      setDistrict('Mahasamund');
      setState('Chhattisgarh');
      setReceiverName(user?.fullName || 'Customer');
      setReceiverPhone(user?.phone || '');
      setLatitude(21.1085);
      setLongitude(82.0965);
    }
    setErrors({});
    setServiceabilityWarning(null);
  }, [editingAddress, isOpen, user]);

  // Handle PIN Code auto-fill
  const handlePincodeChange = async (val: string) => {
    const cleanPin = val.replace(/\D/g, '').slice(0, 6);
    setPostalCode(cleanPin);

    if (errors.postalCode) {
      setErrors((prev) => ({ ...prev, postalCode: '' }));
    }

    if (cleanPin.length === 6) {
      setIsPincodeLoading(true);
      const details = await addressService.getPincodeDetails(cleanPin);
      setIsPincodeLoading(false);

      if (details) {
        setCity(details.city);
        setDistrict(details.district);
        setState(details.state);

        // Check Mahasamund serviceability
        if (!details.city.toLowerCase().includes('mahasamund') && !details.district.toLowerCase().includes('mahasamund') && cleanPin !== '493445') {
          setServiceabilityWarning("Aether Mart isn't available at this location yet. Currently serving Mahasamund, CG.");
        } else {
          setServiceabilityWarning(null);
        }
      }
    }
  };

  // Handle GPS location lookup
  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      showToast({
        type: 'error',
        title: 'GPS Unavailable',
        description: 'Geolocation is not supported by your browser.',
      });
      return;
    }

    setIsGeocoding(true);
    setServiceabilityWarning(null);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;

        setLatitude(lat);
        setLongitude(lng);

        const geoResult = await addressService.reverseGeocode(lat, lng);
        setIsGeocoding(false);

        if (geoResult) {
          if (geoResult.streetAddress) setStreetAddress(geoResult.streetAddress);
          if (geoResult.postalCode) setPostalCode(geoResult.postalCode);
          if (geoResult.city) setCity(geoResult.city);
          if (geoResult.state) setState(geoResult.state);

          if (!geoResult.isServiceable) {
            setServiceabilityWarning("Aether Mart isn't available at this location yet. Serving Mahasamund only.");
          } else {
            setServiceabilityWarning(null);
          }

          showToast({
            type: 'success',
            title: 'Location Captured 📍',
            description: geoResult.formattedAddress || 'Location reverse geocoded.',
          });
        } else {
          // Default fallback to Mahasamund
          setCity('Mahasamund');
          setState('Chhattisgarh');
          showToast({
            type: 'info',
            title: 'GPS Coordinates Set',
            description: `Lat: ${lat.toFixed(4)}, Lng: ${lng.toFixed(4)}`,
          });
        }
      },
      (error) => {
        setIsGeocoding(false);
        showToast({
          type: 'error',
          title: 'GPS Permission Denied',
          description: error.message || 'Could not fetch current GPS location.',
        });
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  };

  // Form validation
  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!streetAddress.trim()) {
      newErrors.streetAddress = 'Street address / house number is required *';
    } else if (streetAddress.trim().length < 3) {
      newErrors.streetAddress = 'Street address must be at least 3 characters';
    }

    if (!postalCode.trim()) {
      newErrors.postalCode = 'PIN Code is required *';
    } else if (!/^\d{6}$/.test(postalCode.trim())) {
      newErrors.postalCode = 'Please enter a valid 6-digit Indian PIN code';
    }

    if (!city.trim()) {
      newErrors.city = 'City is required *';
    }

    if (!state.trim()) {
      newErrors.state = 'State is required *';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Form submit handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) {
      showToast({
        type: 'error',
        title: 'Validation Error',
        description: 'Please fix highlighted errors before saving.',
      });
      return;
    }

    const payload: CreateAddressInput = {
      label,
      streetAddress: streetAddress.trim(),
      apartmentSuite: apartmentSuite.trim() || undefined,
      landmark: landmark.trim() || undefined,
      postalCode: postalCode.trim(),
      city: city.trim(),
      district: district.trim(),
      state: state.trim(),
      country: 'India',
      receiverName: receiverName.trim() || user?.fullName || 'Customer',
      receiverPhone: receiverPhone.trim() || user?.phone || '9999999999',
      latitude,
      longitude,
      isDefault: false,
    };

    try {
      let saved: Address;
      if (editingAddress?.id) {
        saved = await updateAddress({ id: editingAddress.id, input: payload });
      } else {
        saved = await createAddress(payload);
      }

      if (onSuccess) {
        onSuccess(saved);
      }
      onClose();
    } catch {
      // Error toast handled inside hook
    }
  };

  const isSubmitting = isCreating || isUpdating;

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            className="w-full max-w-lg overflow-hidden rounded-2xl bg-bg-primary border border-border-primary shadow-2xl"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-border-primary bg-bg-secondary/50">
              <div className="flex items-center gap-2">
                <MapPin className="h-5 w-5 text-brand-emerald" />
                <h2 className="text-base font-bold text-text-primary font-heading">
                  {editingAddress ? 'Edit Delivery Address' : 'Add Delivery Address'}
                </h2>
              </div>
              <button
                onClick={onClose}
                className="p-1 rounded-lg hover:bg-bg-tertiary text-text-secondary transition-colors cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              
              {/* Address Type Selector */}
              <div>
                <label className="block text-xs font-bold text-text-secondary mb-2">
                  Address type <span className="text-status-error">*</span>
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(['Home', 'Work', 'Other'] as const).map((type) => {
                    const isSelected = label === type;
                    const Icon = type === 'Home' ? Home : type === 'Work' ? Briefcase : Tag;
                    return (
                      <button
                        key={type}
                        type="button"
                        onClick={() => setLabel(type)}
                        className={`flex items-center justify-center gap-2 py-2 px-3 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                          isSelected
                            ? 'border-brand-emerald bg-brand-emerald/10 text-brand-emerald shadow-sm'
                            : 'border-border-primary bg-bg-secondary text-text-secondary hover:border-text-secondary'
                        }`}
                      >
                        <Icon className="h-3.5 w-3.5" />
                        {type}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* GPS Button */}
              <div>
                <button
                  type="button"
                  onClick={handleUseCurrentLocation}
                  disabled={isGeocoding}
                  className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl border border-brand-emerald/40 bg-brand-emerald/5 hover:bg-brand-emerald/10 text-brand-emerald text-xs font-bold transition-colors cursor-pointer disabled:opacity-50"
                >
                  {isGeocoding ? (
                    <Loader2 className="h-4 w-4 animate-spin text-brand-emerald" />
                  ) : (
                    <Navigation className="h-4 w-4" />
                  )}
                  {isGeocoding ? 'Detecting Location...' : 'Use Current Location'}
                </button>
              </div>

              {/* Serviceability Warning */}
              {serviceabilityWarning && (
                <div className="flex items-start gap-2 p-3 rounded-xl bg-status-warning/10 border border-status-warning/30 text-status-warning text-xs font-medium">
                  <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                  <span>{serviceabilityWarning}</span>
                </div>
              )}

              {/* Street Address */}
              <div>
                <label className="block text-xs font-bold text-text-secondary mb-1">
                  Delivery Address <span className="text-status-error">*</span>
                </label>
                <textarea
                  rows={2}
                  value={streetAddress}
                  onChange={(e) => {
                    setStreetAddress(e.target.value);
                    if (errors.streetAddress) setErrors((prev) => ({ ...prev, streetAddress: '' }));
                  }}
                  placeholder="Enter house / street / area / apartment"
                  className={`w-full px-3.5 py-2.5 rounded-xl border bg-bg-secondary text-xs text-text-primary focus:outline-none focus:ring-2 focus:ring-brand-emerald transition-all ${
                    errors.streetAddress ? 'border-status-error focus:ring-status-error' : 'border-border-primary'
                  }`}
                />
                {errors.streetAddress && (
                  <p className="mt-1 text-[11px] font-medium text-status-error">{errors.streetAddress}</p>
                )}
              </div>

              {/* PIN Code & City */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-text-secondary mb-1">
                    PIN Code <span className="text-status-error">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      maxLength={6}
                      value={postalCode}
                      onChange={(e) => handlePincodeChange(e.target.value)}
                      placeholder="493445"
                      className={`w-full px-3.5 py-2 rounded-xl border bg-bg-secondary text-xs text-text-primary focus:outline-none focus:ring-2 focus:ring-brand-emerald transition-all ${
                        errors.postalCode ? 'border-status-error focus:ring-status-error' : 'border-border-primary'
                      }`}
                    />
                    {isPincodeLoading && (
                      <Loader2 className="absolute right-3 top-2.5 h-3.5 w-3.5 animate-spin text-brand-emerald" />
                    )}
                  </div>
                  {errors.postalCode && (
                    <p className="mt-1 text-[11px] font-medium text-status-error">{errors.postalCode}</p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold text-text-secondary mb-1">
                    City <span className="text-status-error">*</span>
                  </label>
                  <input
                    type="text"
                    value={city}
                    onChange={(e) => {
                      setCity(e.target.value);
                      if (errors.city) setErrors((prev) => ({ ...prev, city: '' }));
                    }}
                    placeholder="Mahasamund"
                    className={`w-full px-3.5 py-2 rounded-xl border bg-bg-secondary text-xs text-text-primary focus:outline-none focus:ring-2 focus:ring-brand-emerald transition-all ${
                      errors.city ? 'border-status-error focus:ring-status-error' : 'border-border-primary'
                    }`}
                  />
                  {errors.city && (
                    <p className="mt-1 text-[11px] font-medium text-status-error">{errors.city}</p>
                  )}
                </div>
              </div>

              {/* State & Landmark */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-text-secondary mb-1">
                    State <span className="text-status-error">*</span>
                  </label>
                  <input
                    type="text"
                    value={state}
                    onChange={(e) => {
                      setState(e.target.value);
                      if (errors.state) setErrors((prev) => ({ ...prev, state: '' }));
                    }}
                    placeholder="Chhattisgarh"
                    className={`w-full px-3.5 py-2 rounded-xl border bg-bg-secondary text-xs text-text-primary focus:outline-none focus:ring-2 focus:ring-brand-emerald transition-all ${
                      errors.state ? 'border-status-error focus:ring-status-error' : 'border-border-primary'
                    }`}
                  />
                  {errors.state && (
                    <p className="mt-1 text-[11px] font-medium text-status-error">{errors.state}</p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold text-text-secondary mb-1">
                    Landmark <span className="text-text-tertiary font-normal">(optional)</span>
                  </label>
                  <input
                    type="text"
                    value={landmark}
                    onChange={(e) => setLandmark(e.target.value)}
                    placeholder="Near City Park"
                    className="w-full px-3.5 py-2 rounded-xl border border-border-primary bg-bg-secondary text-xs text-text-primary focus:outline-none focus:ring-2 focus:ring-brand-emerald transition-all"
                  />
                </div>
              </div>

              {/* Modal Footer Actions */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-border-primary">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={isSubmitting}
                  className="px-4 py-2.5 rounded-xl border border-border-primary hover:bg-bg-tertiary text-text-secondary text-xs font-bold transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-brand-emerald hover:bg-brand-emerald-dark text-white text-xs font-bold shadow-md transition-all cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  {isSubmitting ? 'Saving Address...' : 'Save Address'}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default AddAddressModal;

import React, { useState } from 'react';
import { MapPin, Navigation, Search, X, Loader2, Check, AlertCircle, Bell } from 'lucide-react';
import { useCustomerStore } from '../../features/customer-catalog/store/customer-store';
import { useCustomerAddresses } from '../../features/customer-checkout/hooks/useCustomerAddresses';
import { useAuthStore } from '../../features/auth/store/auth-store';
import { useToast } from '../../hooks/useToast';
import { checkLocationServiceability, DEFAULT_MAHASAMUND_LOCATION } from '../../core/config/serviceability';
import type { CustomerLocation, Address } from '../../types';

interface LocationPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const LocationPickerModal: React.FC<LocationPickerModalProps> = ({ isOpen, onClose }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isGpsLoading, setIsGpsLoading] = useState(false);
  const [isSearchLoading, setIsSearchLoading] = useState(false);
  const [outOfAreaState, setOutOfAreaState] = useState<string | null>(null);

  const [searchResults, setSearchResults] = useState<Array<{
    id: string;
    title: string;
    subtitle: string;
    city: string;
    district: string;
    state: string;
    pincode: string;
    isServiceable: boolean;
  }>>([]);

  const { selectedAddress, setSelectedAddress } = useCustomerStore();
  const { user } = useAuthStore();
  const { showToast } = useToast();
  const { addresses: savedAddresses = [] } = useCustomerAddresses();

  if (!isOpen) return null;

  const handleSelectMahasamund = () => {
    setSelectedAddress(DEFAULT_MAHASAMUND_LOCATION);
    showToast({
      type: 'success',
      title: 'Location Set',
      description: 'Delivering to Mahasamund, Chhattisgarh.',
    });
    setOutOfAreaState(null);
    onClose();
  };

  const handleUseGps = () => {
    if (!navigator.geolocation) {
      showToast({
        type: 'error',
        title: 'GPS Unavailable',
        description: 'Geolocation is not supported by your browser.',
      });
      return;
    }

    setIsGpsLoading(true);
    setOutOfAreaState(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;

        const serviceCheck = checkLocationServiceability({ latitude: lat, longitude: lng });

        if (serviceCheck.isServiceable) {
          const newLoc: CustomerLocation = {
            id: `loc-gps-${Date.now()}`,
            selectionType: 'GPS',
            label: 'Mahasamund',
            receiverName: user?.fullName || 'Customer',
            receiverPhone: user?.phone || '',
            streetAddress: 'Mahasamund, Chhattisgarh',
            postalCode: '493445',
            city: 'Mahasamund',
            district: 'Mahasamund',
            state: 'Chhattisgarh',
            coordinates: { latitude: lat, longitude: lng },
            isServiceable: true,
          };

          setSelectedAddress(newLoc);
          showToast({
            type: 'success',
            title: 'Location Resolved',
            description: 'Delivering to Mahasamund, Chhattisgarh.',
          });
          setIsGpsLoading(false);
          onClose();
        } else {
          setIsGpsLoading(false);
          setOutOfAreaState('Outside service area');
        }
      },
      (error) => {
        setIsGpsLoading(false);
        let msg = 'Location access was off or denied. Delivering to Mahasamund.';
        if (error.code === error.PERMISSION_DENIED) {
          msg = 'Location permission denied. Defaulting to Mahasamund.';
        }
        showToast({
          type: 'info',
          title: 'GPS Location',
          description: msg,
        });
        handleSelectMahasamund();
      },
      { enableHighAccuracy: true, timeout: 6000 }
    );
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const query = searchQuery.trim();
    if (!query) return;

    setIsSearchLoading(true);
    setSearchResults([]);
    setOutOfAreaState(null);

    const serviceCheck = checkLocationServiceability({
      pincode: query,
      city: query,
      district: query,
    });

    if (serviceCheck.isServiceable) {
      setSearchResults([
        {
          id: `mah-${query}`,
          title: 'Mahasamund, Chhattisgarh',
          subtitle: 'PIN: 493445 • Active Service Area',
          city: 'Mahasamund',
          district: 'Mahasamund',
          state: 'Chhattisgarh',
          pincode: '493445',
          isServiceable: true,
        },
      ]);
    } else {
      setSearchResults([
        {
          id: `unserv-${query}`,
          title: query,
          subtitle: "Aether Mart isn't available here yet. Serving Mahasamund only.",
          city: query,
          district: query,
          state: 'Chhattisgarh',
          pincode: query,
          isServiceable: false,
        },
      ]);
    }
    setIsSearchLoading(false);
  };

  const handleSelectSavedAddress = (addr: Address) => {
    const isServiceable = checkLocationServiceability({
      pincode: addr.postalCode,
      city: addr.city,
      district: addr.district,
      latitude: addr.latitude ?? addr.coordinates?.latitude ?? 21.1085,
      longitude: addr.longitude ?? addr.coordinates?.longitude ?? 82.0965,
    }).isServiceable;

    const newLoc: CustomerLocation = {
      id: addr.id,
      selectionType: 'SAVED',
      label: addr.label,
      savedLabel: addr.label,
      receiverName: addr.receiverName,
      receiverPhone: addr.receiverPhone,
      streetAddress: addr.streetAddress,
      apartmentSuite: addr.apartmentSuite,
      postalCode: addr.postalCode,
      city: addr.city,
      district: addr.district,
      state: addr.state,
      coordinates: addr.coordinates,
      isServiceable,
    };

    setSelectedAddress(newLoc);
    showToast({
      type: 'success',
      title: 'Location Set',
      description: `Delivering to ${addr.label}`,
    });
    onClose();
  };

  const isMahasamundSelected = selectedAddress?.city === 'Mahasamund' && selectedAddress?.isServiceable !== false;

  return (
    <div className="fixed inset-0 z-modal flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
      <div className="w-full max-w-md bg-bg-secondary rounded-2xl border border-border-primary shadow-high overflow-hidden flex flex-col max-h-[90vh] select-none">
        {/* Modal Header */}
        <div className="px-5 py-4 border-b border-border-primary flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MapPin className="h-5 w-5 text-brand-emerald" />
            <h2 className="text-base font-extrabold text-text-primary font-heading">Delivery Location</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-bg-tertiary text-text-secondary hover:text-text-primary transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Modal Content Body */}
        <div className="p-5 space-y-4 overflow-y-auto flex-1">

          {/* Primary Supported Service Area Card: MAHASAMUND ONLY */}
          <div className="p-4 rounded-2xl border border-brand-emerald/30 bg-brand-emerald/5 space-y-3">
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-2.5">
                <div className="p-2 rounded-xl bg-brand-emerald text-white shrink-0 shadow-subtle mt-0.5">
                  <MapPin className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-text-primary font-heading">
                    Mahasamund, Chhattisgarh
                  </h3>
                  <p className="text-[11px] text-text-secondary font-semibold mt-0.5">
                    Currently available in your area • PIN: 493445
                  </p>
                </div>
              </div>

              {isMahasamundSelected ? (
                <span className="text-[10px] font-extrabold px-2 py-1 rounded-lg bg-brand-emerald text-white shadow-subtle flex items-center gap-1">
                  <Check className="h-3.5 w-3.5" /> Selected
                </span>
              ) : (
                <button
                  onClick={handleSelectMahasamund}
                  className="px-3 py-1.5 rounded-xl bg-brand-emerald hover:bg-brand-emerald-hover text-white text-xs font-bold shadow-subtle cursor-pointer transition-all"
                >
                  Select
                </button>
              )}
            </div>
          </div>

          {/* Out of Service Area Alert View */}
          {outOfAreaState && (
            <div className="p-4 rounded-2xl border border-status-warning/30 bg-status-warning/5 space-y-3 text-center">
              <AlertCircle className="h-7 w-7 text-status-warning mx-auto" />
              <div className="space-y-1">
                <h4 className="text-xs font-extrabold text-text-primary">Aether Mart isn&apos;t available in your area yet.</h4>
                <p className="text-[11px] text-text-secondary font-semibold">
                  Currently serving <strong className="text-brand-emerald">Mahasamund, Chhattisgarh</strong>.
                </p>
              </div>

              <div className="flex gap-2 pt-1">
                <button
                  onClick={handleUseGps}
                  className="flex-1 py-2 px-3 bg-brand-emerald text-white rounded-xl text-xs font-bold shadow-subtle cursor-pointer"
                >
                  Try Again
                </button>
                <button
                  onClick={() => {
                    showToast({
                      type: 'success',
                      title: 'Notification Set',
                      description: 'We will notify you when Aether Mart expands to your locality! 🚀',
                    });
                  }}
                  className="flex-1 py-2 px-3 border border-brand-emerald/30 bg-bg-secondary text-brand-emerald rounded-xl text-xs font-bold cursor-pointer flex items-center justify-center gap-1"
                >
                  <Bell className="h-3.5 w-3.5" /> Notify Me
                </button>
              </div>
            </div>
          )}

          {/* Use Current GPS Location Button */}
          <button
            onClick={handleUseGps}
            disabled={isGpsLoading}
            className="w-full py-3.5 px-4 rounded-xl border border-border-primary bg-bg-secondary hover:bg-bg-tertiary text-text-primary font-bold text-xs transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 shadow-subtle"
          >
            {isGpsLoading ? (
              <Loader2 className="h-4 w-4 animate-spin text-brand-emerald" />
            ) : (
              <Navigation className="h-4 w-4 text-brand-emerald" />
            )}
            <span>Use Current GPS Location</span>
          </button>

          {/* Search Area / Pincode */}
          <form onSubmit={handleSearchSubmit} className="relative pt-1">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search area or 6-digit PIN code (e.g. 493445)"
              className="w-full pl-10 pr-20 py-3 rounded-xl border border-border-primary bg-bg-tertiary text-text-primary text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-brand-emerald/20 focus:border-brand-emerald"
            />
            <Search className="h-4 w-4 absolute left-3.5 top-6 text-text-secondary" />
            <button
              type="submit"
              disabled={isSearchLoading || !searchQuery.trim()}
              className="absolute right-2 top-4.5 px-3 py-1.5 rounded-lg bg-brand-emerald text-white font-bold text-[11px] hover:bg-brand-emerald-hover transition-colors cursor-pointer disabled:opacity-50"
            >
              {isSearchLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Search'}
            </button>
          </form>

          {/* Search Results */}
          {searchResults.length > 0 && (
            <div className="space-y-2">
              {searchResults.map((res) => (
                <button
                  key={res.id}
                  onClick={() => {
                    if (res.isServiceable) {
                      handleSelectMahasamund();
                    } else {
                      setOutOfAreaState('Outside service area');
                    }
                  }}
                  className="w-full p-3 rounded-xl border border-border-primary hover:border-brand-emerald text-left flex items-start justify-between transition-all cursor-pointer bg-bg-secondary"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-xs text-text-primary">{res.title}</span>
                      {res.isServiceable ? (
                        <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded bg-brand-emerald/10 text-brand-emerald">
                          Serviceable ✅
                        </span>
                      ) : (
                        <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded bg-status-warning/10 text-status-warning">
                          Coming Soon ⏳
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] text-text-secondary mt-0.5">{res.subtitle}</p>
                  </div>
                  <Check className="h-4 w-4 text-brand-emerald opacity-0 group-hover:opacity-100" />
                </button>
              ))}
            </div>
          )}

          {/* Saved Customer Addresses (if any exist) */}
          {savedAddresses.length > 0 && (
            <div className="space-y-2 pt-2">
              <span className="text-[10px] font-bold text-text-secondary uppercase tracking-wider">
                Saved Delivery Addresses
              </span>
              <div className="grid grid-cols-1 gap-2">
                {savedAddresses.map((addr) => {
                  const isSelected = selectedAddress?.id === addr.id;
                  return (
                    <button
                      key={addr.id}
                      onClick={() => handleSelectSavedAddress(addr)}
                      className={`p-3 rounded-xl border text-left flex items-center justify-between transition-all cursor-pointer ${
                        isSelected
                          ? 'border-brand-emerald bg-brand-emerald/5 text-text-primary'
                          : 'border-border-primary hover:border-text-secondary bg-bg-secondary'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <MapPin className="h-4 w-4 text-brand-emerald shrink-0" />
                        <div>
                          <p className="text-xs font-bold text-text-primary">{addr.label}</p>
                          <p className="text-[10px] text-text-secondary truncate">{addr.streetAddress}, {addr.city}</p>
                        </div>
                      </div>
                      {isSelected && <Check className="h-4 w-4 text-brand-emerald" />}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};

export default LocationPickerModal;

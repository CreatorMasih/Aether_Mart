import React, { useState } from 'react';
import { MapPin, Navigation, Search, X, Loader2, Check, Bell } from 'lucide-react';
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

  return (
    <div className="fixed inset-0 z-modal flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
      <div className="w-full max-w-sm bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden flex flex-col select-none">
        {/* Modal Header */}
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-base font-extrabold text-slate-900 font-heading">
            {outOfAreaState ? 'Service Not Available' : 'Change Location'}
          </h2>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Modal Content Body */}
        <div className="p-5 space-y-4">

          {outOfAreaState ? (
            /* Outside Service Area View (Matching Reference Target) */
            <div className="space-y-4 text-center py-2">
              <div className="w-14 h-14 rounded-full bg-red-50 text-red-500 flex items-center justify-center mx-auto shadow-xs">
                <MapPin className="h-7 w-7" />
              </div>

              <div className="space-y-1">
                <h3 className="text-sm font-extrabold text-slate-900">
                  Aether Mart isn&apos;t available in your area yet.
                </h3>
                <p className="text-xs text-slate-500 font-semibold">
                  Currently serving <strong className="text-emerald-600">Mahasamund, Chhattisgarh</strong>.
                </p>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  onClick={handleUseGps}
                  className="flex-1 py-2.5 px-3 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-800 font-bold text-xs cursor-pointer transition-all"
                >
                  Try Again
                </button>
                <button
                  onClick={() => {
                    showToast({
                      type: 'success',
                      title: 'Notification Set',
                      description: 'We will notify you when Aether Mart expands to your area! 🚀',
                    });
                    onClose();
                  }}
                  className="flex-1 py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md cursor-pointer transition-all flex items-center justify-center gap-1 border border-emerald-500"
                >
                  <Bell className="h-3.5 w-3.5" /> Notify Me
                </button>
              </div>
            </div>
          ) : (
            /* Normal Change Location View (Matching Reference Target) */
            <>
              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/60 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <MapPin className="h-5 w-5 text-slate-700 shrink-0" />
                  <div>
                    <h3 className="text-sm font-extrabold text-slate-900">Mahasamund</h3>
                    <p className="text-xs text-slate-500 font-semibold">Chhattisgarh</p>
                    <p className="text-[10px] text-emerald-600 font-extrabold mt-1">Currently available in your area</p>
                  </div>
                </div>
              </div>

              {/* Primary CTA: Use Current Location */}
              <button
                onClick={handleUseGps}
                disabled={isGpsLoading}
                className="w-full py-3.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 border border-emerald-500"
              >
                {isGpsLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin text-white" />
                ) : (
                  <Navigation className="h-4 w-4 text-white" />
                )}
                <span>Use Current Location</span>
              </button>

              {/* Optional Search / PIN code */}
              <form onSubmit={handleSearchSubmit} className="relative pt-1">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search area or 6-digit PIN code"
                  className="w-full pl-9 pr-16 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 focus:bg-white"
                />
                <Search className="h-3.5 w-3.5 absolute left-3 top-4.5 text-slate-400" />
                <button
                  type="submit"
                  disabled={isSearchLoading || !searchQuery.trim()}
                  className="absolute right-1.5 top-2.5 px-2.5 py-1 rounded-lg bg-slate-900 text-white font-bold text-[10px] hover:bg-slate-800 cursor-pointer disabled:opacity-50"
                >
                  {isSearchLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Search'}
                </button>
              </form>

              {searchResults.length > 0 && (
                <div className="space-y-1.5 pt-1">
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
                      className="w-full p-2.5 rounded-xl border border-slate-200 hover:border-emerald-500 text-left flex items-center justify-between transition-all cursor-pointer bg-white"
                    >
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-xs text-slate-900">{res.title}</span>
                          {res.isServiceable ? (
                            <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700">
                              Serviceable ✅
                            </span>
                          ) : (
                            <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded bg-amber-100 text-amber-700">
                              Coming Soon ⏳
                            </span>
                          )}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {/* Saved Customer Addresses */}
              {savedAddresses.length > 0 && (
                <div className="space-y-1.5 pt-2 border-t border-slate-100">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                    Saved Addresses
                  </span>
                  <div className="grid grid-cols-1 gap-1.5">
                    {savedAddresses.map((addr) => {
                      const isSelected = selectedAddress?.id === addr.id;
                      return (
                        <button
                          key={addr.id}
                          onClick={() => handleSelectSavedAddress(addr)}
                          className={`p-2.5 rounded-xl border text-left flex items-center justify-between transition-all cursor-pointer ${
                            isSelected
                              ? 'border-emerald-500 bg-emerald-50/50 text-slate-900'
                              : 'border-slate-200 hover:border-slate-300 bg-white'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <MapPin className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                            <div>
                              <p className="text-xs font-bold text-slate-900">{addr.label}</p>
                              <p className="text-[10px] text-slate-500 truncate">{addr.streetAddress}</p>
                            </div>
                          </div>
                          {isSelected && <Check className="h-4 w-4 text-emerald-600" />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </>
          )}

        </div>
      </div>
    </div>
  );
};

export default LocationPickerModal;

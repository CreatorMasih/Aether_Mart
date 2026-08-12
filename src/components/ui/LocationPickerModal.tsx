import React, { useState } from 'react';
import { MapPin, Navigation, Search, X, Loader2, Check, AlertCircle } from 'lucide-react';
import { useCustomerStore } from '../../features/customer-catalog/store/customer-store';
import { useAuthStore } from '../../features/auth/store/auth-store';
import { useToast } from '../../hooks/useToast';
import { apiClient } from '../../core/network/api-client';
import { checkLocationServiceability, DEFAULT_MAHASAMUND_ADDRESS } from '../../core/config/serviceability';
import type { Address } from '../../types';

interface LocationPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const LocationPickerModal: React.FC<LocationPickerModalProps> = ({ isOpen, onClose }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isGpsLoading, setIsGpsLoading] = useState(false);
  const [isSearchLoading, setIsSearchLoading] = useState(false);
  const [searchResults, setSearchResults] = useState<any[]>([]);

  const { selectedAddress, setSelectedAddress } = useCustomerStore();
  const { user } = useAuthStore();
  const { showToast } = useToast();

  if (!isOpen) return null;

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
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;

          const res = await apiClient.post('/location/reverse-geocode', { latitude: lat, longitude: lng });
          const locData = res.data.data;

          const newAddress: Address = {
            id: `addr-gps-${Date.now()}`,
            label: 'Current GPS',
            receiverName: user?.fullName || 'Customer',
            receiverPhone: user?.phone || '',
            streetAddress: locData.formattedAddress || 'GPS Location',
            postalCode: locData.pincode,
            city: locData.city,
            district: locData.district,
            state: locData.state,
            coordinates: { latitude: lat, longitude: lng },
            isServiceable: locData.isServiceable,
          };

          setSelectedAddress(newAddress);

          if (locData.isServiceable) {
            showToast({
              type: 'success',
              title: 'Location Updated',
              description: 'Delivering to Mahasamund.',
            });
          } else {
            showToast({
              type: 'info',
              title: 'Outside Service Area',
              description: `Aether Mart is currently active in Mahasamund only.`,
            });
          }
          onClose();
        } catch (err: any) {
          showToast({
            type: 'error',
            title: 'Location Check Failed',
            description: err.message || 'Unable to resolve your GPS position.',
          });
        } finally {
          setIsGpsLoading(false);
        }
      },
      (error) => {
        setIsGpsLoading(false);
        let msg = 'Location access was off or denied. Please search your PIN code manually.';
        if (error.code === error.PERMISSION_DENIED) {
          msg = 'Location permission denied. Please allow browser location or enter your PIN code.';
        }
        showToast({
          type: 'error',
          title: 'GPS Permission Error',
          description: msg,
        });
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  const handleSearchSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const query = searchQuery.trim();
    if (!query) return;

    setIsSearchLoading(true);
    setSearchResults([]);

    try {
      if (/^\d{6}$/.test(query)) {
        // Search by PINCODE
        const res = await apiClient.get(`/postal/pincode/${query}`);
        if (res.data?.success && res.data?.data) {
          const pData = res.data.data;
          const serviceCheck = checkLocationServiceability({
            pincode: pData.pincode,
            city: pData.city,
            district: pData.district,
          });

          setSearchResults([
            {
              id: `pin-${pData.pincode}`,
              title: `${pData.city} (${pData.pincode})`,
              subtitle: `${pData.district}, ${pData.state}`,
              city: pData.city,
              district: pData.district,
              state: pData.state,
              pincode: pData.pincode,
              isServiceable: serviceCheck.isServiceable,
            },
          ]);
        } else {
          showToast({
            type: 'error',
            title: 'Invalid PIN Code',
            description: 'Could not find details for this 6-digit PIN code.',
          });
        }
      } else {
        // Search by CITY / AREA
        const res = await apiClient.get(`/postal/city/${encodeURIComponent(query)}`);
        if (res.data?.success && res.data?.data) {
          const cData = res.data.data;
          const serviceCheck = checkLocationServiceability({
            city: cData.city,
            district: cData.district,
          });

          setSearchResults([
            {
              id: `city-${cData.city}`,
              title: `${cData.city}, ${cData.district}`,
              subtitle: `${cData.state} - PIN codes: ${cData.pincodes.slice(0, 3).join(', ')}`,
              city: cData.city,
              district: cData.district,
              state: cData.state,
              pincode: cData.pincodes[0] || '493445',
              isServiceable: serviceCheck.isServiceable,
            },
          ]);
        } else {
          // Local fallback matching
          const serviceCheck = checkLocationServiceability({ city: query });
          setSearchResults([
            {
              id: `query-${query}`,
              title: query,
              subtitle: serviceCheck.isServiceable ? 'Mahasamund District' : 'Outside Service Area',
              city: query,
              district: query,
              state: 'Chhattisgarh',
              pincode: serviceCheck.isServiceable ? '493445' : '000000',
              isServiceable: serviceCheck.isServiceable,
            },
          ]);
        }
      }
    } catch (err: any) {
      const serviceCheck = checkLocationServiceability({ city: query, pincode: query });
      setSearchResults([
        {
          id: `fallback-${query}`,
          title: query,
          subtitle: serviceCheck.isServiceable ? 'Mahasamund District' : 'Outside Service Area',
          city: query,
          district: query,
          state: 'Chhattisgarh',
          pincode: serviceCheck.isServiceable ? '493445' : '000000',
          isServiceable: serviceCheck.isServiceable,
        },
      ]);
    } finally {
      setIsSearchLoading(false);
    }
  };

  const handleSelectResult = (item: any) => {
    const isServiceable = item.isServiceable;
    const newAddress: Address = {
      id: `addr-search-${Date.now()}`,
      label: item.title,
      receiverName: user?.fullName || 'Customer',
      receiverPhone: user?.phone || '',
      streetAddress: `${item.title}, ${item.subtitle}`,
      postalCode: item.pincode,
      city: item.city,
      district: item.district,
      state: item.state,
      coordinates: isServiceable ? { latitude: 21.1085, longitude: 82.0965 } : undefined,
      isServiceable,
    };

    setSelectedAddress(newAddress);
    if (isServiceable) {
      showToast({
        type: 'success',
        title: 'Location Set',
        description: `Delivering to ${item.title}`,
      });
    } else {
      showToast({
        type: 'info',
        title: 'Coming Soon',
        description: `${item.city} is currently outside our service area. We're delivering in Mahasamund.`,
      });
    }
    onClose();
  };

  const presets = [
    {
      id: 'preset-mahasamund-center',
      name: 'Mahasamund Main Market',
      pincode: '493445',
      address: DEFAULT_MAHASAMUND_ADDRESS,
    },
    {
      id: 'preset-mahasamund-station',
      name: 'Station Road, Mahasamund',
      pincode: '493445',
      address: { ...DEFAULT_MAHASAMUND_ADDRESS, streetAddress: 'Station Road, Mahasamund' },
    },
    {
      id: 'preset-pithora',
      name: 'Pithora, Mahasamund',
      pincode: '493551',
      address: { ...DEFAULT_MAHASAMUND_ADDRESS, streetAddress: 'Main Road, Pithora', postalCode: '493551' },
    },
    {
      id: 'preset-saraipali',
      name: 'Saraipali, Mahasamund',
      pincode: '493558',
      address: { ...DEFAULT_MAHASAMUND_ADDRESS, streetAddress: 'Town Area, Saraipali', postalCode: '493558' },
    },
  ];

  return (
    <div className="fixed inset-0 z-modal flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
      <div className="w-full max-w-md bg-bg-secondary rounded-2xl border border-border-primary shadow-high overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="px-5 py-4 border-b border-border-primary flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MapPin className="h-5 w-5 text-brand-emerald" />
            <h2 className="text-base font-extrabold text-text-primary">Where should we deliver?</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-bg-tertiary text-text-secondary hover:text-text-primary transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Modal Content Body */}
        <div className="p-5 space-y-5 overflow-y-auto flex-1">
          {/* GPS Location Button */}
          <button
            onClick={handleUseGps}
            disabled={isGpsLoading}
            className="w-full py-3.5 px-4 rounded-xl border border-brand-emerald/30 bg-brand-emerald/5 hover:bg-brand-emerald/10 text-brand-emerald font-bold text-xs transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 shadow-subtle"
          >
            {isGpsLoading ? (
              <Loader2 className="h-4 w-4 animate-spin text-brand-emerald" />
            ) : (
              <Navigation className="h-4 w-4 text-brand-emerald" />
            )}
            <span>Use Current GPS Location</span>
          </button>

          <div className="relative flex items-center justify-center">
            <div className="w-full border-t border-border-primary/60" />
            <span className="absolute bg-bg-secondary px-3 text-[10px] font-extrabold text-text-secondary uppercase tracking-wider">
              Or search location
            </span>
          </div>

          {/* Search Form */}
          <form onSubmit={handleSearchSubmit} className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search area, city or 6-digit PIN code (e.g. 493445)"
              className="w-full pl-10 pr-20 py-3 rounded-xl border border-border-primary bg-bg-tertiary text-text-primary text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-brand-emerald/20 focus:border-brand-emerald"
            />
            <Search className="h-4 w-4 absolute left-3.5 top-3.5 text-text-secondary" />
            <button
              type="submit"
              disabled={isSearchLoading || !searchQuery.trim()}
              className="absolute right-2 top-2 px-3 py-1.5 rounded-lg bg-brand-emerald text-white font-bold text-[11px] hover:bg-brand-emerald-hover transition-colors cursor-pointer disabled:opacity-50"
            >
              {isSearchLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Search'}
            </button>
          </form>

          {/* Search Results */}
          {searchResults.length > 0 && (
            <div className="space-y-2">
              <p className="text-[10px] font-bold text-text-secondary uppercase tracking-wider">Search Results</p>
              {searchResults.map((res) => (
                <button
                  key={res.id}
                  onClick={() => handleSelectResult(res)}
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

          {/* Mahasamund Serviceable Presets */}
          <div className="space-y-2 pt-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-text-secondary uppercase tracking-wider">
                Mahasamund Locations (Active Service Area)
              </span>
              <span className="text-[9px] font-bold text-brand-emerald bg-brand-emerald/10 px-2 py-0.5 rounded">
                100% Serviceable
              </span>
            </div>

            <div className="grid grid-cols-1 gap-2">
              {presets.map((preset) => {
                const isSelected = selectedAddress?.postalCode === preset.pincode && selectedAddress?.streetAddress === preset.address.streetAddress;
                return (
                  <button
                    key={preset.id}
                    onClick={() => {
                      setSelectedAddress(preset.address);
                      showToast({
                        type: 'success',
                        title: 'Location Set',
                        description: `Delivering to ${preset.name}`,
                      });
                      onClose();
                    }}
                    className={`p-3 rounded-xl border text-left flex items-center justify-between transition-all cursor-pointer ${
                      isSelected
                        ? 'border-brand-emerald bg-brand-emerald/5 text-text-primary'
                        : 'border-border-primary hover:border-text-secondary bg-bg-secondary'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <MapPin className="h-4 w-4 text-brand-emerald shrink-0" />
                      <div>
                        <p className="text-xs font-bold text-text-primary">{preset.name}</p>
                        <p className="text-[10px] text-text-secondary">PIN: {preset.pincode} • Mahasamund</p>
                      </div>
                    </div>
                    {isSelected && <Check className="h-4 w-4 text-brand-emerald" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Upcoming Cities Info Banner */}
          <div className="p-3 rounded-xl bg-bg-tertiary border border-border-primary flex items-start gap-2.5">
            <AlertCircle className="h-4 w-4 text-text-secondary shrink-0 mt-0.5" />
            <p className="text-[11px] text-text-secondary leading-relaxed">
              Aether Mart is currently live only in <strong className="text-text-primary">Mahasamund</strong>. Raipur, Bhilai & Durg will be activated in upcoming expansions.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LocationPickerModal;

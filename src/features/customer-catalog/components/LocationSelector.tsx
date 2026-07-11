import React, { useState, useMemo } from 'react';
import { MapPin, Navigation, ChevronDown, Check, Loader2 } from 'lucide-react';
import { useAuthStore } from '../../auth/store/auth-store';
import { useCustomerStore } from '../store/customer-store';
import { useGeolocation } from '../../../hooks/useGeolocation';
import { useToast } from '../../../hooks/useToast';
import { cn } from '../../../utils/cn';
import type { Address } from '../../../types';

export const LocationSelector: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { user } = useAuthStore();
  const { selectedAddress, setSelectedAddress } = useCustomerStore();
  const { showToast } = useToast();

  const savedAddresses = user?.savedAddresses || [];

  // Expose geolocation hook triggers on-demand (by using options, we load coordinates if needed)
  const geolocationOptions = useMemo(() => ({ enableHighAccuracy: true }), []);
  const { coordinates, loading, error, refetch } = useGeolocation(geolocationOptions);


  const handleUseCurrentLocation = async () => {
    refetch();
    if (error) {
      showToast({
        type: 'error',
        title: 'Location Error',
        description: error || 'Failed to determine your current location.',
      });
      return;
    }

    if (coordinates) {
      // Simulate reverse geocoding to build an Address object
      const currentAddress: Address = {
        id: 'addr-current-gps',
        label: 'Other',
        receiverName: user?.fullName || 'Customer',
        receiverPhone: user?.phone || '',
        streetAddress: 'GPS Location, Near Bangalore Central',
        postalCode: '560001',
        city: 'Bengaluru',
        coordinates,
      };

      setSelectedAddress(currentAddress);
      showToast({
        type: 'success',
        title: 'Location Updated',
        description: 'Position updated via browser GPS.',
      });
      setIsOpen(false);
    }
  };

  const handleSelectAddress = (address: Address) => {
    setSelectedAddress(address);
    setIsOpen(false);
  };

  // Fallback to first saved address if none is selected
  const activeAddress = selectedAddress || savedAddresses[0] || null;

  return (
    <div className="relative">
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen((prev) => !prev)}
        className="flex items-center gap-1.5 text-left select-none cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-emerald focus-visible:ring-offset-2 rounded-md p-1"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-label="Delivery location selector"
      >
        <MapPin className="h-5 w-5 text-brand-emerald flex-shrink-0" />
        <div className="min-w-0">
          <div className="flex items-center gap-1">
            <span className="text-xs font-extrabold text-text-primary uppercase tracking-wider">
              {activeAddress ? activeAddress.label : 'Select Location'}
            </span>
            <ChevronDown className="h-3 w-3 text-text-secondary" />
          </div>
          <p className="text-[10px] text-text-secondary truncate max-w-[140px] sm:max-w-[200px]">
            {activeAddress ? activeAddress.streetAddress : 'Configure delivery address'}
          </p>
        </div>
      </button>

      {/* Dropdown Panel overlay */}
      {isOpen && (
        <>
          {/* Transparent click backdrop */}
          <div className="fixed inset-0 z-overlay" onClick={() => setIsOpen(false)} />
          
          <div className="absolute top-full left-0 mt-2 w-72 rounded-xl border border-border-primary bg-bg-secondary shadow-high p-4 z-drawer pointer-events-auto">
            <h3 className="text-xs font-bold text-text-primary uppercase tracking-wider mb-3">Delivery Address</h3>
            
            <div className="space-y-1.5 mb-4">
              <button
                onClick={handleUseCurrentLocation}
                disabled={loading}
                className="w-full p-3 rounded-lg border border-border-primary hover:border-brand-emerald hover:bg-brand-emerald/5 flex items-center justify-center gap-2 text-xs font-bold text-brand-emerald transition-colors cursor-pointer disabled:opacity-50"
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Navigation className="h-4 w-4" />
                )}
                Use Current GPS Location
              </button>
            </div>

            {savedAddresses.length > 0 ? (
              <div className="space-y-1.5 max-h-48 overflow-y-auto">
                <p className="text-[10px] font-bold text-text-secondary uppercase tracking-wider mb-1 px-1">Saved Addresses</p>
                {savedAddresses.map((addr) => {
                  const isSelected = activeAddress?.id === addr.id;
                  return (
                    <button
                      key={addr.id}
                      onClick={() => handleSelectAddress(addr)}
                      className={cn(
                        "w-full text-left p-3 rounded-lg border flex items-start gap-2.5 transition-all cursor-pointer text-xs font-semibold",
                        isSelected 
                          ? "border-brand-emerald bg-brand-emerald/5 text-text-primary" 
                          : "border-border-primary hover:border-text-secondary bg-bg-secondary"
                      )}
                    >
                      <MapPin className="h-4 w-4 mt-0.5 text-text-secondary flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-text-primary">{addr.label}</span>
                          {isSelected && <Check className="h-3.5 w-3.5 text-brand-emerald" />}
                        </div>
                        <p className="text-[10px] text-text-secondary truncate mt-0.5">{addr.streetAddress}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-4 border border-dashed border-border-primary rounded-lg">
                <p className="text-xs text-text-secondary">No saved addresses found.</p>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default LocationSelector;

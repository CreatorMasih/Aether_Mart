import React, { useState } from 'react';
import { MapPin, ChevronDown, Check, Navigation, Loader2, Bell, AlertCircle } from 'lucide-react';
import { useCustomerStore } from '../store/customer-store';
import { useAuthStore } from '../../auth/store/auth-store';
import { useToast } from '../../../hooks/useToast';
import { checkLocationServiceability, DEFAULT_MAHASAMUND_LOCATION } from '../../../core/config/serviceability';
import type { CustomerLocation } from '../../../types';
import { cn } from '../../../utils/cn';

export const LocationSelector: React.FC = () => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isGpsLoading, setIsGpsLoading] = useState(false);
  const [outOfAreaState, setOutOfAreaState] = useState<boolean>(false);

  const { selectedAddress, setSelectedAddress } = useCustomerStore();
  const { user } = useAuthStore();
  const { showToast } = useToast();

  const activeAddress = selectedAddress || DEFAULT_MAHASAMUND_LOCATION;
  const isServiceable = activeAddress.isServiceable !== false;

  const handleSelectMahasamund = () => {
    setSelectedAddress(DEFAULT_MAHASAMUND_LOCATION);
    showToast({
      type: 'success',
      title: 'Location Set',
      description: 'Delivering to Mahasamund, Chhattisgarh.',
    });
    setOutOfAreaState(false);
    setIsDropdownOpen(false);
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
    setOutOfAreaState(false);

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
          setIsDropdownOpen(false);
        } else {
          setIsGpsLoading(false);
          setOutOfAreaState(true);
        }
      },
      (error) => {
        setIsGpsLoading(false);
        let msg = 'Location permission denied. Delivering to Mahasamund.';
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

  return (
    <div className="relative inline-block select-none">
      {/* Location Header Pill Button */}
      <button
        onClick={() => setIsDropdownOpen((prev) => !prev)}
        className="flex items-center gap-1.5 text-left cursor-pointer focus:outline-none rounded-xl px-2.5 py-1.5 border border-slate-200 bg-white hover:bg-slate-50 transition-all shadow-xs group"
        aria-label="Select Delivery Location"
      >
        <div className="p-1 rounded-lg bg-emerald-50 text-emerald-600 group-hover:bg-emerald-100 transition-colors">
          <MapPin className="h-4 w-4 shrink-0" />
        </div>
        <div className="min-w-0">
          <p className="text-[9px] font-bold text-slate-500 leading-none">Delivering to</p>
          <div className="flex items-center gap-1 mt-0.5">
            <span className="text-xs font-extrabold text-slate-900 font-heading truncate max-w-[110px] sm:max-w-[150px]">
              {activeAddress.city || 'Mahasamund'}
            </span>
            {isServiceable ? (
              <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700 shrink-0">
                ACTIVE
              </span>
            ) : (
              <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 shrink-0">
                UNSERVICEABLE
              </span>
            )}
            <ChevronDown className={cn("h-3 w-3 text-slate-400 group-hover:text-slate-700 transition-transform duration-200 shrink-0", isDropdownOpen && "rotate-180")} />
          </div>
        </div>
      </button>

      {/* Anchored Dropdown Box (Positioned directly below location pill) */}
      {isDropdownOpen && (
        <>
          {/* Backdrop */}
          <div className="fixed inset-0 z-40" onClick={() => setIsDropdownOpen(false)} />

          <div className="absolute left-0 top-full mt-2 w-80 sm:w-84 bg-white rounded-2xl border border-slate-200 shadow-xl p-4 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
            <div className="flex items-center justify-between mb-3 border-b border-slate-100 pb-2">
              <p className="text-xs font-extrabold text-slate-900 font-heading">Your Delivery Location</p>
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Mahasamund Only</span>
            </div>

            {outOfAreaState ? (
              /* Out of Service Alert View */
              <div className="p-3.5 rounded-xl border border-amber-200 bg-amber-50/70 text-center space-y-3">
                <AlertCircle className="h-6 w-6 text-amber-600 mx-auto" />
                <div className="space-y-1">
                  <h4 className="text-xs font-extrabold text-slate-900">Aether Mart isn&apos;t available in your area yet.</h4>
                  <p className="text-[10px] text-slate-600 font-semibold">
                    Currently delivering in <strong className="text-emerald-700">Mahasamund, Chhattisgarh</strong>.
                  </p>
                </div>

                <div className="flex gap-2 pt-1">
                  <button
                    onClick={handleUseGps}
                    className="flex-1 py-2 px-2.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-800 text-xs font-bold shadow-xs cursor-pointer"
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
                      setIsDropdownOpen(false);
                    }}
                    className="flex-1 py-2 px-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs cursor-pointer flex items-center justify-center gap-1"
                  >
                    <Bell className="h-3.5 w-3.5" /> Notify Me
                  </button>
                </div>
              </div>
            ) : (
              /* Normal Location State */
              <div className="space-y-3">
                {/* Active Service Card */}
                <div className="p-3 rounded-xl border border-emerald-200 bg-emerald-50/80 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <MapPin className="h-4 w-4 text-emerald-600 shrink-0" />
                    <div>
                      <p className="text-xs font-extrabold text-slate-900">Mahasamund</p>
                      <p className="text-[10px] text-slate-500 font-semibold">Chhattisgarh</p>
                    </div>
                  </div>
                  <span className="text-[9px] font-extrabold px-2 py-0.5 rounded bg-emerald-600 text-white flex items-center gap-1 shadow-xs">
                    ACTIVE <Check className="h-3 w-3" />
                  </span>
                </div>

                <p className="text-[10px] text-slate-500 leading-relaxed font-semibold px-1">
                  Currently delivering in Mahasamund, Chhattisgarh.
                </p>

                {/* Primary CTA: Use Current Location */}
                <button
                  onClick={handleUseGps}
                  disabled={isGpsLoading}
                  className="w-full py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 border border-emerald-500"
                >
                  {isGpsLoading ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin text-white" />
                  ) : (
                    <Navigation className="h-3.5 w-3.5 text-white" />
                  )}
                  <span>Use Current Location</span>
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default LocationSelector;

import React, { useState } from 'react';
import { MapPin, ChevronDown, Check, ChevronRight } from 'lucide-react';
import { useCustomerStore } from '../store/customer-store';
import { LocationPickerModal } from '../../../components/ui/LocationPickerModal';
import { DEFAULT_MAHASAMUND_ADDRESS } from '../../../core/config/serviceability';
import { cn } from '../../../utils/cn';

export const LocationSelector: React.FC = () => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isChangeModalOpen, setIsChangeModalOpen] = useState(false);

  const { selectedAddress } = useCustomerStore();

  const activeAddress = selectedAddress || DEFAULT_MAHASAMUND_ADDRESS;
  const isServiceable = activeAddress.isServiceable !== false;

  return (
    <div className="relative select-none">
      {/* Location Header Pill Button */}
      <button
        onClick={() => setIsDropdownOpen((prev) => !prev)}
        className="flex items-center gap-1.5 text-left cursor-pointer focus:outline-none rounded-xl p-1.5 border border-slate-200 bg-white hover:bg-slate-50 transition-all shadow-xs group"
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

      {/* Anchored Location Dropdown Box (Matching Reference Design) */}
      {isDropdownOpen && (
        <>
          {/* Backscreen backdrop to close dropdown on outside click */}
          <div className="fixed inset-0 z-40" onClick={() => setIsDropdownOpen(false)} />

          <div className="absolute left-0 top-full mt-2 w-76 sm:w-80 bg-white rounded-2xl border border-slate-200 shadow-xl p-4 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
            <p className="text-xs font-bold text-slate-500 mb-3">Your Delivery Location</p>

            {/* Active Service Area Card */}
            <div className="p-3 rounded-xl border border-emerald-200 bg-emerald-50/70 flex items-center justify-between mb-4">
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

            {/* Change Location Option */}
            <div className="pt-3 border-t border-slate-100 space-y-1.5">
              <p className="text-xs font-bold text-slate-900">Want to change location?</p>
              <p className="text-[10px] text-slate-500 leading-relaxed font-semibold">
                Currently delivering only in Mahasamund, Chhattisgarh.
              </p>

              <button
                onClick={() => {
                  setIsDropdownOpen(false);
                  setIsChangeModalOpen(true);
                }}
                className="w-full mt-2 py-2.5 px-3 rounded-xl border border-slate-200 hover:border-emerald-500 bg-slate-50 hover:bg-emerald-50 text-slate-800 hover:text-emerald-700 font-bold text-xs flex items-center justify-between transition-all cursor-pointer group"
              >
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-emerald-600" />
                  <span>Change Location</span>
                </div>
                <ChevronRight className="h-4 w-4 text-slate-400 group-hover:text-emerald-600 group-hover:translate-x-0.5 transition-all" />
              </button>
            </div>
          </div>
        </>
      )}

      {/* Change Location Modal */}
      <LocationPickerModal
        isOpen={isChangeModalOpen}
        onClose={() => setIsChangeModalOpen(false)}
      />
    </div>
  );
};

export default LocationSelector;

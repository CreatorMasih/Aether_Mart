import React, { useState } from 'react';
import { MapPin, ChevronDown } from 'lucide-react';
import { useCustomerStore } from '../store/customer-store';
import { LocationPickerModal } from '../../../components/ui/LocationPickerModal';
import { DEFAULT_MAHASAMUND_ADDRESS } from '../../../core/config/serviceability';

export const LocationSelector: React.FC = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { selectedAddress } = useCustomerStore();

  const activeAddress = selectedAddress || DEFAULT_MAHASAMUND_ADDRESS;
  const isServiceable = activeAddress.isServiceable !== false;

  return (
    <>
      <button
        onClick={() => setIsModalOpen(true)}
        className="flex items-center gap-1.5 text-left select-none cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-emerald focus-visible:ring-offset-2 rounded-md p-1 group"
        aria-label="Select Delivery Location"
      >
        <div className="p-1.5 rounded-lg bg-brand-emerald/10 text-brand-emerald group-hover:bg-brand-emerald/20 transition-colors">
          <MapPin className="h-4 w-4 shrink-0" />
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-1">
            <span className="text-xs font-extrabold text-text-primary uppercase tracking-wider truncate max-w-[120px] sm:max-w-[160px]">
              {activeAddress.city || 'Mahasamund'}
            </span>
            {isServiceable ? (
              <span className="text-[9px] font-extrabold px-1 rounded bg-brand-emerald/10 text-brand-emerald">
                Mahasamund
              </span>
            ) : (
              <span className="text-[9px] font-extrabold px-1 rounded bg-status-warning/10 text-status-warning">
                Soon
              </span>
            )}
            <ChevronDown className="h-3 w-3 text-text-secondary group-hover:text-text-primary transition-colors" />
          </div>
          <p className="text-[10px] text-text-secondary truncate max-w-[140px] sm:max-w-[200px]">
            {activeAddress.streetAddress || 'Station Road, Mahasamund'}
          </p>
        </div>
      </button>

      <LocationPickerModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </>
  );
};

export default LocationSelector;

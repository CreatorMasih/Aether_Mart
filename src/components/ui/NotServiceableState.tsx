import React from 'react';
import { MapPin, Navigation, ArrowRight } from 'lucide-react';
import { DEFAULT_MAHASAMUND_LOCATION } from '../../core/config/serviceability';
import { useCustomerStore } from '../../features/customer-catalog/store/customer-store';

interface NotServiceableStateProps {
  currentLocationName?: string;
  onChangeLocationClick: () => void;
}

export const NotServiceableState: React.FC<NotServiceableStateProps> = ({
  currentLocationName = 'your selected area',
  onChangeLocationClick,
}) => {
  const { setSelectedAddress } = useCustomerStore();

  const handleSwitchToMahasamund = () => {
    setSelectedAddress(DEFAULT_MAHASAMUND_LOCATION);
  };

  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center p-6 text-center max-w-md mx-auto space-y-6">
      <div className="relative">
        <div className="w-20 h-20 rounded-full bg-brand-emerald/10 flex items-center justify-center text-brand-emerald mx-auto">
          <MapPin className="h-10 w-10 animate-bounce" />
        </div>
        <span className="absolute -bottom-1 right-1 px-2 py-0.5 rounded-full bg-status-warning text-white text-[10px] font-extrabold uppercase tracking-wider shadow-subtle">
          Coming Soon
        </span>
      </div>

      <div className="space-y-2">
        <h2 className="text-xl font-extrabold text-text-primary tracking-tight font-heading">
          Aether Mart isn&apos;t available in your area yet.
        </h2>
        <p className="text-xs text-text-secondary leading-relaxed">
          We&apos;re currently operating exclusively in <span className="font-bold text-brand-emerald">Mahasamund, Chhattisgarh</span>. We&apos;ll be coming to <span className="font-bold text-text-primary">{currentLocationName}</span> soon!
        </p>
      </div>

      <div className="w-full space-y-3 pt-2">
        <button
          onClick={onChangeLocationClick}
          className="w-full py-3.5 px-4 rounded-xl bg-brand-emerald text-white hover:bg-brand-emerald-hover font-bold text-sm transition-all shadow-subtle flex items-center justify-center gap-2 cursor-pointer"
        >
          <Navigation className="h-4 w-4" />
          <span>Change Location</span>
        </button>

        <button
          onClick={handleSwitchToMahasamund}
          className="w-full py-3 px-4 rounded-xl border border-border-primary bg-bg-secondary text-text-primary hover:bg-bg-tertiary font-semibold text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer"
        >
          <span>Deliver to Mahasamund (493445)</span>
          <ArrowRight className="h-3.5 w-3.5 text-text-secondary" />
        </button>

        <button
          onClick={() => {
            alert('We will notify you as soon as Aether Mart launches in your locality! 🚀');
          }}
          className="w-full py-2.5 px-4 rounded-xl border border-brand-emerald/30 bg-brand-emerald/5 text-brand-emerald font-bold text-xs transition-all cursor-pointer"
        >
          🔔 Notify Me When Available
        </button>
      </div>

      <div className="p-3 rounded-xl bg-bg-tertiary border border-border-primary text-left text-[11px] text-text-secondary space-y-1 w-full">
        <p className="font-bold text-text-primary uppercase tracking-wider">Available Locations</p>
        <div className="flex flex-wrap gap-1.5 pt-1">
          <span className="px-2 py-0.5 rounded bg-brand-emerald/10 text-brand-emerald font-bold">Mahasamund ✅</span>
          <span className="px-2 py-0.5 rounded bg-bg-secondary text-text-secondary">Raipur (Soon)</span>
          <span className="px-2 py-0.5 rounded bg-bg-secondary text-text-secondary">Bhilai (Soon)</span>
          <span className="px-2 py-0.5 rounded bg-bg-secondary text-text-secondary">Durg (Soon)</span>
        </div>
      </div>
    </div>
  );
};

export default NotServiceableState;

import React from 'react';
import { cn } from '../../../utils/cn';

export interface CountryCode {
  code: string;
  label: string;
  flag: string;
}

export const COUNTRIES: CountryCode[] = [
  { code: '+91', label: 'IN', flag: '🇮🇳' },
  { code: '+1', label: 'US', flag: '🇺🇸' },
  { code: '+44', label: 'UK', flag: '🇬🇧' },
  { code: '+971', label: 'AE', flag: '🇦🇪' },
  { code: '+65', label: 'SG', flag: '🇸🇬' },
];

interface CountryCodeSelectorProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

export const CountryCodeSelector: React.FC<CountryCodeSelectorProps> = ({
  value,
  onChange,
  disabled = false,
}) => {
  const activeCountry = COUNTRIES.find((c) => c.code === value) || COUNTRIES[0];

  return (
    <div className="relative inline-flex items-center">
      <select
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        className={cn(
          "absolute inset-0 opacity-0 w-full h-full cursor-pointer z-10",
          disabled && "cursor-not-allowed"
        )}
        aria-label="Select Country Dialing Code"
      >
        {COUNTRIES.map((c) => (
          <option key={c.code} value={c.code}>
            {c.flag} {c.label} ({c.code})
          </option>
        ))}
      </select>
      <div 
        className={cn(
          "flex items-center gap-1 px-3 py-3 border-y border-l border-border-primary bg-bg-tertiary text-text-primary rounded-l-xl text-sm font-semibold select-none",
          disabled && "opacity-60 bg-bg-tertiary"
        )}
        aria-hidden="true"
      >
        <span>{activeCountry.flag}</span>
        <span>{activeCountry.code}</span>
        <span className="text-[10px] text-text-secondary">▼</span>
      </div>
    </div>
  );
};

export default CountryCodeSelector;

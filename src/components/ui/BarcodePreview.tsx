import React from 'react';

interface BarcodePreviewProps {
  sku: string;
  className?: string;
}

export const BarcodePreview: React.FC<BarcodePreviewProps> = ({ sku, className = '' }) => {
  if (!sku) return null;

  // Simple deterministic barcode bar pattern generator from SKU chars
  const generateBars = (str: string) => {
    const bars: boolean[] = [true, false, true]; // Guard start
    for (let i = 0; i < str.length; i++) {
      const charCode = str.charCodeAt(i);
      const binary = charCode.toString(2).padStart(8, '0');
      for (let b = 0; b < binary.length; b++) {
        bars.push(binary[b] === '1');
        bars.push(false);
      }
    }
    bars.push(true, false, true); // Guard end
    return bars;
  };

  const bars = generateBars(sku.toUpperCase());

  return (
    <div className={`flex flex-col items-center bg-white p-3 rounded-xl border border-border shadow-xs ${className}`}>
      <svg className="w-full h-12" viewBox={`0 0 ${bars.length * 3} 50`} preserveAspectRatio="none">
        {bars.map((isBar, idx) =>
          isBar ? (
            <rect key={idx} x={idx * 3} y="0" width="2.5" height="50" fill="#111827" />
          ) : null
        )}
      </svg>
      <span className="text-[11px] font-mono font-bold tracking-widest text-gray-800 mt-1.5 uppercase">
        {sku}
      </span>
    </div>
  );
};

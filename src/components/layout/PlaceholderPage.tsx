import React from 'react';

interface PlaceholderPageProps {
  title: string;
  role: string;
  description: string;
}

export const PlaceholderPage: React.FC<PlaceholderPageProps> = ({
  title,
  role,
  description,
}) => {
  return (
    <div className="p-6 rounded-xl border border-border-primary bg-bg-secondary shadow-low">
      <div className="flex items-center gap-3 mb-4">
        <h1 className="text-xl font-bold text-text-primary">{title}</h1>
        <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold uppercase tracking-wider bg-brand-emerald/10 text-brand-emerald">
          {role}
        </span>
      </div>
      <p className="text-sm text-text-secondary leading-relaxed mb-4">
        {description}
      </p>
      <div className="p-3 rounded-lg bg-bg-tertiary border border-border-primary font-mono text-xs text-text-secondary">
        System Status: READY | Target Path: {window.location.pathname}
      </div>
    </div>
  );
};

export default PlaceholderPage;

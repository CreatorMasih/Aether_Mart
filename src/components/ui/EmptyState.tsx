import React from 'react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '../../utils/cn';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  onActionClick?: () => void;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon: Icon,
  title,
  description,
  actionLabel,
  onActionClick,
  className,
}) => {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center p-8 text-center max-w-sm mx-auto min-h-[300px]',
        className
      )}
    >
      <div className="p-4 rounded-full bg-bg-tertiary text-text-secondary mb-4 border border-border-primary">
        <Icon className="h-8 w-8" aria-hidden="true" />
      </div>
      
      <h3 className="text-lg font-semibold text-text-primary mb-1">
        {title}
      </h3>
      
      <p className="text-sm text-text-secondary mb-6 leading-relaxed">
        {description}
      </p>

      {actionLabel && onActionClick && (
        <button
          onClick={onActionClick}
          className="py-2.5 px-5 rounded-lg bg-brand-emerald text-white hover:bg-brand-emerald-hover font-medium text-sm transition-all focus:ring-2 focus:ring-brand-emerald focus:ring-offset-2 cursor-pointer"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
};

export default EmptyState;

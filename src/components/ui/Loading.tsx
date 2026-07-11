import React from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '../../utils/cn';

interface LoadingProps {
  message?: string;
  fullScreen?: boolean;
  className?: string;
}

export const Loading: React.FC<LoadingProps> = ({
  message = 'Loading your experience...',
  fullScreen = false,
  className,
}) => {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center p-6 text-center',
        fullScreen && 'min-h-screen w-screen fixed inset-0 z-toast bg-bg-primary/80 backdrop-blur-md',
        !fullScreen && 'min-h-[200px] w-full',
        className
      )}
    >
      <div className="relative flex items-center justify-center">
        <Loader2 className="h-8 w-8 text-brand-emerald animate-spin" />
        <div className="absolute h-10 w-10 border-2 border-brand-emerald/20 rounded-full" />
      </div>
      {message && (
        <p className="text-sm font-medium text-text-secondary mt-4 animate-pulse">
          {message}
        </p>
      )}
    </div>
  );
};

export default Loading;

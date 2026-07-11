import React, { useState, useCallback } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react';
import { ToastContext } from './ToastContext';
import type { ToastMessage } from './ToastContext';
import { cn } from '../utils/cn';

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback((toast: Omit<ToastMessage, 'id'>) => {
    const id = Math.random().toString(36).substring(2, 9);
    const newToast = { ...toast, id };
    
    setToasts((prev) => [...prev, newToast]);

    const duration = toast.duration ?? 4000;
    setTimeout(() => {
      dismissToast(id);
    }, duration);
  }, [dismissToast]);

  const getIcon = (type: string) => {
    switch (type) {
      case 'success':
        return <CheckCircle className="h-5 w-5 text-status-success" />;
      case 'error':
        return <AlertCircle className="h-5 w-5 text-status-error" />;
      case 'warning':
        return <AlertTriangle className="h-5 w-5 text-status-warning" />;
      case 'info':
      default:
        return <Info className="h-5 w-5 text-status-info" />;
    }
  };

  return (
    <ToastContext.Provider value={{ showToast, dismissToast }}>
      {children}
      
      {/* Toast Portal Container */}
      <div 
        className="fixed top-4 right-4 z-toast flex flex-col gap-3 w-full max-w-sm pointer-events-none"
        role="live"
        aria-live="assertive"
      >
        <AnimatePresence>
          {toasts.map((toast) => (
            <motion.div
              key={toast.id}
              layout
              initial={{ opacity: 0, y: -20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.15 } }}
              transition={{ type: 'spring', stiffness: 350, damping: 25 }}
              className={cn(
                "pointer-events-auto flex items-start gap-3 p-4 rounded-xl border bg-bg-secondary shadow-high overflow-hidden"
              )}
            >
              <div className="flex-shrink-0 mt-0.5">{getIcon(toast.type)}</div>
              
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-text-primary leading-tight">
                  {toast.title}
                </p>
                {toast.description && (
                  <p className="text-xs text-text-secondary mt-1 leading-normal">
                    {toast.description}
                  </p>
                )}
              </div>

              <button
                onClick={() => dismissToast(toast.id)}
                className="flex-shrink-0 p-0.5 text-text-secondary hover:text-text-primary rounded-md transition-colors cursor-pointer"
                aria-label="Dismiss notification"
              >
                <X className="h-4 w-4" />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
};

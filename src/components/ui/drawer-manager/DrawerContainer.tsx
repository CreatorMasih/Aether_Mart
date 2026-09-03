import React, { useEffect, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { X } from 'lucide-react';
import { useDrawerStore } from './drawer-store';
import { useMediaQuery } from '../../../hooks/useMediaQuery';
import { drawerSlide } from '../../../core/theme/animations';
import { cn } from '../../../utils/cn';

import CartDrawerContent from '../../../features/customer-checkout/components/CartDrawerContent';

export const DrawerContainer: React.FC = () => {
  const { activeDrawer, drawerProps, closeDrawer } = useDrawerStore();
  const isDesktop = useMediaQuery('(min-width: 768px)');
  const overlayRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close drawer on Escape press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && activeDrawer) {
        closeDrawer();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeDrawer, closeDrawer]);

  // Focus trap inside drawer
  useEffect(() => {
    if (!activeDrawer || !containerRef.current) return;

    const focusable = containerRef.current.querySelectorAll(
      'a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'
    );
    
    if (focusable.length === 0) return;
    const first = focusable[0] as HTMLElement;
    const last = focusable[focusable.length - 1] as HTMLElement;
    first.focus();

    const trap = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;
      if (e.shiftKey) {
        if (document.activeElement === first) {
          last.focus();
          e.preventDefault();
        }
      } else {
        if (document.activeElement === last) {
          first.focus();
          e.preventDefault();
        }
      }
    };

    window.addEventListener('keydown', trap);
    return () => window.removeEventListener('keydown', trap);
  }, [activeDrawer]);

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === overlayRef.current) {
      closeDrawer();
    }
  };

  const renderDrawerHeader = (title: string) => (
    <div className="px-6 py-5 border-b border-border-primary flex items-center justify-between">
      <h3 className="text-lg font-bold text-text-primary">{title}</h3>
      <button
        onClick={closeDrawer}
        className="p-1 rounded-md text-text-secondary hover:text-text-primary hover:bg-bg-tertiary transition-all cursor-pointer"
        aria-label="Close drawer"
      >
        <X className="h-5 w-5" />
      </button>
    </div>
  );

  const renderDrawerContent = () => {
    if (!activeDrawer) return null;

    switch (activeDrawer) {
      case 'CART':
        return (
          <div className="flex flex-col h-full overflow-hidden">
            <div className="px-6 py-5 border-b border-border-primary flex items-center justify-between">
              <h3 className="text-lg font-bold text-text-primary font-heading">Your Cart</h3>
              <button
                onClick={closeDrawer}
                className="p-1 rounded-md text-text-secondary hover:text-text-primary hover:bg-bg-tertiary transition-all cursor-pointer"
                aria-label="Close drawer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="flex-1 overflow-hidden">
              <CartDrawerContent />
            </div>
          </div>
        );
      
      case 'FILTERS':
        return (
          <div className="flex flex-col h-full">
            {renderDrawerHeader('Catalog Filters')}
            <div className="flex-1 overflow-y-auto p-6">
              {drawerProps?.content || (
                <div className="text-center text-text-secondary py-12">
                  No filter options loaded.
                </div>
              )}
            </div>
          </div>
        );
      
      case 'NOTIFICATIONS':
        return (
          <div className="flex flex-col h-full">
            {renderDrawerHeader('Notifications')}
            <div className="flex-1 overflow-y-auto p-6">
              {drawerProps?.content || (
                <div className="space-y-3">
                  <div className="p-3 rounded-lg border border-border-primary bg-bg-secondary flex gap-3">
                    <span className="text-xl">🔥</span>
                    <div>
                      <p className="text-xs font-bold text-text-primary">Flash Sale Active!</p>
                      <p className="text-[10px] text-text-secondary mt-0.5">Flat 50% off on organic Hass avocados and Royal Gala apples for the next 10 minutes.</p>
                    </div>
                  </div>
                  <div className="p-3 rounded-lg border border-border-primary bg-bg-secondary flex gap-3">
                    <span className="text-xl">⚡</span>
                    <div>
                      <p className="text-xs font-bold text-text-primary">Fast Hyperlocal Delivery</p>
                      <p className="text-[10px] text-text-secondary mt-0.5">Orders delivered in 15 minutes from nearest neighborhood stores.</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        );
      
      default:
        return (
          <div className="flex flex-col h-full">
            {renderDrawerHeader('Details Panel')}
            <div className="flex-1 overflow-y-auto p-6">
              {drawerProps?.content || (
                <div className="text-center text-text-secondary py-8">
                  Drawer Content Workspace
                </div>
              )}
            </div>
          </div>
        );
    }
  };

  const direction = isDesktop ? 'right' : 'bottom';

  return (
    <AnimatePresence>
      {activeDrawer && (
        <div className="fixed inset-0 z-9999 flex justify-end">
          {/* Backdrop overlay */}
          <motion.div
            ref={overlayRef}
            onClick={handleBackdropClick}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-overlay-bg backdrop-blur-sm pointer-events-auto z-9998"
          />

          {/* Drawer container */}
          <motion.div
            ref={containerRef}
            variants={drawerSlide(direction)}
            initial="initial"
            animate="animate"
            exit="exit"
            role="dialog"
            aria-modal="true"
            className={cn(
              'relative bg-bg-secondary border-border-primary shadow-high flex flex-col pointer-events-auto h-full z-9999',
              isDesktop ? 'w-full max-w-md border-l' : 'w-full rounded-t-2xl border-t mt-auto h-[80vh]'
            )}
          >
            {renderDrawerContent()}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default DrawerContainer;

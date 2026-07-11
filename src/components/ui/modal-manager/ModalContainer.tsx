import React, { useEffect, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { X, AlertTriangle, HelpCircle } from 'lucide-react';
import { useModalStore } from './modal-store';
import { modalAnimation } from '../../../core/theme/animations';

export const ModalContainer: React.FC = () => {
  const { activeModal, modalProps, closeModal } = useModalStore();
  const overlayRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close modal on Escape press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && activeModal) {
        closeModal();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeModal, closeModal]);

  // Focus trapping logic
  useEffect(() => {
    if (!activeModal || !containerRef.current) return;

    const focusableElements = containerRef.current.querySelectorAll(
      'a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'
    );
    
    if (focusableElements.length === 0) return;

    const firstElement = focusableElements[0] as HTMLElement;
    const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;
    
    firstElement.focus();

    const handleFocusTrap = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;

      if (e.shiftKey) {
        if (document.activeElement === firstElement) {
          lastElement.focus();
          e.preventDefault();
        }
      } else {
        if (document.activeElement === lastElement) {
          firstElement.focus();
          e.preventDefault();
        }
      }
    };

    window.addEventListener('keydown', handleFocusTrap);
    return () => window.removeEventListener('keydown', handleFocusTrap);
  }, [activeModal]);

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === overlayRef.current) {
      closeModal();
    }
  };

  // Render modal content based on activeModal type
  const renderModalContent = () => {
    if (!activeModal) return null;

    switch (activeModal) {
      case 'CONFIRM': {
        const { title, message, onConfirm, confirmText = 'Confirm', cancelText = 'Cancel', isDestructive = false } = modalProps || {};
        return (
          <div className="p-6">
            <div className="flex items-start gap-4 mb-5">
              <div className={`p-3 rounded-full flex-shrink-0 ${isDestructive ? 'bg-status-error/10 text-status-error' : 'bg-status-info/10 text-status-info'}`}>
                <HelpCircle className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-text-primary mb-1">{title}</h3>
                <p className="text-sm text-text-secondary leading-relaxed">{message}</p>
              </div>
            </div>
            <div className="flex items-center justify-end gap-3">
              <button
                onClick={closeModal}
                className="px-4 py-2 text-sm font-semibold rounded-lg bg-bg-tertiary text-text-primary hover:bg-border-primary transition-all cursor-pointer"
              >
                {cancelText}
              </button>
              <button
                onClick={() => {
                  if (onConfirm) onConfirm();
                  closeModal();
                }}
                className={`px-4 py-2 text-sm font-semibold rounded-lg text-white transition-all cursor-pointer ${isDestructive ? 'bg-status-error hover:bg-status-error/90' : 'bg-brand-emerald hover:bg-brand-emerald-hover'}`}
              >
                {confirmText}
              </button>
            </div>
          </div>
        );
      }
      
      case 'ALERT': {
        const { title, message, type = 'info', buttonText = 'Dismiss' } = modalProps || {};
        const isError = type === 'error';
        const isWarning = type === 'warning';
        return (
          <div className="p-6 text-center">
            <div className={`mx-auto p-3 rounded-full w-fit mb-4 ${isError ? 'bg-status-error/10 text-status-error' : isWarning ? 'bg-status-warning/10 text-status-warning' : 'bg-status-info/10 text-status-info'}`}>
              <AlertTriangle className="h-6 w-6" />
            </div>
            <h3 className="text-lg font-bold text-text-primary mb-1">{title}</h3>
            <p className="text-sm text-text-secondary leading-relaxed mb-6">{message}</p>
            <button
              onClick={closeModal}
              className="w-full py-2.5 text-sm font-semibold rounded-lg bg-brand-emerald text-white hover:bg-brand-emerald-hover transition-all cursor-pointer"
            >
              {buttonText}
            </button>
          </div>
        );
      }
      
      default:
        // Support custom content injected via props
        return modalProps?.content ? (
          <div className="p-6">{modalProps.content}</div>
        ) : (
          <div className="p-6 text-center text-sm text-text-secondary">
            Generic Modal Workspace
          </div>
        );
    }
  };

  return (
    <AnimatePresence>
      {activeModal && (
        <div className="fixed inset-0 z-dialog flex items-center justify-center">
          {/* Blurred Backdrop */}
          <motion.div
            ref={overlayRef}
            onClick={handleBackdropClick}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-overlay-bg backdrop-blur-sm pointer-events-auto"
          />

          {/* Modal Card wrapper */}
          <motion.div
            ref={containerRef}
            variants={modalAnimation}
            initial="initial"
            animate="animate"
            exit="exit"
            role="dialog"
            aria-modal="true"
            className="relative w-full max-w-md mx-4 rounded-xl border border-border-primary bg-bg-secondary shadow-high overflow-hidden pointer-events-auto z-base"
          >
            {/* Absolute close button */}
            <button
              onClick={closeModal}
              className="absolute top-4 right-4 p-1 rounded-md text-text-secondary hover:text-text-primary hover:bg-bg-tertiary transition-all cursor-pointer"
              aria-label="Close dialog"
            >
              <X className="h-4 w-4" />
            </button>
            
            {renderModalContent()}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default ModalContainer;

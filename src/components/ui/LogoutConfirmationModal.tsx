import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { LogOut } from 'lucide-react';

interface LogoutConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export const LogoutConfirmationModal: React.FC<LogoutConfirmationModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
}) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-overlay flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="w-full max-w-sm p-6 rounded-2xl bg-bg-secondary border border-border-primary shadow-high space-y-5 text-center"
          >
            <div className="mx-auto p-3 rounded-full bg-status-error/10 text-status-error w-fit">
              <LogOut className="h-6 w-6" />
            </div>
            
            <div className="space-y-2">
              <h3 className="text-md font-extrabold text-text-primary tracking-tight font-heading">
                Logout
              </h3>
              <p className="text-xs text-text-secondary leading-relaxed font-semibold">
                Are you sure you want to logout?
              </p>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-2.5 border border-border-primary rounded-xl text-xs font-bold text-text-secondary hover:bg-bg-tertiary transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={onConfirm}
                className="flex-1 py-2.5 bg-status-error text-white hover:bg-status-error/90 rounded-xl text-xs font-bold transition-all cursor-pointer"
              >
                Logout
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default LogoutConfirmationModal;

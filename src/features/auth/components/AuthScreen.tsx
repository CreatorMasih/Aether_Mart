import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { LoginForm } from './LoginForm';
import { OTPVerificationPanel } from './OTPVerificationPanel';
import { useAuthStore } from '../store/auth-store';
import { pageTransition } from '../../../core/theme/animations';
import type { User } from '../../../types';

export const AuthScreen: React.FC = () => {
  const [step, setStep] = useState<'LOGIN' | 'OTP'>('LOGIN');
  const [identifier, setIdentifier] = useState<string>('');
  const [authMethod, setAuthMethod] = useState<'PHONE' | 'EMAIL'>('PHONE');
  const { isAuthenticated, user, activeRole, setSession, clearSession } = useAuthStore();
  const navigate = useNavigate();

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated && user) {
      if (activeRole && user.role !== activeRole) {
        clearSession();
        return;
      }
      if (user.isProfileComplete || user.fullName || user.role === 'ADMIN') {
        redirectToDashboard(user.role);
      } else {
        navigate('/auth/profile-setup');
      }
    }
  }, [isAuthenticated, user, activeRole, navigate, clearSession]);

  // If no role has been selected yet (bypassed onboarding), redirect to /welcome
  useEffect(() => {
    if (!activeRole) {
      navigate('/welcome');
    }
  }, [activeRole, navigate]);

  const handleOtpSent = (idStr: string, method: 'PHONE' | 'EMAIL') => {
    setIdentifier(idStr);
    setAuthMethod(method);
    setStep('OTP');
  };

  const handleVerifySuccess = (session: { token: string; user: User }) => {
    setSession(session.user, session.token);
    
    // Redirect to dashboard if profile is complete or user is admin
    if (session.user.isProfileComplete || session.user.fullName || session.user.role === 'ADMIN') {
      redirectToDashboard(session.user.role);
    } else {
      navigate('/auth/profile-setup');
    }
  };

  const redirectToDashboard = (role: string) => {
    switch (role) {
      case 'SHOPKEEPER':
        navigate('/m/dashboard');
        break;
      case 'RIDER':
        navigate('/r/dashboard');
        break;
      case 'ADMIN':
        navigate('/a/dashboard');
        break;
      case 'CUSTOMER':
      default:
        navigate('/c/home');
        break;
    }
  };

  if (!activeRole) return null;

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-bg-primary p-4">
      <motion.div
        variants={pageTransition}
        initial="initial"
        animate="animate"
        exit="exit"
        className="w-full max-w-md p-6 md:p-8 rounded-2xl border border-border-primary bg-bg-secondary shadow-high relative overflow-hidden"
      >
        {/* Visual brand logo header */}
        <div className="text-center mb-8">
          <span className="font-heading font-extrabold text-2xl text-brand-emerald">Aether Mart</span>
          <p className="text-xs text-text-secondary mt-1 font-semibold uppercase tracking-wider">
            Portal: {activeRole}
          </p>
        </div>

        <AnimatePresence mode="wait">
          {step === 'LOGIN' ? (
            <motion.div
              key="login"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              transition={{ duration: 0.15 }}
            >
              <LoginForm role={activeRole} onOtpSent={handleOtpSent} />
            </motion.div>
          ) : (
            <motion.div
              key="otp"
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.15 }}
            >
              <OTPVerificationPanel
                identifier={identifier}
                method={authMethod}
                role={activeRole}
                onVerifySuccess={handleVerifySuccess}
                onBack={() => setStep('LOGIN')}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
};

export default AuthScreen;

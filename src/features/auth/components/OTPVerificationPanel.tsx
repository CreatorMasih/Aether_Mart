import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Loader2, ArrowLeft, ShieldCheck } from 'lucide-react';
import { OTPInput } from './OTPInput';
import { useToast } from '../../../hooks/useToast';
import { authService } from '../services/auth-service';
import type { UserRole } from '../../../core/config/constants';
import type { User } from '../../../types';

interface OTPVerificationPanelProps {
  identifier: string;
  method: 'PHONE' | 'EMAIL';
  role: UserRole;
  onVerifySuccess: (session: { token: string; user: User }) => void;
  onBack: () => void;
}

export const OTPVerificationPanel: React.FC<OTPVerificationPanelProps> = ({
  identifier,
  method,
  role,
  onVerifySuccess,
  onBack,
}) => {
  const [otp, setOtp] = useState<string>('');
  const [timer, setTimer] = useState<number>(30); // 30-second countdown
  const [isVerifying, setIsVerifying] = useState<boolean>(false);
  const [isResending, setIsResending] = useState<boolean>(false);
  const { showToast } = useToast();

  const lastVerifiedOtpRef = useRef<string>('');

  // Handle countdown timer decrement
  useEffect(() => {
    if (timer <= 0) return;
    const interval = setInterval(() => {
      setTimer((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [timer]);

  const handleVerify = useCallback(async (codeToVerify: string) => {
    setIsVerifying(true);
    try {
      const session = await authService.verifyOtp({
        identifier,
        code: codeToVerify,
        role,
        method,
      });

      showToast({
        type: 'success',
        title: 'Authentication Successful',
        description: 'You have logged in successfully.',
      });

      onVerifySuccess(session);
    } catch (error: any) {
      showToast({
        type: 'error',
        title: 'Verification Failed',
        description: error.message || 'The OTP entered is invalid or has expired.',
      });
      lastVerifiedOtpRef.current = '';
      setOtp(''); // Clear OTP inputs on failure
    } finally {
      setIsVerifying(false);
    }
  }, [identifier, method, role, onVerifySuccess, showToast]);

  // Auto-submit when OTP reaches 6 digits
  useEffect(() => {
    if (otp.length === 6 && !isVerifying && lastVerifiedOtpRef.current !== otp) {
      lastVerifiedOtpRef.current = otp;
      handleVerify(otp);
    }
  }, [otp, handleVerify, isVerifying]);


  const handleResend = async () => {
    setIsResending(true);
    try {
      const success = await authService.sendOtp({
        identifier,
        type: method === 'PHONE' ? 'SMS' : 'EMAIL',
        role,
      });

      if (success) {
        showToast({
          type: 'success',
          title: 'New OTP Sent',
          description: 'A new 6-digit code has been sent.',
        });
        setTimer(30); // Reset resend countdown
        setOtp('');
      }
    } catch (error: any) {
      showToast({
        type: 'error',
        title: 'Resend Failed',
        description: error.message || 'Please check your connection and try again.',
      });
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="w-full max-w-sm mx-auto text-center">
      {/* Back navigation */}
      <button
        onClick={onBack}
        disabled={isVerifying}
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-text-secondary hover:text-text-primary transition-all cursor-pointer mb-6 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Edit Mobile / Email
      </button>

      <div className="mx-auto p-3 rounded-full bg-brand-emerald/10 text-brand-emerald w-fit mb-4">
        <ShieldCheck className="h-7 w-7" />
      </div>

      <h2 className="text-xl font-bold text-text-primary mb-1">Enter Verification Code</h2>
      <p className="text-xs text-text-secondary mb-8">
        We sent a 6-digit verification code to <span className="font-semibold text-text-primary">{identifier}</span>
      </p>

      <div className="mb-8">
        <OTPInput value={otp} onChange={setOtp} disabled={isVerifying} />
      </div>

      {/* Resend actions */}
      <div className="text-xs text-text-secondary mb-6">
        {timer > 0 ? (
          <p>Resend code in <span className="font-bold text-text-primary">{timer}s</span></p>
        ) : (
          <button
            onClick={handleResend}
            disabled={isResending || isVerifying}
            className="font-bold text-brand-emerald hover:text-brand-emerald-hover transition-colors cursor-pointer disabled:opacity-50"
          >
            {isResending ? 'Sending Code...' : 'Resend Code'}
          </button>
        )}
      </div>

      {isVerifying && (
        <div className="flex items-center justify-center gap-2 text-xs font-medium text-text-secondary">
          <Loader2 className="h-4 w-4 animate-spin text-brand-emerald" />
          Verifying code, please wait...
        </div>
      )}
    </div>
  );
};

export default OTPVerificationPanel;

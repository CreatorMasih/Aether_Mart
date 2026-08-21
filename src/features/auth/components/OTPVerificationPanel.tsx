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
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [otpMode, setOtpMode] = useState<'dev' | 'production'>('production');
  const { showToast } = useToast();

  const lastVerifiedOtpRef = useRef<string>('');

  // Fetch server OTP mode config
  useEffect(() => {
    let isMounted = true;
    authService.getAuthConfig()
      .then((config) => {
        if (isMounted && config?.otpMode) {
          setOtpMode(config.otpMode);
        }
      })
      .catch(() => {
        // Fallback remains 'production'
      });
    return () => { isMounted = false; };
  }, []);

  // Countdown timer decrement
  useEffect(() => {
    if (timer <= 0) return;
    const interval = setInterval(() => {
      setTimer((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [timer]);

  const handleVerify = useCallback(async (codeToVerify: string) => {
    if (isVerifying) return;
    setIsVerifying(true);
    setErrorMessage(null);
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
        description: 'Welcome to Aether Mart!',
      });

      onVerifySuccess(session);
    } catch (error: any) {
      const msg = error.message || 'Invalid or expired OTP code. Please try again.';
      setErrorMessage(msg);
      showToast({
        type: 'error',
        title: 'Verification Failed',
        description: msg,
      });
      lastVerifiedOtpRef.current = '';
      setOtp(''); // Clear OTP inputs on failure
    } finally {
      setIsVerifying(false);
    }
  }, [identifier, method, role, onVerifySuccess, showToast, isVerifying]);

  // Auto-submit when OTP reaches 6 digits
  useEffect(() => {
    if (otp.length === 6 && !isVerifying && lastVerifiedOtpRef.current !== otp) {
      lastVerifiedOtpRef.current = otp;
      handleVerify(otp);
    }
  }, [otp, handleVerify, isVerifying]);

  const handleResend = async () => {
    if (isResending || isVerifying) return;
    setIsResending(true);
    setErrorMessage(null);
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
          description: `A new 6-digit code has been sent to ${identifier}`,
        });
        setTimer(30); // Reset resend countdown
        setOtp('');
      }
    } catch (error: any) {
      if (error.status === 429 || error.code === 'RATE_LIMIT_EXCEEDED') {
        const cooldownSec = error.retryAfterSeconds || 60;
        setTimer(cooldownSec);
        showToast({
          type: 'error',
          title: 'Too Many Requests',
          description: `Too many OTP requests. Try again in ${cooldownSec} seconds.`,
        });
      } else {
        showToast({
          type: 'error',
          title: 'Resend Failed',
          description: error.message || 'Unable to resend OTP. Please try again.',
        });
      }
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="w-full max-w-sm mx-auto text-center space-y-4">
      {/* Back navigation */}
      <div className="text-left">
        <button
          type="button"
          onClick={onBack}
          disabled={isVerifying}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-text-secondary hover:text-text-primary transition-all cursor-pointer disabled:opacity-50"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Change Mobile Number
        </button>
      </div>

      <div className="mx-auto p-3 rounded-full bg-brand-emerald/10 text-brand-emerald w-fit">
        <ShieldCheck className="h-7 w-7" />
      </div>

      <div>
        <h2 className="text-xl font-bold text-text-primary mb-1">Verify OTP</h2>
        <p className="text-xs text-text-secondary">
          Enter the OTP sent to <span className="font-bold text-text-primary">{identifier}</span>
        </p>
        {otpMode === 'dev' && (
          <div className="mt-2.5 px-3 py-2 bg-amber-500/10 border border-amber-500/30 text-amber-800 text-xs font-bold rounded-lg tracking-wide text-center space-y-0.5">
            <div>⚡ Test OTP Mode — UAT Only</div>
            <div>Use OTP: 123456</div>
          </div>
        )}
      </div>

      <div className="py-2">
        <OTPInput value={otp} onChange={setOtp} disabled={isVerifying} />
      </div>

      {errorMessage && (
        <p className="text-xs text-status-error font-medium" role="alert">
          {errorMessage}
        </p>
      )}

      {/* Manual Submit Button */}
      <button
        type="button"
        onClick={() => handleVerify(otp)}
        disabled={otp.length !== 6 || isVerifying}
        className="w-full py-3.5 rounded-xl bg-brand-emerald text-white hover:bg-brand-emerald-hover font-bold text-sm transition-all focus:ring-2 focus:ring-brand-emerald focus:ring-offset-2 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shadow-subtle"
      >
        {isVerifying ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin text-white" />
            <span>Verifying...</span>
          </>
        ) : (
          <span>Verify & Continue</span>
        )}
      </button>

      {/* Resend Actions */}
      <div className="text-xs text-text-secondary pt-2">
        {timer > 0 ? (
          <p>
            Resend OTP in <span className="font-bold text-text-primary">{timer}s</span>
          </p>
        ) : (
          <button
            type="button"
            onClick={handleResend}
            disabled={isResending || isVerifying}
            className="font-bold text-brand-emerald hover:text-brand-emerald-hover transition-colors cursor-pointer disabled:opacity-50"
          >
            {isResending ? 'Resending OTP...' : 'Resend OTP'}
          </button>
        )}
      </div>
    </div>
  );
};

export default OTPVerificationPanel;

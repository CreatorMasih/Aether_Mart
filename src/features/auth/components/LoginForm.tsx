import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Phone, Mail, ArrowRight, Loader2 } from 'lucide-react';
import { CountryCodeSelector } from './CountryCodeSelector';
import { useToast } from '../../../hooks/useToast';
import { authService } from '../services/auth-service';
import type { UserRole } from '../../../core/config/constants';
import { cn } from '../../../utils/cn';

// Extend Zod validation schema directly for flexibility
const phoneLoginSchema = z.object({
  phone: z
    .string()
    .trim()
    .min(10, { message: 'Phone number must contain exactly 10 digits.' })
    .max(10, { message: 'Phone number must contain exactly 10 digits.' })
    .regex(/^[6-9]\d{9}$/, { message: 'Please enter a valid Indian mobile number.' }),
});

const emailLoginSchema = z.object({
  email: z
    .string()
    .trim()
    .email({ message: 'Please enter a valid email address.' }),
});

type PhoneInputData = z.infer<typeof phoneLoginSchema>;
type EmailInputData = z.infer<typeof emailLoginSchema>;

interface LoginFormProps {
  role: UserRole;
  onOtpSent: (identifier: string, method: 'PHONE' | 'EMAIL') => void;
}

export const LoginForm: React.FC<LoginFormProps> = ({ role, onOtpSent }) => {
  const [loginMethod, setLoginMethod] = useState<'PHONE' | 'EMAIL'>('PHONE');
  const [countryCode, setCountryCode] = useState<string>('+91');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const { showToast } = useToast();

  const phoneForm = useForm<PhoneInputData>({
    resolver: zodResolver(phoneLoginSchema),
    defaultValues: { phone: '' },
  });

  const emailForm = useForm<EmailInputData>({
    resolver: zodResolver(emailLoginSchema),
    defaultValues: { email: '' },
  });

  const handlePhoneSubmit = async (data: PhoneInputData) => {
    setIsLoading(true);
    const fullPhone = `${countryCode}${data.phone}`;
    try {
      const success = await authService.sendOtp({
        identifier: fullPhone,
        type: 'SMS',
        role,
      });

      if (success) {
        showToast({
          type: 'success',
          title: 'OTP Sent successfully',
          description: `A 6-digit verification code has been sent to ${fullPhone}`,
        });
        onOtpSent(fullPhone, 'PHONE');
      }
    } catch (error: any) {
      showToast({
        type: 'error',
        title: 'Failed to send OTP',
        description: error.message || 'Something went wrong.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleEmailSubmit = async (data: EmailInputData) => {
    setIsLoading(true);
    try {
      const success = await authService.sendOtp({
        identifier: data.email,
        type: 'EMAIL',
        role,
      });

      if (success) {
        showToast({
          type: 'success',
          title: 'OTP Sent successfully',
          description: `A 6-digit verification code has been sent to ${data.email}`,
        });
        onOtpSent(data.email, 'EMAIL');
      }
    } catch (error: any) {
      showToast({
        type: 'error',
        title: 'Failed to send OTP',
        description: error.message || 'Something went wrong.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-sm mx-auto">
      {/* Login Tab Selection */}
      <div className="flex rounded-xl bg-bg-tertiary p-1 border border-border-primary mb-6">
        <button
          type="button"
          onClick={() => setLoginMethod('PHONE')}
          className={cn(
            "flex-1 py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5",
            loginMethod === 'PHONE' 
              ? "bg-bg-secondary text-text-primary shadow-subtle border border-border-primary/40" 
              : "text-text-secondary hover:text-text-primary"
          )}
        >
          <Phone className="h-3.5 w-3.5" />
          Mobile Number
        </button>
        <button
          type="button"
          onClick={() => setLoginMethod('EMAIL')}
          className={cn(
            "flex-1 py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5",
            loginMethod === 'EMAIL' 
              ? "bg-bg-secondary text-text-primary shadow-subtle border border-border-primary/40" 
              : "text-text-secondary hover:text-text-primary"
          )}
        >
          <Mail className="h-3.5 w-3.5" />
          Email Address
        </button>
      </div>

      {loginMethod === 'PHONE' ? (
        <form onSubmit={phoneForm.handleSubmit(handlePhoneSubmit)} className="space-y-4" noValidate>
          <div className="space-y-1.5">
            <label htmlFor="phone" className="text-xs font-bold text-text-secondary uppercase tracking-wider">
              Mobile Number
            </label>
            <div className="flex items-start">
              <CountryCodeSelector value={countryCode} onChange={setCountryCode} disabled={isLoading} />
              <div className="flex-1 relative">
                <input
                  id="phone"
                  type="tel"
                  inputMode="numeric"
                  placeholder="98765 43210"
                  disabled={isLoading}
                  {...phoneForm.register('phone')}
                  className={cn(
                    "w-full px-4 py-3 border-y border-r border-border-primary rounded-r-xl text-sm font-semibold bg-bg-secondary text-text-primary transition-all",
                    "focus:outline-none focus:ring-2 focus:ring-brand-emerald/20 focus:border-brand-emerald",
                    phoneForm.formState.errors.phone && "border-status-error focus:ring-status-error/10 focus:border-status-error"
                  )}
                />
              </div>
            </div>
            {phoneForm.formState.errors.phone && (
              <p className="text-xs text-status-error font-medium" role="alert">
                {phoneForm.formState.errors.phone.message}
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3.5 rounded-xl bg-brand-emerald text-white hover:bg-brand-emerald-hover font-semibold text-sm transition-all focus:ring-2 focus:ring-brand-emerald focus:ring-offset-2 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                Send OTP Code
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </button>
        </form>
      ) : (
        <form onSubmit={emailForm.handleSubmit(handleEmailSubmit)} className="space-y-4" noValidate>
          <div className="space-y-1.5">
            <label htmlFor="email" className="text-xs font-bold text-text-secondary uppercase tracking-wider">
              Email Address
            </label>
            <div className="relative">
              <input
                id="email"
                type="email"
                placeholder="name@domain.com"
                disabled={isLoading}
                {...emailForm.register('email')}
                className={cn(
                  "w-full px-4 py-3 border border-border-primary rounded-xl text-sm font-semibold bg-bg-secondary text-text-primary transition-all",
                  "focus:outline-none focus:ring-2 focus:ring-brand-emerald/20 focus:border-brand-emerald",
                  emailForm.formState.errors.email && "border-status-error focus:ring-status-error/10 focus:border-status-error"
                )}
              />
            </div>
            {emailForm.formState.errors.email && (
              <p className="text-xs text-status-error font-medium" role="alert">
                {emailForm.formState.errors.email.message}
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3.5 rounded-xl bg-brand-emerald text-white hover:bg-brand-emerald-hover font-semibold text-sm transition-all focus:ring-2 focus:ring-brand-emerald focus:ring-offset-2 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                Send OTP Code
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </button>
        </form>
      )}
    </div>
  );
};

export default LoginForm;

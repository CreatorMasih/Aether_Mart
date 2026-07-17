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
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/auth-store';

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
  const [showDevPrompt, setShowDevPrompt] = useState<boolean>(false);
  const [mockEmail, setMockEmail] = useState<string>('');
  
  const { showToast } = useToast();
  const { setSession } = useAuthStore();
  const navigate = useNavigate();

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

  const triggerGoogleSignIn = () => {
    const isProd = import.meta.env.MODE === 'production';
    if (!isProd) {
      // In development, show mock email login box
      setShowDevPrompt(true);
      
      // Auto-prefill based on selected role to assist developers
      if (role === 'CUSTOMER') setMockEmail('customer1@gmail.com');
      else if (role === 'SHOPKEEPER') setMockEmail('merchant1@aethermart.com');
      else if (role === 'RIDER') setMockEmail('rider1@aethermart.com');
    } else {
      // In production, execute standard Google Identity client script authentication
      showToast({
        type: 'info',
        title: 'Google Authentication',
        description: 'Initiating Google authentication context...',
      });
      // Fallback redirect URL or Google sign-in script call here
    }
  };

  const handleGoogleLogin = async (email: string) => {
    if (!email.includes('@')) {
      showToast({
        type: 'error',
        title: 'Validation Error',
        description: 'Please enter a valid Google email address.',
      });
      return;
    }

    setIsLoading(true);
    try {
      const mockToken = `mock-google-token-${email}`;
      const session = await authService.googleLogin({
        token: mockToken,
        role,
      });

      showToast({
        type: 'success',
        title: 'Login Successful',
        description: `Authenticated as ${email}`,
      });

      setSession(session.user, session.token);

      if (!session.user.fullName) {
        navigate('/auth/profile-setup');
      } else {
        redirectToDashboard(session.user.role);
      }
    } catch (error: any) {
      showToast({
        type: 'error',
        title: 'Authentication Failed',
        description: error.message || 'Google Sign-In failed.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const redirectToDashboard = (userRole: string) => {
    switch (userRole) {
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

  // 1. If role is CUSTOMER, SHOPKEEPER, or RIDER, display the Google authentication flow.
  if (role !== 'ADMIN') {
    return (
      <div className="w-full max-w-sm mx-auto space-y-6">
        <div className="text-center space-y-2">
          <p className="text-sm text-text-secondary">
            Access your account securely with Google verification.
          </p>
        </div>

        <button
          type="button"
          disabled={isLoading}
          onClick={triggerGoogleSignIn}
          className={cn(
            "w-full flex items-center justify-center py-3 px-4 border border-border-primary rounded-xl text-sm font-bold bg-white text-gray-800 hover:bg-gray-50 active:bg-gray-100 transition-all shadow-subtle cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed",
            "focus:outline-none focus:ring-2 focus:ring-brand-emerald/20 focus:border-brand-emerald"
          )}
        >
          {isLoading && !showDevPrompt ? (
            <Loader2 className="h-5 w-5 animate-spin text-brand-emerald" />
          ) : (
            <>
              <svg className="h-5 w-5 mr-3" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335"/>
              </svg>
              Continue with Google
            </>
          )}
        </button>

        {showDevPrompt && (
          <div className="mt-4 p-4 border border-border-primary rounded-xl bg-bg-tertiary text-left space-y-3">
            <span className="text-xs font-extrabold text-brand-emerald uppercase tracking-wider block">
              [Dev Mode] Google Mock Account
            </span>
            <p className="text-2xs text-text-secondary">
              Provide a mock Google email to simulate verification logs.
            </p>
            <div className="space-y-2">
              <input
                type="email"
                value={mockEmail}
                onChange={(e) => setMockEmail(e.target.value)}
                placeholder="e.g. customer1@gmail.com"
                className="w-full px-3 py-2 border border-border-primary rounded-lg text-sm bg-bg-secondary text-text-primary focus:outline-none focus:ring-2 focus:ring-brand-emerald/20 focus:border-brand-emerald"
              />
              <button
                type="button"
                disabled={isLoading}
                onClick={() => handleGoogleLogin(mockEmail)}
                className="w-full py-2 bg-brand-emerald text-white text-xs font-bold rounded-lg hover:bg-brand-emerald-hover cursor-pointer flex items-center justify-center gap-1.5"
              >
                {isLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Simulate Continue'}
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // 2. If role is ADMIN, keep existing Email/Phone OTP login layout.
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

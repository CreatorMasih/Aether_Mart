import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ArrowRight, Loader2 } from 'lucide-react';
import { CountryCodeSelector } from './CountryCodeSelector';
import { useToast } from '../../../hooks/useToast';
import { authService } from '../services/auth-service';
import type { UserRole } from '../../../core/config/constants';
import { cn } from '../../../utils/cn';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/auth-store';

const phoneLoginSchema = z.object({
  phone: z
    .string()
    .trim()
    .min(10, { message: 'Please enter a 10-digit mobile number.' })
    .max(10, { message: 'Please enter a 10-digit mobile number.' })
    .regex(/^[6-9]\d{9}$/, { message: 'Please enter a valid Indian mobile number starting with 6-9.' }),
});

type PhoneInputData = z.infer<typeof phoneLoginSchema>;

interface LoginFormProps {
  role: UserRole;
  onOtpSent: (identifier: string, method: 'PHONE' | 'EMAIL') => void;
}

export const LoginForm: React.FC<LoginFormProps> = ({ role, onOtpSent }) => {
  const [countryCode, setCountryCode] = useState<string>('+91');
  const [emailInput, setEmailInput] = useState<string>(role === 'ADMIN' ? '123pratikkumar@gmail.com' : '');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [showDevPrompt, setShowDevPrompt] = useState<boolean>(false);
  const [mockEmail, setMockEmail] = useState<string>('');
  const [rateLimitCooldown, setRateLimitCooldown] = useState<number>(0);
  const [otpMode, setOtpMode] = useState<'dev' | 'production'>('production');

  const { showToast } = useToast();
  const { setSession } = useAuthStore();
  const navigate = useNavigate();

  // Fetch server OTP mode config
  React.useEffect(() => {
    let isMounted = true;
    authService.getAuthConfig()
      .then((config) => {
        if (isMounted && config?.otpMode) {
          setOtpMode(config.otpMode);
        }
      })
      .catch(() => {});
    return () => { isMounted = false; };
  }, []);

  // Decrement rate limit countdown every second
  React.useEffect(() => {
    if (rateLimitCooldown <= 0) return;
    const interval = setInterval(() => {
      setRateLimitCooldown((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [rateLimitCooldown]);

  const phoneForm = useForm<PhoneInputData>({
    resolver: zodResolver(phoneLoginSchema),
    defaultValues: { phone: '' },
  });

  const handleIdentifierSubmit = async (identifier: string, isEmail: boolean) => {
    if (isLoading || rateLimitCooldown > 0) return;
    setIsLoading(true);

    try {
      const success = await authService.sendOtp({
        identifier,
        type: isEmail ? 'EMAIL' : 'SMS',
        role,
      });

      if (success) {
        showToast({
          type: 'success',
          title: 'OTP Sent Successfully',
          description: `A 6-digit code has been sent to ${identifier}`,
        });
        onOtpSent(identifier, isEmail ? 'EMAIL' : 'PHONE');
      }
    } catch (error: any) {
      if (error.status === 429 || error.code === 'RATE_LIMIT_EXCEEDED') {
        const cooldownSec = error.retryAfterSeconds || 60;
        setRateLimitCooldown(cooldownSec);
        showToast({
          type: 'error',
          title: 'Too Many Requests',
          description: `Too many OTP requests. Try again in ${cooldownSec} seconds.`,
        });
      } else {
        showToast({
          type: 'error',
          title: 'Failed to Send OTP',
          description: error.message || 'Unable to dispatch OTP. Please try again.',
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handlePhoneSubmit = async (data: PhoneInputData) => {
    const fullPhone = `${countryCode}${data.phone}`;
    await handleIdentifierSubmit(fullPhone, false);
  };

  const handleAdminEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailInput.includes('@')) {
      showToast({ type: 'error', title: 'Invalid Email', description: 'Please enter a valid Admin email address.' });
      return;
    }
    await handleIdentifierSubmit(emailInput.trim(), true);
  };

  const handleGoogleClick = () => {
    if (otpMode === 'dev') {
      setShowDevPrompt(true);
      if (role === 'CUSTOMER') setMockEmail('customer1@gmail.com');
      else if (role === 'SHOPKEEPER') setMockEmail('merchant1@aethermart.com');
      else if (role === 'RIDER') setMockEmail('rider1@aethermart.com');
      else if (role === 'ADMIN') setMockEmail('123pratikkumar@gmail.com');
    } else {
      // In production, trigger Google OAuth dialog
      const googleObj = (window as any).google;
      if (googleObj) {
        googleObj.accounts.id.initialize({
          client_id: (import.meta.env.VITE_GOOGLE_CLIENT_ID as string) || '247203958169-2i4q6fsac3k1jkpa88unfl9l6sn0i7qg.apps.googleusercontent.com',
          callback: async (response: any) => {
            await handleGoogleLoginWithToken(response.credential);
          },
        });
        googleObj.accounts.id.prompt();
      } else {
        showToast({
          type: 'info',
          title: 'Google Sign-In',
          description: 'Loading Google login services...',
        });
      }
    }
  };

  const handleGoogleLogin = async (email: string) => {
    if (!email.includes('@')) {
      showToast({
        type: 'error',
        title: 'Invalid Email',
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
        title: 'Google Login Successful',
        description: `Logged in as ${email}`,
      });

      setSession(session.user, session.token);

      if (!session.user.fullName && session.user.role !== 'ADMIN') {
        navigate('/auth/profile-setup');
      } else {
        redirectToDashboard(session.user.role);
      }
    } catch (error: any) {
      showToast({
        type: 'error',
        title: 'Google Authentication Failed',
        description: error.message || 'Google login failed.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLoginWithToken = async (idToken: string) => {
    setIsLoading(true);
    try {
      const session = await authService.googleLogin({
        token: idToken,
        role,
      });

      showToast({
        type: 'success',
        title: 'Login Successful',
        description: 'Authenticated via Google successfully.',
      });

      setSession(session.user, session.token);

      if (!session.user.fullName && session.user.role !== 'ADMIN') {
        navigate('/auth/profile-setup');
      } else {
        redirectToDashboard(session.user.role);
      }
    } catch (error: any) {
      showToast({
        type: 'error',
        title: 'Google Login Failed',
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

  return (
    <div className="w-full max-w-sm mx-auto space-y-6">
      {/* Title */}
      <div className="text-center space-y-1">
        <h2 className="text-xl font-extrabold text-text-primary">
          {role === 'ADMIN' ? 'Admin Verification Login' : 'Enter your mobile number'}
        </h2>
        <p className="text-xs text-text-secondary">
          {role === 'ADMIN'
            ? 'We will send a 6-digit verification code to your Admin email'
            : 'We will send a 6-digit verification code to your mobile'}
        </p>
      </div>

      {/* UAT Quick Persona Selector (Only visible in OTP_MODE=dev) */}
      {otpMode === 'dev' && (
        <div className="p-3 border border-amber-500/30 rounded-xl bg-amber-500/10 text-left space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-amber-800 uppercase tracking-wider">
              ⚡ UAT Test Persona (OTP: 123456)
            </span>
          </div>
          <div className="text-xs font-semibold text-amber-900">
            {role === 'ADMIN' && (
              <button
                type="button"
                onClick={() => {
                  setEmailInput('123pratikkumar@gmail.com');
                  handleIdentifierSubmit('123pratikkumar@gmail.com', true);
                }}
                className="w-full py-1.5 px-2 bg-amber-500/20 hover:bg-amber-500/30 text-amber-950 font-bold rounded text-left transition-colors flex items-center justify-between"
              >
                <span>👑 Admin: 123pratikkumar@gmail.com</span>
                <span className="text-[10px] underline">Auto-fill & Send</span>
              </button>
            )}
            {role === 'CUSTOMER' && (
              <button
                type="button"
                onClick={() => {
                  phoneForm.setValue('phone', '9876543210');
                  handleIdentifierSubmit('+919876543210', false);
                }}
                className="w-full py-1.5 px-2 bg-amber-500/20 hover:bg-amber-500/30 text-amber-950 font-bold rounded text-left transition-colors flex items-center justify-between"
              >
                <span>🛍️ Customer: +91 98765 43210</span>
                <span className="text-[10px] underline">Auto-fill & Send</span>
              </button>
            )}
            {role === 'SHOPKEEPER' && (
              <button
                type="button"
                onClick={() => {
                  phoneForm.setValue('phone', '8888888881');
                  handleIdentifierSubmit('+918888888881', false);
                }}
                className="w-full py-1.5 px-2 bg-amber-500/20 hover:bg-amber-500/30 text-amber-950 font-bold rounded text-left transition-colors flex items-center justify-between"
              >
                <span>🏪 Shopkeeper: +91 88888 88881</span>
                <span className="text-[10px] underline">Auto-fill & Send</span>
              </button>
            )}
            {role === 'RIDER' && (
              <button
                type="button"
                onClick={() => {
                  phoneForm.setValue('phone', '7777777771');
                  handleIdentifierSubmit('+917777777771', false);
                }}
                className="w-full py-1.5 px-2 bg-amber-500/20 hover:bg-amber-500/30 text-amber-950 font-bold rounded text-left transition-colors flex items-center justify-between"
              >
                <span>🛵 Rider: +91 77777 77771</span>
                <span className="text-[10px] underline">Auto-fill & Send</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Admin Email or Mobile Form */}
      {role === 'ADMIN' ? (
        <form onSubmit={handleAdminEmailSubmit} className="space-y-4" noValidate>
          <div className="space-y-1.5">
            <input
              type="email"
              placeholder="Admin Email Address"
              value={emailInput}
              onChange={(e) => setEmailInput(e.target.value)}
              disabled={isLoading}
              className="w-full px-4 py-3 border border-border-primary rounded-xl text-sm font-semibold bg-bg-secondary text-text-primary focus:outline-none focus:ring-2 focus:ring-brand-emerald/20 focus:border-brand-emerald"
            />
          </div>
          <button
            type="submit"
            disabled={isLoading || rateLimitCooldown > 0}
            className="w-full py-3.5 rounded-xl bg-brand-emerald text-white hover:bg-brand-emerald-hover font-bold text-sm transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 shadow-subtle"
          >
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <>Send Admin OTP <ArrowRight className="h-4 w-4" /></>}
          </button>
        </form>
      ) : (
        <form onSubmit={phoneForm.handleSubmit(handlePhoneSubmit)} className="space-y-4" noValidate>
          <div className="space-y-1.5">
            <div className="flex items-start">
              <CountryCodeSelector value={countryCode} onChange={setCountryCode} disabled={isLoading} />
              <div className="flex-1 relative">
                <input
                  id="phone"
                  type="tel"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={10}
                  placeholder="Mobile Number"
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
            disabled={isLoading || rateLimitCooldown > 0}
            className="w-full py-3.5 rounded-xl bg-brand-emerald text-white hover:bg-brand-emerald-hover font-bold text-sm transition-all focus:ring-2 focus:ring-brand-emerald focus:ring-offset-2 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed shadow-subtle"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : rateLimitCooldown > 0 ? (
              <span>Try again in {rateLimitCooldown}s</span>
            ) : (
              <>
                Continue
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </button>
        </form>
      )}

      {/* Divider */}
      <div className="relative flex items-center justify-center">
        <div className="w-full border-t border-border-primary/60" />
        <span className="absolute bg-bg-secondary px-3 text-[11px] font-semibold text-text-secondary uppercase tracking-wider">
          Or
        </span>
      </div>

      {/* Secondary Google Login Option */}
      <button
        type="button"
        disabled={isLoading}
        onClick={handleGoogleClick}
        className={cn(
          "w-full flex items-center justify-center py-3 px-4 border border-border-primary rounded-xl text-sm font-bold bg-white text-gray-800 hover:bg-gray-50 active:bg-gray-100 transition-all shadow-subtle cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
        )}
      >
        <svg className="h-4 h-4 mr-2.5 shrink-0" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
          <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
          <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05"/>
          <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335"/>
        </svg>
        Continue with Google
      </button>

      {otpMode === 'dev' && showDevPrompt && (
        <div className="mt-4 p-4 border border-border-primary rounded-xl bg-bg-tertiary text-left space-y-3">
          <span className="text-xs font-extrabold text-brand-emerald uppercase tracking-wider block">
            [Dev Mode] Google Mock Account
          </span>
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
              {isLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Simulate Google Login'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default LoginForm;

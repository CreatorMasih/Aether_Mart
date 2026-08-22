import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2, UserCheck } from 'lucide-react';
import { useToast } from '../../../hooks/useToast';
import { authService } from '../services/auth-service';
import { useAuthStore } from '../store/auth-store';
import type { UserRole } from '../../../core/config/constants';
import { cn } from '../../../utils/cn';

// Zod validation schemas for profile completion
const customerOnboardingSchema = z.object({
  fullName: z.string().trim().min(3, { message: 'Name must contain at least 3 characters.' }),
  email: z.string().trim().email({ message: 'Please enter a valid email address.' }),
  receiverPhone: z.string().trim().regex(/^\+?[1-9]\d{1,14}$/, { message: 'Please enter a valid receiver phone number (e.g. +919876543210).' }),
  streetAddress: z.string().trim().min(5, { message: 'Street address must contain at least 5 characters.' }),
  apartmentSuite: z.string().trim().optional(),
  postalCode: z.string().trim().regex(/^\d{6}$/, { message: 'PIN code must be exactly 6 digits.' }),
  city: z.string().trim().min(2, { message: 'City name must contain at least 2 characters.' }),
});

const merchantOnboardingSchema = z.object({
  fullName: z.string().trim().min(3, { message: 'Name must contain at least 3 characters.' }),
  email: z.string().trim().email({ message: 'Please enter a valid email address.' }),
  storeName: z.string().trim().min(3, { message: 'Store Name must contain at least 3 characters.' }),
  storeAddress: z.string().trim().min(5, { message: 'Store Address must contain at least 5 characters.' }),
  deliveryRadiusKm: z.number().min(1, { message: 'Delivery radius must be at least 1 km.' }).max(50, { message: 'Radius cannot exceed 50 km.' }),
});

const riderOnboardingSchema = z.object({
  fullName: z.string().trim().min(3, { message: 'Name must contain at least 3 characters.' }),
  email: z.string().trim().email({ message: 'Please enter a valid email address.' }),
  vehicleType: z.enum(['BICYCLE', 'MOTORBIKE'], {
    message: 'Please select a vehicle type.',
  }),
  vehiclePlateNumber: z.string().trim().optional(),
}).refine((data) => {
  if (data.vehicleType === 'MOTORBIKE' && (!data.vehiclePlateNumber || data.vehiclePlateNumber.trim().length === 0)) {
    return false;
  }
  return true;
}, {
  message: 'Plate number is required for Motorbike riders.',
  path: ['vehiclePlateNumber'],
});

type CustomerFormData = z.infer<typeof customerOnboardingSchema>;
type MerchantFormData = z.infer<typeof merchantOnboardingSchema>;
type RiderFormData = z.infer<typeof riderOnboardingSchema>;

interface ProfileCompletionFormProps {
  role: UserRole;
  onSetupComplete: () => void;
}

export const ProfileCompletionForm: React.FC<ProfileCompletionFormProps> = ({
  role,
  onSetupComplete,
}) => {
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const { user, accessToken, setSession } = useAuthStore();
  const { showToast } = useToast();

  const customerForm = useForm<CustomerFormData>({
    resolver: zodResolver(customerOnboardingSchema),
    defaultValues: { fullName: user?.fullName || '', email: user?.email || '', receiverPhone: user?.phone || '', streetAddress: '', apartmentSuite: '', postalCode: '', city: '' },
  });

  const merchantForm = useForm<MerchantFormData>({
    resolver: zodResolver(merchantOnboardingSchema),
    defaultValues: { fullName: user?.fullName || '', email: user?.email || '', storeName: '', storeAddress: '', deliveryRadiusKm: 5 },
  });

  const riderForm = useForm<RiderFormData>({
    resolver: zodResolver(riderOnboardingSchema),
    defaultValues: { fullName: user?.fullName || '', email: user?.email || '', vehicleType: 'BICYCLE', vehiclePlateNumber: '' },
  });

  const handleCustomerSubmit = async (data: CustomerFormData) => {
    if (!user || !accessToken) return;
    setIsLoading(true);

    try {
      const updatedUser = await authService.completeProfile({
        role,
        customerDetails: {
          fullName: data.fullName,
          email: data.email,
          defaultAddress: {
            label: 'Home',
            receiverName: data.fullName,
            receiverPhone: data.receiverPhone,
            streetAddress: data.streetAddress,
            apartmentSuite: data.apartmentSuite,
            postalCode: data.postalCode,
            city: data.city,
            coordinates: { latitude: 12.9716, longitude: 77.5946 }, // Default Bengaluru coordinates
          },
        },
      }, user.id, user.phone, user.email);

      showToast({
        type: 'success',
        title: 'Profile Setup Completed',
        description: 'Your profile has been created. Welcome to Aether Mart!',
      });

      setSession(updatedUser, accessToken);
      onSetupComplete();
    } catch (error: any) {
      const isConflict = error.status === 409 || error.code === 'ALREADY_EXISTS' || error.message?.includes('already exists');
      showToast({
        type: 'error',
        title: isConflict ? 'Account Conflict' : 'Onboarding Failed',
        description: isConflict
          ? 'This email address or phone number is already registered to another account.'
          : (error.message || 'Failed to complete profile registration.'),
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleMerchantSubmit = async (data: MerchantFormData) => {
    if (!user || !accessToken) return;
    setIsLoading(true);

    try {
      const updatedUser = await authService.completeProfile({
        role,
        merchantDetails: {
          fullName: data.fullName,
          email: data.email,
          storeName: data.storeName,
          storeAddress: data.storeAddress,
          coordinates: { latitude: 12.9716, longitude: 77.5946 },
          deliveryRadiusKm: data.deliveryRadiusKm,
        },
      }, user.id, user.phone, user.email);

      showToast({
        type: 'success',
        title: 'Merchant Registered',
        description: 'Your store has been set up successfully.',
      });

      setSession(updatedUser, accessToken);
      onSetupComplete();
    } catch (error: any) {
      const isConflict = error.status === 409 || error.code === 'ALREADY_EXISTS' || error.message?.includes('already exists');
      showToast({
        type: 'error',
        title: isConflict ? 'Account Conflict' : 'Onboarding Failed',
        description: isConflict
          ? 'This email address or store name is already registered to another account.'
          : (error.message || 'Failed to complete store setup.'),
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleRiderSubmit = async (data: RiderFormData) => {
    if (!user || !accessToken) return;
    setIsLoading(true);

    try {
      const updatedUser = await authService.completeProfile({
        role,
        riderDetails: {
          fullName: data.fullName,
          email: data.email,
          vehicleType: data.vehicleType,
          vehiclePlateNumber: data.vehiclePlateNumber || undefined,
        },
      }, user.id, user.phone, user.email);

      showToast({
        type: 'success',
        title: 'Rider Profile Created',
        description: 'Welcome to the Aether Mart delivery fleet.',
      });

      setSession(updatedUser, accessToken);
      onSetupComplete();
    } catch (error: any) {
      const isConflict = error.status === 409 || error.code === 'ALREADY_EXISTS' || error.message?.includes('already exists');
      showToast({
        type: 'error',
        title: isConflict ? 'Account Conflict' : 'Onboarding Failed',
        description: isConflict
          ? 'This email address is already registered to another user account.'
          : (error.message || 'Failed to complete rider registration.'),
      });
    } finally {
      setIsLoading(false);
    }
  };

  const renderOnboardingForm = () => {
    switch (role) {
      case 'CUSTOMER':
        return (
          <form onSubmit={customerForm.handleSubmit(handleCustomerSubmit)} className="space-y-4 text-left" noValidate>
            <div className="space-y-1.5">
              <label htmlFor="fullName" className="text-xs font-bold text-text-secondary uppercase tracking-wider">
                Full Name
              </label>
              <input
                id="fullName"
                type="text"
                placeholder="John Doe"
                disabled={isLoading}
                {...customerForm.register('fullName')}
                className={cn(
                  "w-full px-4 py-2.5 border border-border-primary rounded-xl text-sm font-semibold bg-bg-secondary text-text-primary focus:outline-none focus:ring-2 focus:ring-brand-emerald/20 focus:border-brand-emerald",
                  customerForm.formState.errors.fullName && "border-status-error"
                )}
              />
              {customerForm.formState.errors.fullName && (
                <p className="text-xs text-status-error font-medium">{customerForm.formState.errors.fullName.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <label htmlFor="email" className="text-xs font-bold text-text-secondary uppercase tracking-wider">
                Email Address
              </label>
              <input
                id="email"
                type="email"
                placeholder="john@example.com"
                disabled={isLoading}
                {...customerForm.register('email')}
                className={cn(
                  "w-full px-4 py-2.5 border border-border-primary rounded-xl text-sm font-semibold bg-bg-secondary text-text-primary focus:outline-none focus:ring-2 focus:ring-brand-emerald/20 focus:border-brand-emerald",
                  customerForm.formState.errors.email && "border-status-error"
                )}
              />
              {customerForm.formState.errors.email && (
                <p className="text-xs text-status-error font-medium">{customerForm.formState.errors.email.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <label htmlFor="receiverPhone" className="text-xs font-bold text-text-secondary uppercase tracking-wider">
                Phone Number
              </label>
              <input
                id="receiverPhone"
                type="tel"
                placeholder="+919876543210"
                disabled={isLoading}
                {...customerForm.register('receiverPhone')}
                className={cn(
                  "w-full px-4 py-2.5 border border-border-primary rounded-xl text-sm font-semibold bg-bg-secondary text-text-primary focus:outline-none focus:ring-2 focus:ring-brand-emerald/20 focus:border-brand-emerald",
                  customerForm.formState.errors.receiverPhone && "border-status-error"
                )}
              />
              {customerForm.formState.errors.receiverPhone && (
                <p className="text-xs text-status-error font-medium">{customerForm.formState.errors.receiverPhone.message}</p>
              )}
            </div>

            <div className="border-t border-border-primary my-4 pt-4">
              <h3 className="text-xs font-bold text-text-primary uppercase tracking-wider mb-3">Default Delivery Address</h3>
              
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label htmlFor="streetAddress" className="text-xs font-bold text-text-secondary">Street Address</label>
                  <input
                    id="streetAddress"
                    placeholder="123 Fresh Lane, Koramangala"
                    disabled={isLoading}
                    {...customerForm.register('streetAddress')}
                    className="w-full px-4 py-2.5 border border-border-primary rounded-xl text-sm font-semibold bg-bg-secondary text-text-primary focus:outline-none focus:ring-2 focus:ring-brand-emerald/20 focus:border-brand-emerald"
                  />
                  {customerForm.formState.errors.streetAddress && (
                    <p className="text-xs text-status-error font-medium">{customerForm.formState.errors.streetAddress.message}</p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label htmlFor="apartmentSuite" className="text-xs font-bold text-text-secondary">Apt/Suite (Optional)</label>
                    <input
                      id="apartmentSuite"
                      placeholder="Flat 4B"
                      disabled={isLoading}
                      {...customerForm.register('apartmentSuite')}
                      className="w-full px-4 py-2.5 border border-border-primary rounded-xl text-sm font-semibold bg-bg-secondary text-text-primary focus:outline-none focus:ring-2 focus:ring-brand-emerald/20 focus:border-brand-emerald"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label htmlFor="postalCode" className="text-xs font-bold text-text-secondary">PIN Code</label>
                    <input
                      id="postalCode"
                      placeholder="560034"
                      disabled={isLoading}
                      {...customerForm.register('postalCode')}
                      className="w-full px-4 py-2.5 border border-border-primary rounded-xl text-sm font-semibold bg-bg-secondary text-text-primary focus:outline-none focus:ring-2 focus:ring-brand-emerald/20 focus:border-brand-emerald"
                    />
                    {customerForm.formState.errors.postalCode && (
                      <p className="text-xs text-status-error font-medium">{customerForm.formState.errors.postalCode.message}</p>
                    )}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="city" className="text-xs font-bold text-text-secondary">City</label>
                  <input
                    id="city"
                    placeholder="Bengaluru"
                    disabled={isLoading}
                    {...customerForm.register('city')}
                    className="w-full px-4 py-2.5 border border-border-primary rounded-xl text-sm font-semibold bg-bg-secondary text-text-primary focus:outline-none focus:ring-2 focus:ring-brand-emerald/20 focus:border-brand-emerald"
                  />
                  {customerForm.formState.errors.city && (
                    <p className="text-xs text-status-error font-medium">{customerForm.formState.errors.city.message}</p>
                  )}
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 rounded-xl bg-brand-emerald text-white hover:bg-brand-emerald-hover font-semibold text-sm transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
            >
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Complete Setup'}
            </button>
          </form>
        );
      
      case 'SHOPKEEPER':
        return (
          <form onSubmit={merchantForm.handleSubmit(handleMerchantSubmit)} className="space-y-4 text-left" noValidate>
            <div className="space-y-1.5">
              <label htmlFor="fullName" className="text-xs font-bold text-text-secondary uppercase tracking-wider">
                Owner Full Name
              </label>
              <input
                id="fullName"
                placeholder="Store Manager Name"
                disabled={isLoading}
                {...merchantForm.register('fullName')}
                className="w-full px-4 py-2.5 border border-border-primary rounded-xl text-sm font-semibold bg-bg-secondary text-text-primary focus:outline-none focus:ring-2 focus:ring-brand-emerald/20 focus:border-brand-emerald"
              />
              {merchantForm.formState.errors.fullName && (
                <p className="text-xs text-status-error font-medium">{merchantForm.formState.errors.fullName.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <label htmlFor="email" className="text-xs font-bold text-text-secondary uppercase tracking-wider">
                Owner Email Address
              </label>
              <input
                id="email"
                type="email"
                placeholder="store@aethermart.com"
                disabled={isLoading}
                {...merchantForm.register('email')}
                className="w-full px-4 py-2.5 border border-border-primary rounded-xl text-sm font-semibold bg-bg-secondary text-text-primary focus:outline-none focus:ring-2 focus:ring-brand-emerald/20 focus:border-brand-emerald"
              />
              {merchantForm.formState.errors.email && (
                <p className="text-xs text-status-error font-medium">{merchantForm.formState.errors.email.message}</p>
              )}
            </div>

            <div className="border-t border-border-primary my-4 pt-4 space-y-4">
              <h3 className="text-xs font-bold text-text-primary uppercase tracking-wider mb-1">Store Details</h3>
              
              <div className="space-y-1.5">
                <label htmlFor="storeName" className="text-xs font-bold text-text-secondary">Store Name</label>
                <input
                  id="storeName"
                  placeholder="Aether Organic Groceries"
                  disabled={isLoading}
                  {...merchantForm.register('storeName')}
                  className="w-full px-4 py-2.5 border border-border-primary rounded-xl text-sm font-semibold bg-bg-secondary text-text-primary focus:outline-none focus:ring-2 focus:ring-brand-emerald/20 focus:border-brand-emerald"
                />
                {merchantForm.formState.errors.storeName && (
                  <p className="text-xs text-status-error font-medium">{merchantForm.formState.errors.storeName.message}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <label htmlFor="storeAddress" className="text-xs font-bold text-text-secondary">Store Address</label>
                <input
                  id="storeAddress"
                  placeholder="Block 2, Outer Ring Road, Bengaluru"
                  disabled={isLoading}
                  {...merchantForm.register('storeAddress')}
                  className="w-full px-4 py-2.5 border border-border-primary rounded-xl text-sm font-semibold bg-bg-secondary text-text-primary focus:outline-none focus:ring-2 focus:ring-brand-emerald/20 focus:border-brand-emerald"
                />
                {merchantForm.formState.errors.storeAddress && (
                  <p className="text-xs text-status-error font-medium">{merchantForm.formState.errors.storeAddress.message}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <label htmlFor="deliveryRadiusKm" className="text-xs font-bold text-text-secondary">Delivery Radius (km)</label>
                <input
                  id="deliveryRadiusKm"
                  type="number"
                  placeholder="5"
                  disabled={isLoading}
                  {...merchantForm.register('deliveryRadiusKm', { valueAsNumber: true })}
                  className="w-full px-4 py-2.5 border border-border-primary rounded-xl text-sm font-semibold bg-bg-secondary text-text-primary focus:outline-none focus:ring-2 focus:ring-brand-emerald/20 focus:border-brand-emerald"
                />
                {merchantForm.formState.errors.deliveryRadiusKm && (
                  <p className="text-xs text-status-error font-medium">{merchantForm.formState.errors.deliveryRadiusKm.message}</p>
                )}
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 rounded-xl bg-brand-emerald text-white hover:bg-brand-emerald-hover font-semibold text-sm transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
            >
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Register Store'}
            </button>
          </form>
        );

      case 'RIDER':
        return (
          <form onSubmit={riderForm.handleSubmit(handleRiderSubmit)} className="space-y-4 text-left" noValidate>
            <div className="space-y-1.5">
              <label htmlFor="fullName" className="text-xs font-bold text-text-secondary uppercase tracking-wider">
                Full Name
              </label>
              <input
                id="fullName"
                placeholder="Rider Full Name"
                disabled={isLoading}
                {...riderForm.register('fullName')}
                className="w-full px-4 py-2.5 border border-border-primary rounded-xl text-sm font-semibold bg-bg-secondary text-text-primary focus:outline-none focus:ring-2 focus:ring-brand-emerald/20 focus:border-brand-emerald"
              />
              {riderForm.formState.errors.fullName && (
                <p className="text-xs text-status-error font-medium">{riderForm.formState.errors.fullName.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <label htmlFor="email" className="text-xs font-bold text-text-secondary uppercase tracking-wider">
                Email Address
              </label>
              <input
                id="email"
                type="email"
                placeholder="rider@aethermart.com"
                disabled={isLoading}
                {...riderForm.register('email')}
                className="w-full px-4 py-2.5 border border-border-primary rounded-xl text-sm font-semibold bg-bg-secondary text-text-primary focus:outline-none focus:ring-2 focus:ring-brand-emerald/20 focus:border-brand-emerald"
              />
              {riderForm.formState.errors.email && (
                <p className="text-xs text-status-error font-medium">{riderForm.formState.errors.email.message}</p>
              )}
            </div>

            <div className="border-t border-border-primary my-4 pt-4 space-y-4">
              <h3 className="text-xs font-bold text-text-primary uppercase tracking-wider mb-1">Vehicle Setup</h3>
              
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-text-secondary">Vehicle Type</label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 text-sm font-semibold cursor-pointer">
                    <input
                      type="radio"
                      value="BICYCLE"
                      disabled={isLoading}
                      {...riderForm.register('vehicleType')}
                      className="accent-brand-emerald"
                    />
                    Bicycle
                  </label>
                  <label className="flex items-center gap-2 text-sm font-semibold cursor-pointer">
                    <input
                      type="radio"
                      value="MOTORBIKE"
                      disabled={isLoading}
                      {...riderForm.register('vehicleType')}
                      className="accent-brand-emerald"
                    />
                    Motorbike / Scooter
                  </label>
                </div>
                {riderForm.formState.errors.vehicleType && (
                  <p className="text-xs text-status-error font-medium">{riderForm.formState.errors.vehicleType.message}</p>
                )}
              </div>

              {/* Conditional plate number rendering */}
              <div className="space-y-1.5">
                <label htmlFor="vehiclePlateNumber" className="text-xs font-bold text-text-secondary">
                  Vehicle Plate Number (e.g. KA-03-XX-XXXX)
                </label>
                <input
                  id="vehiclePlateNumber"
                  placeholder="KA-01-AB-1234"
                  disabled={isLoading}
                  {...riderForm.register('vehiclePlateNumber')}
                  className="w-full px-4 py-2.5 border border-border-primary rounded-xl text-sm font-semibold bg-bg-secondary text-text-primary focus:outline-none focus:ring-2 focus:ring-brand-emerald/20 focus:border-brand-emerald"
                />
                {riderForm.formState.errors.vehiclePlateNumber && (
                  <p className="text-xs text-status-error font-medium">{riderForm.formState.errors.vehiclePlateNumber.message}</p>
                )}
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 rounded-xl bg-brand-emerald text-white hover:bg-brand-emerald-hover font-semibold text-sm transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
            >
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Register Rider Profile'}
            </button>
          </form>
        );
      
      default:
        return null;
    }
  };

  return (
    <div className="w-full max-w-md mx-auto p-6 rounded-xl border border-border-primary bg-bg-secondary shadow-high text-center">
      <div className="mx-auto p-3 rounded-full bg-brand-emerald/10 text-brand-emerald w-fit mb-4">
        <UserCheck className="h-7 w-7" />
      </div>
      <h2 className="text-xl font-bold text-text-primary mb-1">Complete Your Profile</h2>
      <p className="text-xs text-text-secondary mb-6">
        Please complete your account verification details before logging in.
      </p>

      {renderOnboardingForm()}
    </div>
  );
};

export default ProfileCompletionForm;

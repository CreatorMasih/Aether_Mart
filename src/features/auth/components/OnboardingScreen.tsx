import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ShoppingBag, Store, Bike, ShieldAlert, ArrowRight, ArrowLeft } from 'lucide-react';
import { useAuthStore } from '../store/auth-store';
import { USER_ROLES } from '../../../core/config/constants';
import type { UserRole } from '../../../core/config/constants';
import { cn } from '../../../utils/cn';
import { buttonPress } from '../../../core/theme/animations';

interface OnboardingSlide {
  title: string;
  subtitle: string;
  description: string;
  colorClass: string;
}

const ONBOARDING_SLIDES: OnboardingSlide[] = [
  {
    title: 'Aether Mart',
    subtitle: 'Lightning-Fast Hyperlocal Delivery',
    description: 'Get groceries, bakery, dairy, and household essentials delivered to your doorstep in under 10 minutes.',
    colorClass: 'from-brand-emerald/10 to-brand-emerald/5 text-brand-emerald',
  },
  {
    title: 'Direct Sourcing',
    subtitle: 'Fresh From Local Farms & Stores',
    description: 'We connect directly with regional farmers and certified stores to ensure top-tier organic quality.',
    colorClass: 'from-brand-violet/10 to-brand-violet/5 text-brand-violet',
  },
  {
    title: 'Carbon-Neutral Fleet',
    subtitle: 'Eco-Friendly Deliveries',
    description: 'Our rider network operates purely via electric scooters and bicycles, reducing emissions one drop at a time.',
    colorClass: 'from-status-warning/10 to-status-warning/5 text-status-warning',
  },
];

export const OnboardingScreen: React.FC = () => {
  const [activeSlide, setActiveSlide] = useState<number>(0);
  const [selectedRole, setSelectedRole] = useState<UserRole | null>(null);
  const { isAuthenticated, user, setActiveRole } = useAuthStore();
  const navigate = useNavigate();

  React.useEffect(() => {
    if (isAuthenticated && user) {
      if (!user.fullName && user.role !== 'ADMIN') {
        navigate('/auth/profile-setup');
      } else {
        switch (user.role) {
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
      }
    }
  }, [isAuthenticated, user, navigate]);

  const handleNextSlide = () => {
    if (activeSlide < ONBOARDING_SLIDES.length - 1) {
      setActiveSlide((prev) => prev + 1);
    }
  };

  const handlePrevSlide = () => {
    if (activeSlide > 0) {
      setActiveSlide((prev) => prev - 1);
    }
  };

  const handleRoleSelect = (role: UserRole) => {
    setSelectedRole(role);
  };

  const handleGetStarted = () => {
    if (!selectedRole) return;
    setActiveRole(selectedRole);
    navigate('/auth');
  };

  const currentSlide = ONBOARDING_SLIDES[activeSlide];

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-bg-primary p-4 md:p-8">
      <div className="w-full max-w-2xl min-h-[550px] flex flex-col md:flex-row rounded-2xl border border-border-primary bg-bg-secondary shadow-high overflow-hidden">
        
        {/* Left pane: Slider (Hidden on mobile for compact layout) */}
        <div className="hidden md:flex md:w-1/2 bg-gradient-to-b from-bg-tertiary to-bg-primary p-8 flex-col justify-between border-r border-border-primary">
          <div className="flex items-center gap-1.5">
            <span className="font-heading font-extrabold text-xl text-brand-emerald">Aether Mart</span>
          </div>

          <div className="my-auto py-8">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeSlide}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                transition={{ duration: 0.25 }}
                className="space-y-4"
              >
                <div className={cn("p-4 rounded-xl bg-gradient-to-br w-fit mb-4", currentSlide.colorClass)}>
                  <ShoppingBag className="h-6 w-6" />
                </div>
                <h2 className="text-xl font-extrabold text-text-primary leading-tight font-heading">
                  {currentSlide.subtitle}
                </h2>
                <p className="text-sm text-text-secondary leading-relaxed">
                  {currentSlide.description}
                </p>
              </motion.div>
            </AnimatePresence>

            {/* Slider Dots */}
            <div className="flex items-center gap-1.5 mt-8">
              {ONBOARDING_SLIDES.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setActiveSlide(idx)}
                  className={cn(
                    "h-1.5 rounded-full transition-all cursor-pointer",
                    idx === activeSlide ? "w-6 bg-brand-emerald" : "w-1.5 bg-border-primary"
                  )}
                  aria-label={`Slide ${idx + 1}`}
                />
              ))}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handlePrevSlide}
              disabled={activeSlide === 0}
              className="p-2 border border-border-primary text-text-secondary hover:text-text-primary rounded-lg cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
            <button
              onClick={handleNextSlide}
              disabled={activeSlide === ONBOARDING_SLIDES.length - 1}
              className="p-2 border border-border-primary text-text-secondary hover:text-text-primary rounded-lg cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Right pane: Role Selection & Start */}
        <div className="flex-1 p-6 md:p-8 flex flex-col justify-between">
          <div className="md:hidden flex items-center gap-1.5 mb-6">
            <span className="font-heading font-extrabold text-xl text-brand-emerald">Aether Mart</span>
          </div>

          <div className="space-y-6 my-auto">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-text-primary mb-1">
                Choose Your Role
              </h1>
              <p className="text-xs text-text-secondary">
                Select how you wish to access the platform.
              </p>
            </div>

            {/* Role List Grid */}
            <div className="grid grid-cols-1 gap-3">
              {[
                {
                  role: USER_ROLES.CUSTOMER,
                  title: 'Customer',
                  desc: 'Order groceries and household items.',
                  icon: <ShoppingBag className="h-5 w-5" />,
                  color: 'border-brand-emerald hover:bg-brand-emerald/5',
                  activeBg: 'bg-brand-emerald/10 text-brand-emerald border-brand-emerald',
                },
                {
                  role: USER_ROLES.SHOPKEEPER,
                  title: 'Shopkeeper',
                  desc: 'Manage store orders and listings.',
                  icon: <Store className="h-5 w-5" />,
                  color: 'border-brand-violet hover:bg-brand-violet/5',
                  activeBg: 'bg-brand-violet/10 text-brand-violet border-brand-violet',
                },
                {
                  role: USER_ROLES.RIDER,
                  title: 'Delivery Partner',
                  desc: 'Accept delivery jobs and earn rewards.',
                  icon: <Bike className="h-5 w-5" />,
                  color: 'border-status-warning hover:bg-status-warning/5',
                  activeBg: 'bg-status-warning/10 text-status-warning border-status-warning',
                },
                {
                  role: USER_ROLES.ADMIN,
                  title: 'Super Admin',
                  desc: 'Access systems command control panels.',
                  icon: <ShieldAlert className="h-5 w-5" />,
                  color: 'border-status-error hover:bg-status-error/5',
                  activeBg: 'bg-status-error/10 text-status-error border-status-error',
                },
              ].map((r) => {
                const isActive = selectedRole === r.role;
                return (
                  <motion.button
                    key={r.role}
                    onClick={() => handleRoleSelect(r.role)}
                    variants={buttonPress}
                    whileTap="whileTap"
                    whileHover="whileHover"
                    className={cn(
                      "w-full text-left p-4 rounded-xl border flex items-center gap-4 transition-all cursor-pointer",
                      isActive ? r.activeBg : "border-border-primary bg-bg-secondary hover:border-text-secondary"
                    )}
                  >
                    <div className="flex-shrink-0 p-2.5 rounded-lg bg-bg-tertiary">
                      {r.icon}
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-text-primary leading-none mb-1">{r.title}</h3>
                      <p className="text-xs text-text-secondary leading-normal">{r.desc}</p>
                    </div>
                  </motion.button>
                );
              })}
            </div>
          </div>

          <button
            onClick={handleGetStarted}
            disabled={!selectedRole}
            className="w-full mt-8 py-3.5 rounded-xl bg-brand-emerald text-white hover:bg-brand-emerald-hover font-semibold text-sm transition-all focus:ring-2 focus:ring-brand-emerald focus:ring-offset-2 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Continue
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default OnboardingScreen;

import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/auth-store';
import { ProfileCompletionForm } from './ProfileCompletionForm';

export const ProfileSetupScreen: React.FC = () => {
  const { user, activeRole } = useAuthStore();
  const navigate = useNavigate();

  // If user is already onboarding, or session is cleared, route accordingly
  useEffect(() => {
    if (!user) {
      navigate('/welcome');
      return;
    }

    if (user.isProfileComplete || user.fullName || user.role === 'ADMIN') {
      redirectToDashboard(user.role);
    }
  }, [user, navigate]);

  const handleSetupComplete = () => {
    if (activeRole) {
      redirectToDashboard(activeRole);
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

  if (!user || !activeRole) return null;

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-bg-primary p-4 py-8">
      <ProfileCompletionForm role={activeRole} onSetupComplete={handleSetupComplete} />
    </div>
  );
};

export default ProfileSetupScreen;

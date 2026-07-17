import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User, Address } from '../../../types';
import type { UserRole } from '../../../core/config/constants';

interface AuthState {
  user: User | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  activeRole: UserRole | null;
  setSession: (user: User, token: string) => void;
  clearSession: () => void;
  updateWalletBalance: (newBalance: number) => void;
  addSavedAddress: (address: Address) => void;
  setActiveRole: (role: UserRole) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      isAuthenticated: false,
      activeRole: null,
      
      setSession: (user, token) => set({
        user,
        accessToken: token,
        isAuthenticated: true,
        activeRole: user.role,
      }),
      
      clearSession: () => {
        // Fire-and-forget backend logout to revoke refresh token and clear cookie
        import('../services/auth-service').then(({ authService }) => {
          authService.logout().catch(() => {});
        });
        set({
          user: null,
          accessToken: null,
          isAuthenticated: false,
          activeRole: null,
        });
      },
      
      updateWalletBalance: (newBalance) => set((state) => ({
        user: state.user ? { ...state.user, walletBalance: newBalance } : null,
      })),
      
      addSavedAddress: (address) => set((state) => ({
        user: state.user 
          ? { ...state.user, savedAddresses: [...(state.user.savedAddresses || []), address] } 
          : null,
      })),
      
      setActiveRole: (role) => set({ activeRole: role }),
    }),
    {
      name: 'aether-auth-storage',
      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
        isAuthenticated: state.isAuthenticated,
        activeRole: state.activeRole,
      }),
    }
  )
);

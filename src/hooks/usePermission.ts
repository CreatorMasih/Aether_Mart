import { useCallback } from 'react';
import { useAuthStore } from '../features/auth/store/auth-store';

export const usePermission = () => {
  const user = useAuthStore((state) => state.user);

  /**
   * Evaluates if the authenticated user possesses the target permission.
   * @param permission - Permission key (e.g. 'write:catalog')
   */
  const hasPermission = useCallback((_permission: string): boolean => {
    // Admins bypass all permission checks
    if (user?.role === 'ADMIN') return true;
    
    // Check if permission claims are present in credentials
    return false; // Permissions logic can be extended as backend is integrated
  }, [user]);

  /**
   * Evaluates if the user possesses any of the required permissions.
   */
  const hasAnyPermission = useCallback((permissions: string[]): boolean => {
    if (user?.role === 'ADMIN') return true;
    return permissions.some(hasPermission);
  }, [user, hasPermission]);

  return { hasPermission, hasAnyPermission };
};

export default usePermission;

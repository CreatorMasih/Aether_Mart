import React from 'react';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { routes } from './routes';
import { useAuthStore } from '../features/auth/store/auth-store';

const router = createBrowserRouter(routes);

export const AppRouter: React.FC = () => {
  React.useEffect(() => {
    const { isAuthenticated, accessToken, setSession, clearSession } = useAuthStore.getState();
    if (isAuthenticated && accessToken) {
      import('../features/auth/services/auth-service').then(({ authService }) => {
        authService.getCurrentUser()
          .then((freshUser) => {
            if (freshUser && freshUser.id) {
              setSession(freshUser, accessToken);
            }
          })
          .catch((err) => {
            console.warn('Session restoration validation failed:', err);
            // If token is invalid or unauthenticated, clear session
            if (err?.status === 401 || err?.status === 403) {
              clearSession();
            }
          });
      }).catch(console.error);
    }
  }, []);

  return <RouterProvider router={router} />;
};

export default AppRouter;

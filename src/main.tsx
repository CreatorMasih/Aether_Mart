import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';

// Platform Providers
import { QueryProvider } from './core/network/QueryProvider';
import { ThemeProvider } from './core/theme/ThemeProvider';
import { ToastProvider } from './context/ToastProvider';
import { ErrorBoundary } from './components/ui/ErrorBoundary';
import { AppRouter } from './router';
import { useAuthStore } from './features/auth/store/auth-store';

// Synchronize logout across multiple browser tabs
window.addEventListener('storage', (event) => {
  if (event.key === 'aether-auth-storage' && !event.newValue) {
    useAuthStore.getState().clearSession();
    window.location.href = '/';
  }
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <QueryProvider>
        <ThemeProvider>
          <ToastProvider>
            <AppRouter />
          </ToastProvider>
        </ThemeProvider>
      </QueryProvider>
    </ErrorBoundary>
  </StrictMode>
);

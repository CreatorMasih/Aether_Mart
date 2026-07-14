import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';

// Platform Providers
import { QueryProvider } from './core/network/QueryProvider';
import { ThemeProvider } from './core/theme/ThemeProvider';
import { ToastProvider } from './context/ToastProvider';
import { ErrorBoundary } from './components/ui/ErrorBoundary';
import { AppRouter } from './router';

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

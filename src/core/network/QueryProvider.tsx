import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (failureCount, error: any) => {
        // Avoid retrying on 4xx client / auth / rate-limit errors
        if (error?.status && error.status >= 400 && error.status < 500) {
          return false;
        }
        return failureCount < 2;
      },
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
      refetchOnWindowFocus: false, // Prevents aggressive background refreshes
      staleTime: 1000 * 60 * 5, // 5 minutes fresh time
      gcTime: 1000 * 60 * 10, // 10 minutes garbage collection time
    },
    mutations: {
      retry: false, // DO NOT automatically retry POST/PUT/DELETE mutations on failure
    },
  },
});

interface QueryProviderProps {
  children: React.ReactNode;
}

export const QueryProvider: React.FC<QueryProviderProps> = ({ children }) => {
  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
};

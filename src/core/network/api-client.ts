import axios, { AxiosError } from 'axios';
import type { AxiosInstance, InternalAxiosRequestConfig } from 'axios';
import { useAuthStore } from '../../features/auth/store/auth-store';

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL as string) || 'http://localhost:5000/api';

export const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
});

// Request Interceptor: Attach JWT Access Token
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = useAuthStore.getState().accessToken;
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error: AxiosError) => {
    return Promise.reject(error);
  }
);

// Response Interceptor: Manage token refresh and unified error mapping
apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };
    
    // Do not attempt token refresh for auth endpoints to prevent loops
    const isAuthEndpoint = originalRequest?.url?.includes('/auth/login') || 
                           originalRequest?.url?.includes('/auth/verify-otp') ||
                           originalRequest?.url?.includes('/auth/google-login') ||
                           originalRequest?.url?.includes('/auth/refresh');

    // Check if error is 401 (Unauthorized) and we haven't retried yet
    if (error.response?.status === 401 && !originalRequest._retry && !isAuthEndpoint) {
      originalRequest._retry = true;
      
      try {
        // Enforce session refresh endpoint request
        const response = await axios.post(
          `${API_BASE_URL}/auth/refresh`,
          {},
          { withCredentials: true } // Cookie contains the refresh token
        );
        
        const newAccessToken = (response.data as any)?.data?.accessToken || (response.data as any)?.accessToken;
        const currentUser = useAuthStore.getState().user;
        
        if (newAccessToken) {
          // Fetch fresh user profile from backend to ensure strict role and session alignment
          try {
            const meRes = await axios.get(`${API_BASE_URL}/auth/me`, {
              headers: { Authorization: `Bearer ${newAccessToken}` },
              withCredentials: true,
            });
            const freshUser = meRes.data?.data;
            if (freshUser) {
              useAuthStore.getState().setSession(freshUser, newAccessToken);
            } else if (currentUser) {
              useAuthStore.getState().setSession(currentUser, newAccessToken);
            }
          } catch {
            if (currentUser) {
              useAuthStore.getState().setSession(currentUser, newAccessToken);
            }
          }
          
          if (originalRequest.headers) {
            originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
          }
          return apiClient(originalRequest);
        }
      } catch (refreshError) {
        // Refresh token failed -> Force user logout
        useAuthStore.getState().clearSession();
        window.location.href = '/auth';
        return Promise.reject(refreshError);
      }
    }
    
    // Map backend errors to structured frontend errors
    const errorData: any = error.response?.data;
    const mappedError = {
      message: errorData?.message || 'An unexpected connection error occurred.',
      status: error.response?.status || 500,
      code: errorData?.code || 'NETWORK_ERROR',
      details: errorData?.details || null,
    };
    
    return Promise.reject(mappedError);
  }
);

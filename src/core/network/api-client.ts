import axios, { AxiosError } from 'axios';
import type { AxiosInstance, InternalAxiosRequestConfig } from 'axios';
import { useAuthStore } from '../../features/auth/store/auth-store';

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL as string) || 'http://localhost:5000/api';

export const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
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
    
    // Check if error is 401 (Unauthorized) and we haven't retried yet
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      
      try {
        // Enforce session refresh endpoint request
        const response = await axios.post<{ accessToken: string }>(
          `${API_BASE_URL}/auth/refresh`,
          {},
          { withCredentials: true } // Cookie contains the refresh token
        );
        
        const newAccessToken = response.data.accessToken;
        const user = useAuthStore.getState().user;
        
        if (newAccessToken && user) {
          useAuthStore.getState().setSession(user, newAccessToken);
          
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

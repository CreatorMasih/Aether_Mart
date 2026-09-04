import axios, { AxiosError } from 'axios';
import type { AxiosInstance, InternalAxiosRequestConfig } from 'axios';
import { useAuthStore } from '../../features/auth/store/auth-store';

const API_BASE_URL = 
  (import.meta.env.VITE_API_BASE_URL as string) || 
  (import.meta.env.VITE_API_URL as string) || 
  'http://localhost:5000/api';

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

let isRefreshing = false;
let failedQueue: Array<{
  resolve: (token: string) => void;
  reject: (error: any) => void;
}> = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token!);
    }
  });
  failedQueue = [];
};

// Response Interceptor: Manage token refresh and unified error mapping
apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };
    const requestUrl = originalRequest?.url || '';
    
    // Exclude auth & session endpoints to prevent infinite refresh loops
    const isAuthEndpoint = requestUrl.includes('/auth/send-otp') ||
                           requestUrl.includes('/auth/verify-otp') ||
                           requestUrl.includes('/auth/google-login') ||
                           requestUrl.includes('/auth/refresh') ||
                           requestUrl.includes('/auth/config') ||
                           requestUrl.includes('/auth/logout');

    // Strictly handle 401 Unauthorized (never 429, 400, 403, 422, 409)
    if (error.response?.status === 401 && !originalRequest._retry && !isAuthEndpoint) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            if (originalRequest.headers) {
              originalRequest.headers.Authorization = `Bearer ${token}`;
            }
            originalRequest._retry = true; // Prevent infinite loop if retried request receives 401 again
            return apiClient(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;
      
      try {
        const response = await axios.post(
          `${API_BASE_URL}/auth/refresh`,
          {},
          { withCredentials: true }
        );
        
        const newAccessToken = (response.data as any)?.data?.accessToken || (response.data as any)?.accessToken;
        const currentUser = useAuthStore.getState().user;
        
        if (newAccessToken) {
          if (currentUser) {
            useAuthStore.getState().setSession(currentUser, newAccessToken);
          }
          
          processQueue(null, newAccessToken);
          isRefreshing = false;

          if (originalRequest.headers) {
            originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
          }
          return apiClient(originalRequest);
        } else {
          throw new Error('No access token returned from refresh');
        }
      } catch (refreshError) {
        processQueue(refreshError, null);
        isRefreshing = false;

        // Refresh token invalid/expired -> Clear session safely without forced redirect loop
        const wasAuth = useAuthStore.getState().isAuthenticated;
        useAuthStore.getState().clearSession();
        
        if (wasAuth && !window.location.pathname.startsWith('/c/')) {
          window.location.href = '/auth';
        }
        return Promise.reject(refreshError);
      }
    }
    
    // Map backend errors to structured frontend errors
    const responseData = error.response?.data as any;
    const errorData: any = responseData?.error || responseData;
    const retryAfterHeader = error.response?.headers?.['retry-after'];
    const parsedHeaderSec = retryAfterHeader ? parseInt(String(retryAfterHeader), 10) : undefined;
    const retryAfterSeconds = errorData?.details?.retryAfterSeconds || (parsedHeaderSec && !isNaN(parsedHeaderSec) ? parsedHeaderSec : undefined);

    const mappedError = {
      message: errorData?.message || (error.response?.status === 429 ? 'Too many requests. Please try again later.' : 'An unexpected connection error occurred.'),
      status: error.response?.status || 500,
      code: errorData?.code || (error.response?.status === 429 ? 'RATE_LIMIT_EXCEEDED' : 'NETWORK_ERROR'),
      details: errorData?.details || null,
      retryAfterSeconds: retryAfterSeconds && typeof retryAfterSeconds === 'number' ? retryAfterSeconds : undefined,
    };
    
    return Promise.reject(mappedError);
  }
);

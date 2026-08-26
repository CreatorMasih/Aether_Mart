import axios, { AxiosError } from 'axios';

export interface AppError {
  message: string;
  status: number;
  code: string;
  details?: Record<string, string[]> | null;
  raw?: Error;
}

export const parseApiError = (error: unknown): AppError => {
  if (axios.isAxiosError(error)) {
    const axiosError = error as AxiosError<any>;
    const status = axiosError.response?.status || 500;
    const data = axiosError.response?.data;

    // Classify HTTP error ranges
    if (status === 401) {
      return {
        message: 'Your session has expired. Please log in again.',
        status,
        code: 'UNAUTHORIZED',
        raw: axiosError,
      };
    }

    if (status === 403) {
      return {
        message: 'You do not have permission to perform this action.',
        status,
        code: 'FORBIDDEN',
        raw: axiosError,
      };
    }

    if (status === 404) {
      return {
        message: data?.message || 'Requested resource could not be found.',
        status,
        code: 'NOT_FOUND',
        raw: axiosError,
      };
    }

    if (status === 422 || status === 400) {
      return {
        message: data?.message || 'Please check your inputs and try again.',
        status,
        code: 'VALIDATION_ERROR',
        details: data?.errors || null,
        raw: axiosError,
      };
    }

    return {
      message: data?.message || 'A network error occurred. Please check your connection.',
      status,
      code: data?.code || 'API_ERROR',
      raw: axiosError,
    };
  }

  // Handle custom mapped API error objects
  if (error && typeof error === 'object' && 'code' in error) {
    const customErr = error as any;
    if (customErr.code === 'TOKEN_MISSING' || customErr.status === 401) {
      return {
        message: 'Please log in to continue.',
        status: 401,
        code: 'TOKEN_MISSING',
        details: customErr.details,
      };
    }
    return {
      message: customErr.message || 'A network error occurred. Please check your connection.',
      status: customErr.status || 500,
      code: customErr.code || 'API_ERROR',
      details: customErr.details,
    };
  }

  const standardError = error instanceof Error ? error : new Error('An unknown error occurred.');
  return {
    message: standardError.message,
    status: 500,
    code: 'UNKNOWN_ERROR',
    raw: standardError,
  };
};

import { apiClient } from './api-client';
import { parseApiError } from './api-error-parser';

export interface QueryOptions {
  limit?: number;
  offset?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  filters?: Record<string, string | number | boolean | string[]>;
}

export interface PagedResponse<T> {
  items: T[];
  total: number;
  limit: number;
  offset: number;
}

/**
 * Base Repository providing template operations and central error handling wrappers.
 */
export abstract class BaseRepository {
  protected client = apiClient;

  /**
   * Safely execute an asynchronous request wrapping its exceptions in our typed AppError format.
   */
  protected async executeRequest<T>(requestFn: () => Promise<T>): Promise<T> {
    try {
      return await requestFn();
    } catch (error) {
      throw parseApiError(error);
    }
  }
}

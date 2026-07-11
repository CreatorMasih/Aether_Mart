import { Request } from 'express';
import { PaginationMeta } from './response.util';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface PaginationOptions {
  page: number;
  limit: number;
  skip: number;
}

export interface PaginationQuery {
  page?: string | number;
  limit?: string | number;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Extract and normalize pagination options from an Express request.
 * Handles string-to-number conversion and enforces max limits.
 */
export function parsePaginationQuery(req: Request): PaginationOptions {
  const rawPage = Number(req.query.page) || DEFAULT_PAGE;
  const rawLimit = Number(req.query.limit) || DEFAULT_LIMIT;

  const page = Math.max(1, Math.floor(rawPage));
  const limit = Math.min(MAX_LIMIT, Math.max(1, Math.floor(rawLimit)));
  const skip = (page - 1) * limit;

  return { page, limit, skip };
}

/**
 * Build pagination meta object for inclusion in API responses.
 */
export function buildMeta(total: number, page: number, limit: number): PaginationMeta {
  const totalPages = total === 0 ? 0 : Math.ceil(total / limit);
  return {
    page,
    limit,
    total,
    totalPages,
    hasNextPage: page < totalPages,
    hasPrevPage: page > 1,
  };
}

/**
 * Parse sort query parameters into Prisma-compatible orderBy format.
 * e.g., `?sortBy=price&sortOrder=asc` → { price: 'asc' }
 *
 * @param req - Express request
 * @param allowedFields - Whitelist of sortable field names
 * @param defaultSort - Default sort if query is absent
 */
export function parseSortQuery(
  req: Request,
  allowedFields: string[],
  defaultSort: Record<string, 'asc' | 'desc'> = { createdAt: 'desc' }
): Record<string, 'asc' | 'desc'> {
  const sortBy = req.query.sortBy as string | undefined;
  const sortOrder = (req.query.sortOrder as string | undefined)?.toLowerCase();

  if (!sortBy || !allowedFields.includes(sortBy)) {
    return defaultSort;
  }

  const order: 'asc' | 'desc' = sortOrder === 'asc' ? 'asc' : 'desc';
  return { [sortBy]: order };
}

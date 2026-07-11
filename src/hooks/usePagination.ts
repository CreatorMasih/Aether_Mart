import { useState, useCallback, useMemo } from 'react';

interface PaginationConfig {
  initialPage?: number;
  initialLimit?: number;
  totalItems: number;
}

interface PaginationResult {
  page: number;
  limit: number;
  totalPages: number;
  offset: number;
  setPage: (page: number) => void;
  nextPage: () => void;
  prevPage: () => void;
  setLimit: (limit: number) => void;
  hasPreviousPage: boolean;
  hasNextPage: boolean;
}

export const usePagination = ({
  initialPage = 1,
  initialLimit = 10,
  totalItems,
}: PaginationConfig): PaginationResult => {
  const [page, setPageState] = useState<number>(initialPage);
  const [limit, setLimitState] = useState<number>(initialLimit);

  const totalPages = useMemo(() => {
    return Math.max(1, Math.ceil(totalItems / limit));
  }, [totalItems, limit]);

  const offset = useMemo(() => {
    return (page - 1) * limit;
  }, [page, limit]);

  const setPage = useCallback((newPage: number) => {
    setPageState(Math.max(1, Math.min(newPage, totalPages)));
  }, [totalPages]);

  const nextPage = useCallback(() => {
    setPage(page + 1);
  }, [page, setPage]);

  const prevPage = useCallback(() => {
    setPage(page - 1);
  }, [page, setPage]);

  const setLimit = useCallback((newLimit: number) => {
    setLimitState(newLimit);
    setPageState(1); // Reset to first page when limit changes
  }, []);

  const hasPreviousPage = page > 1;
  const hasNextPage = page < totalPages;

  return {
    page,
    limit,
    totalPages,
    offset,
    setPage,
    nextPage,
    prevPage,
    setLimit,
    hasPreviousPage,
    hasNextPage,
  };
};

export default usePagination;

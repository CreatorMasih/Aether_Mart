import { useEffect, useRef, useCallback } from 'react';

interface InfiniteScrollOptions {
  loadMore: () => void;
  hasMore: boolean;
  loading: boolean;
  rootMargin?: string;
  threshold?: number;
}

export const useInfiniteScroll = ({
  loadMore,
  hasMore,
  loading,
  rootMargin = '100px',
  threshold = 0.1,
}: InfiniteScrollOptions) => {
  const observerRef = useRef<IntersectionObserver | null>(null);
  const triggerRef = useRef<HTMLDivElement | null>(null);

  const handleIntersect = useCallback(
    (entries: IntersectionObserverEntry[]) => {
      const target = entries[0];
      if (target.isIntersecting && hasMore && !loading) {
        loadMore();
      }
    },
    [loadMore, hasMore, loading]
  );

  useEffect(() => {
    const trigger = triggerRef.current;
    if (!trigger) return;

    if (observerRef.current) observerRef.current.disconnect();

    observerRef.current = new IntersectionObserver(handleIntersect, {
      rootMargin,
      threshold,
    });

    observerRef.current.observe(trigger);

    return () => {
      if (observerRef.current) observerRef.current.disconnect();
    };
  }, [handleIntersect, rootMargin, threshold]);

  return { triggerRef };
};

export default useInfiniteScroll;

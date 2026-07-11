import { useEffect, useRef, useCallback } from 'react';

/**
 * Returns a callback that returns true if the component is currently mounted.
 * Useful to avoid calling setState on unmounted components after asynchronous operations.
 */
export const useMounted = (): (() => boolean) => {
  const mountedRef = useRef<boolean>(false);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const isMounted = useCallback(() => mountedRef.current, []);

  return isMounted;
};

export default useMounted;

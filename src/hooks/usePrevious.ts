import { useEffect, useRef } from 'react';

/**
 * Returns the value of a state or prop from the previous render cycle.
 * @param value - State or prop value to track
 */
export function usePrevious<T>(value: T): T | undefined {
  const ref = useRef<T>(undefined);

  useEffect(() => {
    ref.current = value;
  }, [value]);

  return ref.current;
}

export default usePrevious;

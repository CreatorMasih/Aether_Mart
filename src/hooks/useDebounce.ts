import { useState, useEffect } from 'react';

/**
 * Returns a debounced version of the provided value that delays updating until a timeout has elapsed.
 * @param value - The input value to debounce
 * @param delay - Delay duration in milliseconds
 */
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

export default useDebounce;

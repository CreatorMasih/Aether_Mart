import { useState, useEffect } from 'react';

/**
 * Reusable hook to monitor media query match status in React components
 * @param query - Media query string (e.g. "(min-width: 768px)")
 */
export const useMediaQuery = (query: string): boolean => {
  const [matches, setMatches] = useState<boolean>(() => {
    // Avoid SSR crashes if window is undefined
    if (typeof window === 'undefined') return false;
    return window.matchMedia(query).matches;
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const media = window.matchMedia(query);
    const listener = (event: MediaQueryListEvent) => {
      setMatches(event.matches);
    };

    // Modern matchMedia listener API
    media.addEventListener('change', listener);
    setMatches(media.matches);

    return () => {
      media.removeEventListener('change', listener);
    };
  }, [query]);

  return matches;
};

export default useMediaQuery;

import React, { useState, useEffect } from 'react';
import { ThemeContext } from './ThemeContext';
import { STORAGE_KEYS, THEMES } from '../config/constants';
import type { ThemeType } from '../config/constants';

interface ThemeProviderProps {
  children: React.ReactNode;
  defaultTheme?: ThemeType;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({
  children,
  defaultTheme = THEMES.SYSTEM,
}) => {
  const [theme, setThemeState] = useState<ThemeType>(() => {
    if (typeof window === 'undefined') return defaultTheme;
    const saved = localStorage.getItem(STORAGE_KEYS.THEME) as ThemeType;
    if (saved === THEMES.LIGHT || saved === THEMES.DARK || saved === THEMES.SYSTEM) return saved;
    return defaultTheme;
  });

  useEffect(() => {
    const root = window.document.documentElement;
    
    const applyTheme = (currentTheme: ThemeType) => {
      root.classList.remove(THEMES.LIGHT, THEMES.DARK);
      
      if (currentTheme === THEMES.SYSTEM) {
        const systemIsDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        root.classList.add(systemIsDark ? THEMES.DARK : THEMES.LIGHT);
      } else {
        root.classList.add(currentTheme);
      }
    };

    applyTheme(theme);
    localStorage.setItem(STORAGE_KEYS.THEME, theme);

    // Listen for system theme adjustments if using system setting
    if (theme === THEMES.SYSTEM) {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const listener = (e: MediaQueryListEvent) => {
        root.classList.remove(THEMES.LIGHT, THEMES.DARK);
        root.classList.add(e.matches ? THEMES.DARK : THEMES.LIGHT);
      };
      
      mediaQuery.addEventListener('change', listener);
      return () => {
        mediaQuery.removeEventListener('change', listener);
      };
    }
  }, [theme]);

  const toggleTheme = () => {
    setThemeState((prev) => {
      if (prev === THEMES.LIGHT) return THEMES.DARK;
      if (prev === THEMES.DARK) return THEMES.SYSTEM;
      return THEMES.LIGHT;
    });
  };

  const setTheme = (newTheme: ThemeType) => {
    setThemeState(newTheme);
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

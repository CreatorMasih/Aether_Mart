import React, { useEffect } from 'react';
import { ThemeContext } from './ThemeContext';
import { STORAGE_KEYS, THEMES } from '../config/constants';
import type { ThemeType } from '../config/constants';

interface ThemeProviderProps {
  children: React.ReactNode;
  defaultTheme?: ThemeType;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({
  children,
}) => {
  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove(THEMES.DARK);
    root.classList.add(THEMES.LIGHT);
    localStorage.setItem(STORAGE_KEYS.THEME, THEMES.LIGHT);
  }, []);

  return (
    <ThemeContext.Provider value={{ theme: THEMES.LIGHT, toggleTheme: () => {}, setTheme: () => {} }}>
      {children}
    </ThemeContext.Provider>
  );
};

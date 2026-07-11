import { createContext } from 'react';
import type { ThemeType } from '../config/constants';

export interface ThemeContextProps {
  theme: ThemeType;
  toggleTheme: () => void;
  setTheme: (theme: ThemeType) => void;
}

export const ThemeContext = createContext<ThemeContextProps | undefined>(undefined);

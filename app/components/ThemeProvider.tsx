'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import {
  applyBrowserThemeMode,
  getStoredThemeMode,
  isThemeMode,
  THEME_STORAGE_KEY,
  type ThemeMode,
} from '@/lib/browser-utils';

interface ThemeContextValue {
  themeMode: ThemeMode;
  isDark: boolean;
  setThemeMode: (mode: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [themeMode, setThemeModeState] = useState<ThemeMode>('system');
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    const syncTheme = () => {
      const nextMode = getStoredThemeMode();
      setThemeModeState(nextMode);
      setIsDark(applyBrowserThemeMode(nextMode));
    };

    syncTheme();

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleSystemThemeChange = () => {
      if (getStoredThemeMode() === 'system') syncTheme();
    };
    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === THEME_STORAGE_KEY) syncTheme();
    };

    mediaQuery.addEventListener('change', handleSystemThemeChange);
    window.addEventListener('storage', handleStorageChange);
    return () => {
      mediaQuery.removeEventListener('change', handleSystemThemeChange);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  const setThemeMode = useCallback((nextMode: ThemeMode) => {
    if (typeof window === 'undefined' || !isThemeMode(nextMode)) return;

    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, nextMode);
    } catch {
      // The visual preference still applies when storage is unavailable.
    }
    setThemeModeState(nextMode);
    setIsDark(applyBrowserThemeMode(nextMode));
  }, []);

  const value = useMemo(() => ({ themeMode, isDark, setThemeMode }), [themeMode, isDark, setThemeMode]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme deve essere usato dentro ThemeProvider.');
  return context;
}

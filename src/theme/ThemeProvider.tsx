import type { JSX } from 'react';
import { useColorScheme as useDeviceScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import {
  Theme,
  DarkTheme as NavDarkTheme,
  DefaultTheme as NavLightTheme,
} from '@react-navigation/native';

type ThemeMode = 'light' | 'dark';

type ThemeContextValue = {
  mode: ThemeMode;
  toggle: () => void;
  navTheme: Theme;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

const STORAGE_KEY = 'theme:mode';

export const useAppTheme = (): ThemeContextValue => {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useAppTheme must be used within ThemeProvider');
  return ctx;
};

export const ThemeProvider = ({
  children,
}: {
  children: React.ReactNode;
}): JSX.Element => {
  const device = useDeviceScheme();
  const [mode, setMode] = useState<ThemeMode>(
    device === 'dark' ? 'dark' : 'light'
  );

  useEffect(() => {
    (async () => {
      try {
        const saved = await AsyncStorage.getItem(STORAGE_KEY);
        if (saved === 'light' || saved === 'dark') setMode(saved);
      } catch {}
    })();
  }, []);

  useEffect(() => {
    AsyncStorage.setItem(STORAGE_KEY, mode).catch(() => {});
  }, [mode]);

  const navTheme = useMemo(
    () => (mode === 'dark' ? NavDarkTheme : NavLightTheme),
    [mode]
  );

  const theme = useMemo(
    () => ({
      mode,
      toggle: () => setMode((m) => (m === 'light' ? 'dark' : 'light')),
      navTheme,
    }),
    [mode, navTheme]
  );

  return (
    <ThemeContext.Provider value={theme}>{children}</ThemeContext.Provider>
  );
};

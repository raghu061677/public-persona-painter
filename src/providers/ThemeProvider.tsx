import { useEffect } from 'react';
import { useThemeStore } from '@/store/themeStore';

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { theme } = useThemeStore();

  useEffect(() => {
    // Apply theme to document root
    document.documentElement.className = theme;
  }, [theme]);

  return <>{children}</>;
}

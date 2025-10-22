import { create } from 'zustand';

type Theme = 'light' | 'dark' | 'brand-blue' | 'brand-green';

interface ThemeState {
  theme: Theme;
  setTheme: (theme: Theme) => void;
}

export const useThemeStore = create<ThemeState>((set) => ({
  theme: (localStorage.getItem('theme') as Theme) || 'light',
  setTheme: (theme) => {
    localStorage.setItem('theme', theme);
    set({ theme });
    document.documentElement.className = theme;
  },
}));

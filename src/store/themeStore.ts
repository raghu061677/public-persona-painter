import { create } from 'zustand';

type Theme = 'light' | 'dark' | 'brand-blue' | 'brand-green';
type FontFamily = 'inter' | 'poppins' | 'roboto' | 'open-sans' | 'lato' | 'montserrat' | 'nunito' | 'work-sans';
type FontSize = 'small' | 'medium' | 'large' | 'extra-large';

interface CardColorScheme {
  client: string;
  campaign: string;
  financial: string;
  secondary: string;
}

interface ThemeState {
  theme: Theme;
  fontFamily: FontFamily;
  fontSize: FontSize;
  cardColors: CardColorScheme;
  setTheme: (theme: Theme) => void;
  setFontFamily: (font: FontFamily) => void;
  setFontSize: (size: FontSize) => void;
  setCardColors: (colors: CardColorScheme) => void;
}

const defaultCardColors: CardColorScheme = {
  client: 'blue',
  campaign: 'green',
  financial: 'orange',
  secondary: 'purple',
};

const fontSizeMap = {
  'small': '14px',
  'medium': '16px',
  'large': '18px',
  'extra-large': '20px',
};

const applyFontFamily = (font: FontFamily) => {
  const fontMap: Record<FontFamily, string> = {
    'inter': 'Inter, sans-serif',
    'poppins': 'Poppins, sans-serif',
    'roboto': 'Roboto, sans-serif',
    'open-sans': 'Open Sans, sans-serif',
    'lato': 'Lato, sans-serif',
    'montserrat': 'Montserrat, sans-serif',
    'nunito': 'Nunito, sans-serif',
    'work-sans': 'Work Sans, sans-serif',
  };
  document.documentElement.style.setProperty('--font-family', fontMap[font]);
};

const applyFontSize = (size: FontSize) => {
  document.documentElement.style.setProperty('--base-font-size', fontSizeMap[size]);
};

export const useThemeStore = create<ThemeState>((set) => ({
  theme: (localStorage.getItem('theme') as Theme) || 'light',
  fontFamily: (localStorage.getItem('fontFamily') as FontFamily) || 'inter',
  fontSize: (localStorage.getItem('fontSize') as FontSize) || 'medium',
  cardColors: JSON.parse(localStorage.getItem('cardColors') || JSON.stringify(defaultCardColors)),
  
  setTheme: (theme) => {
    localStorage.setItem('theme', theme);
    set({ theme });
    document.documentElement.className = theme;
  },
  
  setFontFamily: (font) => {
    localStorage.setItem('fontFamily', font);
    applyFontFamily(font);
    set({ fontFamily: font });
  },
  
  setFontSize: (size) => {
    localStorage.setItem('fontSize', size);
    applyFontSize(size);
    set({ fontSize: size });
  },
  
  setCardColors: (colors) => {
    localStorage.setItem('cardColors', JSON.stringify(colors));
    set({ cardColors: colors });
  },
}));

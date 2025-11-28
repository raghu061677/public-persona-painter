/**
 * Premium Theme System for Go-Ads 360°
 * 
 * 5 Professional Themes:
 * 1. Luxury Gold - Premium black with gold accents
 * 2. Cosmic Blue - Deep space with neon cyan
 * 3. Corporate - Clean white/gray business
 * 4. Business Dark - Professional dark mode
 * 5. Billboard Black - OOH media inspired
 */

export interface Theme {
  name: string;
  id: string;
  colors: {
    // Base colors
    background: string;
    foreground: string;
    card: string;
    cardForeground: string;
    popover: string;
    popoverForeground: string;
    
    // Primary colors
    primary: string;
    primaryForeground: string;
    
    // Secondary colors
    secondary: string;
    secondaryForeground: string;
    
    // Muted colors
    muted: string;
    mutedForeground: string;
    
    // Accent colors
    accent: string;
    accentForeground: string;
    
    // Destructive colors
    destructive: string;
    destructiveForeground: string;
    
    // Border and input
    border: string;
    input: string;
    ring: string;
    
    // Radius
    radius: string;
  };
}

export const themes: Record<string, Theme> = {
  luxuryGold: {
    name: "Luxury Gold",
    id: "luxury-gold",
    colors: {
      background: "0 0% 7%",
      foreground: "48 96% 89%",
      card: "0 0% 10%",
      cardForeground: "48 96% 89%",
      popover: "0 0% 10%",
      popoverForeground: "48 96% 89%",
      primary: "45 100% 50%",
      primaryForeground: "0 0% 0%",
      secondary: "45 80% 40%",
      secondaryForeground: "0 0% 100%",
      muted: "0 0% 15%",
      mutedForeground: "48 96% 75%",
      accent: "43 100% 60%",
      accentForeground: "0 0% 0%",
      destructive: "0 84% 60%",
      destructiveForeground: "0 0% 98%",
      border: "45 50% 30%",
      input: "45 50% 25%",
      ring: "45 100% 50%",
      radius: "1rem",
    },
  },
  cosmicBlue: {
    name: "Cosmic Blue",
    id: "cosmic-blue",
    colors: {
      background: "220 40% 8%",
      foreground: "180 100% 90%",
      card: "220 35% 10%",
      cardForeground: "180 100% 90%",
      popover: "220 35% 10%",
      popoverForeground: "180 100% 90%",
      primary: "180 100% 50%",
      primaryForeground: "220 40% 8%",
      secondary: "210 100% 40%",
      secondaryForeground: "0 0% 100%",
      muted: "220 30% 15%",
      mutedForeground: "180 100% 75%",
      accent: "190 100% 60%",
      accentForeground: "220 40% 8%",
      destructive: "0 84% 60%",
      destructiveForeground: "0 0% 98%",
      border: "180 50% 30%",
      input: "180 50% 25%",
      ring: "180 100% 50%",
      radius: "0.75rem",
    },
  },
  corporate: {
    name: "Corporate",
    id: "corporate",
    colors: {
      background: "0 0% 100%",
      foreground: "222.2 84% 4.9%",
      card: "0 0% 100%",
      cardForeground: "222.2 84% 4.9%",
      popover: "0 0% 100%",
      popoverForeground: "222.2 84% 4.9%",
      primary: "221.2 83.2% 53.3%",
      primaryForeground: "210 40% 98%",
      secondary: "210 40% 96.1%",
      secondaryForeground: "222.2 47.4% 11.2%",
      muted: "210 40% 96.1%",
      mutedForeground: "215.4 16.3% 46.9%",
      accent: "210 40% 96.1%",
      accentForeground: "222.2 47.4% 11.2%",
      destructive: "0 84.2% 60.2%",
      destructiveForeground: "210 40% 98%",
      border: "214.3 31.8% 91.4%",
      input: "214.3 31.8% 91.4%",
      ring: "221.2 83.2% 53.3%",
      radius: "0.5rem",
    },
  },
  businessDark: {
    name: "Business Dark",
    id: "business-dark",
    colors: {
      background: "222.2 84% 4.9%",
      foreground: "210 40% 98%",
      card: "222.2 84% 7%",
      cardForeground: "210 40% 98%",
      popover: "222.2 84% 7%",
      popoverForeground: "210 40% 98%",
      primary: "142 76% 36%",
      primaryForeground: "356 29% 98%",
      secondary: "217.2 32.6% 17.5%",
      secondaryForeground: "210 40% 98%",
      muted: "217.2 32.6% 17.5%",
      mutedForeground: "215 20.2% 65.1%",
      accent: "217.2 32.6% 17.5%",
      accentForeground: "210 40% 98%",
      destructive: "0 62.8% 30.6%",
      destructiveForeground: "210 40% 98%",
      border: "217.2 32.6% 17.5%",
      input: "217.2 32.6% 17.5%",
      ring: "142 76% 36%",
      radius: "0.5rem",
    },
  },
  billboardBlack: {
    name: "Billboard Black",
    id: "billboard-black",
    colors: {
      background: "0 0% 0%",
      foreground: "60 100% 90%",
      card: "0 0% 5%",
      cardForeground: "60 100% 90%",
      popover: "0 0% 5%",
      popoverForeground: "60 100% 90%",
      primary: "40 100% 50%",
      primaryForeground: "0 0% 0%",
      secondary: "30 100% 45%",
      secondaryForeground: "0 0% 100%",
      muted: "0 0% 10%",
      mutedForeground: "60 100% 75%",
      accent: "48 100% 55%",
      accentForeground: "0 0% 0%",
      destructive: "0 84% 60%",
      destructiveForeground: "0 0% 98%",
      border: "40 50% 30%",
      input: "40 50% 20%",
      ring: "40 100% 50%",
      radius: "0.875rem",
    },
  },
};

export const defaultTheme = themes.corporate;

export function applyTheme(theme: Theme) {
  const root = document.documentElement;
  
  Object.entries(theme.colors).forEach(([key, value]) => {
    const cssVar = `--${key.replace(/([A-Z])/g, '-$1').toLowerCase()}`;
    root.style.setProperty(cssVar, value);
  });
  
  // Store theme preference
  localStorage.setItem('go-ads-theme', theme.id);
}

export function getStoredTheme(): Theme {
  const storedId = localStorage.getItem('go-ads-theme');
  return Object.values(themes).find(t => t.id === storedId) || defaultTheme;
}

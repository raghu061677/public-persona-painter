/**
 * Branding utilities for white-label theming
 */

export interface CompanyBranding {
  name: string;
  logo_url: string | null;
  theme_color: string;
  secondary_color: string;
}

/**
 * Convert hex color to HSL format for CSS variables
 * @param hex - Hex color string (with or without #)
 * @returns HSL string in format "h s% l%" or null if invalid
 */
export function hexToHSL(hex: string): string | null {
  try {
    hex = hex.replace(/^#/, '');
    
    if (hex.length !== 6) return null;
    
    const r = parseInt(hex.substring(0, 2), 16) / 255;
    const g = parseInt(hex.substring(2, 4), 16) / 255;
    const b = parseInt(hex.substring(4, 6), 16) / 255;

    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h = 0;
    let s = 0;
    const l = (max + min) / 2;

    if (max !== min) {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

      switch (max) {
        case r:
          h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
          break;
        case g:
          h = ((b - r) / d + 2) / 6;
          break;
        case b:
          h = ((r - g) / d + 4) / 6;
          break;
      }
    }

    h = Math.round(h * 360);
    s = Math.round(s * 100);
    const lPercent = Math.round(l * 100);

    return `${h} ${s}% ${lPercent}%`;
  } catch {
    return null;
  }
}

/**
 * Apply company branding to document root CSS variables
 */
export function applyCompanyBranding(branding: CompanyBranding): void {
  const root = document.documentElement;
  
  // Apply primary color (theme_color)
  if (branding.theme_color) {
    const primaryHSL = hexToHSL(branding.theme_color);
    if (primaryHSL) {
      root.style.setProperty('--primary', primaryHSL);
      
      // Generate lighter/darker variants
      const [h, s, l] = primaryHSL.split(' ');
      const lightness = parseInt(l);
      
      // Primary foreground (contrasting text color)
      root.style.setProperty('--primary-foreground', lightness > 50 ? '0 0% 0%' : '0 0% 100%');
      
      // Hover states
      root.style.setProperty('--primary-hover', `${h} ${s} ${Math.max(lightness - 10, 0)}%`);
    }
  }
  
  // Apply secondary color
  if (branding.secondary_color) {
    const secondaryHSL = hexToHSL(branding.secondary_color);
    if (secondaryHSL) {
      root.style.setProperty('--secondary', secondaryHSL);
      
      const [h, s, l] = secondaryHSL.split(' ');
      const lightness = parseInt(l);
      root.style.setProperty('--secondary-foreground', lightness > 50 ? '0 0% 0%' : '0 0% 100%');
    }
  }
  
  // Apply accent (use secondary or derive from primary)
  if (branding.secondary_color) {
    const accentHSL = hexToHSL(branding.secondary_color);
    if (accentHSL) {
      root.style.setProperty('--accent', accentHSL);
      
      const [h, s, l] = accentHSL.split(' ');
      const lightness = parseInt(l);
      root.style.setProperty('--accent-foreground', lightness > 50 ? '0 0% 0%' : '0 0% 100%');
    }
  }
}

/**
 * Reset branding to default theme
 */
export function resetBranding(): void {
  const root = document.documentElement;
  
  // Reset to default shadcn colors
  root.style.removeProperty('--primary');
  root.style.removeProperty('--primary-foreground');
  root.style.removeProperty('--primary-hover');
  root.style.removeProperty('--secondary');
  root.style.removeProperty('--secondary-foreground');
  root.style.removeProperty('--accent');
  root.style.removeProperty('--accent-foreground');
}

/**
 * Get company logo or fallback to default
 */
export function getCompanyLogo(branding: CompanyBranding | null): string {
  return branding?.logo_url || '/placeholder.svg';
}

/**
 * Get company display name or fallback
 */
export function getCompanyName(branding: CompanyBranding | null): string {
  return branding?.name || 'Go-Ads 360°';
}

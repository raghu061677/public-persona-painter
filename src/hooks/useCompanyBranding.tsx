import { useEffect } from 'react';
import { useCompany } from '@/contexts/CompanyContext';

/**
 * Hook to apply company branding (logo, colors) to the application
 */
export function useCompanyBranding() {
  const { company } = useCompany();

  useEffect(() => {
    if (!company) return;

    const root = document.documentElement;

    // Apply primary color (main brand color)
    if (company.theme_color) {
      // Convert hex to HSL
      const hsl = hexToHSL(company.theme_color);
      if (hsl) {
        root.style.setProperty('--primary', hsl);
      }
    }

    // Apply secondary color (accent color)
    if (company.secondary_color) {
      const hsl = hexToHSL(company.secondary_color);
      if (hsl) {
        root.style.setProperty('--secondary', hsl);
      }
    }

    // Cleanup function to reset to default if needed
    return () => {
      // Reset to default theme colors when company changes
      root.style.removeProperty('--primary');
      root.style.removeProperty('--secondary');
    };
  }, [company?.theme_color, company?.secondary_color]);

  return {
    logoUrl: company?.logo_url,
    primaryColor: company?.theme_color,
    secondaryColor: company?.secondary_color,
    companyName: company?.name,
  };
}

/**
 * Convert hex color to HSL format for CSS variables
 */
function hexToHSL(hex: string): string | null {
  // Remove # if present
  hex = hex.replace(/^#/, '');

  // Parse hex values
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
}

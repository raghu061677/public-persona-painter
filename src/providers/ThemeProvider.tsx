import { useEffect } from 'react';
import { useThemeStore } from '@/store/themeStore';
import { useCompany } from '@/contexts/CompanyContext';
import { applyCompanyBranding, resetBranding } from '@/lib/branding';

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { theme } = useThemeStore();
  const { company } = useCompany();

  useEffect(() => {
    // Apply theme class (light/dark mode)
    document.documentElement.className = theme;
  }, [theme]);

  useEffect(() => {
    // Apply company branding when company loads
    if (company && company.theme_color) {
      applyCompanyBranding({
        name: company.name,
        logo_url: company.logo_url || null,
        theme_color: company.theme_color,
        secondary_color: company.secondary_color || '#10b981',
      });
    } else {
      resetBranding();
    }

    // Cleanup on unmount
    return () => {
      resetBranding();
    };
  }, [company]);

  return <>{children}</>;
}

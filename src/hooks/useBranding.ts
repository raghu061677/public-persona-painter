/**
 * Hook for accessing and applying company branding
 */

import { useEffect, useState } from 'react';
import { useCompany } from '@/contexts/CompanyContext';
import { CompanyBranding, applyCompanyBranding, resetBranding } from '@/lib/branding';

export function useBranding() {
  const { company } = useCompany();
  const [branding, setBranding] = useState<CompanyBranding | null>(null);

  useEffect(() => {
    if (company) {
      const brandingData: CompanyBranding = {
        name: company.name,
        logo_url: company.logo_url || null,
        theme_color: company.theme_color || '#1e40af',
        secondary_color: company.secondary_color || '#10b981',
      };
      
      setBranding(brandingData);
      applyCompanyBranding(brandingData);
    } else {
      resetBranding();
    }

    return () => {
      resetBranding();
    };
  }, [company]);

  return { branding, company };
}

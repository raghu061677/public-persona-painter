import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './AuthContext';
import { useTenant } from './TenantContext';

interface Company {
  id: string;
  name: string;
  type: 'media_owner' | 'agency' | 'platform_admin';
  legal_name?: string;
  gstin?: string;
  logo_url?: string;
  theme_color?: string;
  secondary_color?: string;
  status: 'pending' | 'active' | 'suspended' | 'cancelled';
}

interface CompanyUser {
  id: string;
  company_id: string;
  user_id: string;
  role: string;
  is_primary: boolean;
  status: string;
}

interface CompanyContextType {
  company: Company | null;
  companyUser: CompanyUser | null;
  isPlatformAdmin: boolean;
  isLoading: boolean;
  refreshCompany: () => Promise<void>;
  allCompanies: Company[];
  switchCompany: (companyId: string) => Promise<void>;
}

const CompanyContext = createContext<CompanyContextType | undefined>(undefined);

export function CompanyProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const { currentTenantId, isPlatformAdmin: isTenantPlatformAdmin, loading: tenantLoading } = useTenant();
  const [company, setCompany] = useState<Company | null>(null);
  const [companyUser, setCompanyUser] = useState<CompanyUser | null>(null);
  const [isPlatformAdmin, setIsPlatformAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [allCompanies, setAllCompanies] = useState<Company[]>([]);

  const loadCompanyData = async () => {
    if (!user) {
      setCompany(null);
      setCompanyUser(null);
      setIsPlatformAdmin(false);
      setAllCompanies([]);
      setIsLoading(false);
      return;
    }

    // Wait for tenant context to finish loading
    if (tenantLoading) {
      return;
    }

    try {
      setIsLoading(true);

      // Use optimized RPC function to fetch all data in one call
      const { data: authData, error: authError } = await supabase.rpc('get_user_auth_data', { 
        p_user_id: user.id 
      }) as { data: any; error: any };

      if (authError) {
        console.error('Error fetching auth data:', authError);
        setIsLoading(false);
        return;
      }

      // Set platform admin status
      setIsPlatformAdmin(authData?.is_platform_admin || false);

      // Set all companies
      setAllCompanies(authData?.companies || []);

      // Determine target company ID
      let targetCompanyId: string | null = null;

      if (currentTenantId) {
        // Use tenant ID from subdomain if available
        targetCompanyId = currentTenantId;
      } else {
        // Check for stored company preference
        const storedCompanyId = localStorage.getItem('selected_company_id');
        if (storedCompanyId && authData?.companies?.some((c: any) => c.id === storedCompanyId)) {
          targetCompanyId = storedCompanyId;
        } else {
          // Use primary company or first available
          targetCompanyId = authData?.primary_company_id;
          
          // Fallback to platform admin company or first company
          if (!targetCompanyId && authData?.companies?.length > 0) {
            const platformCompany = authData.companies.find((c: any) => c.type === 'platform_admin');
            targetCompanyId = platformCompany?.id || authData.companies[0].id;
          }
        }
      }

      if (!targetCompanyId) {
        setIsLoading(false);
        return;
      }

      // Find company user association from the fetched data
      const companyUserData = authData?.company_users?.find(
        (cu: any) => cu.company_id === targetCompanyId
      );
      setCompanyUser(companyUserData || null);

      // Find company details from the fetched data
      const companyData = authData?.companies?.find((c: any) => c.id === targetCompanyId);
      
      if (companyData) {
        setCompany(companyData);
      } else {
        console.error('Company not found in fetched data');
      }
    } catch (error) {
      console.error('Error in loadCompanyData:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const switchCompany = async (companyId: string) => {
    if (!user) return;
    
    try {
      // Store preference
      localStorage.setItem('selected_company_id', companyId);
      
      // Simply reload company data - it will use the stored preference
      await loadCompanyData();
    } catch (error) {
      console.error('Error switching company:', error);
    }
  };

  useEffect(() => {
    loadCompanyData();
  }, [user, currentTenantId, isTenantPlatformAdmin, tenantLoading]);

  const refreshCompany = async () => {
    await loadCompanyData();
  };

  return (
    <CompanyContext.Provider
      value={{
        company,
        companyUser,
        isPlatformAdmin,
        isLoading,
        refreshCompany,
        allCompanies,
        switchCompany
      }}
    >
      {children}
    </CompanyContext.Provider>
  );
}

export function useCompany() {
  const context = useContext(CompanyContext);
  if (context === undefined) {
    throw new Error('useCompany must be used within a CompanyProvider');
  }
  return context;
}

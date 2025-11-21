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

      // Always check if user is platform admin by calling the database function
      const { data: isAdmin } = await supabase.rpc('is_platform_admin', { _user_id: user.id });
      const userIsPlatformAdmin = isAdmin || false;
      setIsPlatformAdmin(userIsPlatformAdmin);

      let targetCompanyId: string | null = null;

      // Check if platform admin to fetch all companies
      if (userIsPlatformAdmin) {
        const { data: companies, error: companiesError } = await supabase
          .from('companies' as any)
          .select('*')
          .eq('status', 'active')
          .order('name');
        
        if (!companiesError && companies) {
          setAllCompanies(companies as any as Company[]);
          
          // Check for stored company preference
          const storedCompanyId = localStorage.getItem('selected_company_id');
          if (storedCompanyId && companies.some((c: any) => c.id === storedCompanyId)) {
            targetCompanyId = storedCompanyId;
          } else if (companies.length > 0) {
            // Default to platform admin company if available
            const platformCompany = companies.find((c: any) => c.type === 'platform_admin');
            targetCompanyId = platformCompany ? (platformCompany as any).id : (companies[0] as any).id;
          }
        }
      } else {
        // If we have a tenant ID from subdomain, use that company
        if (currentTenantId) {
          targetCompanyId = currentTenantId;
        } else {
          // Get user's primary company
          const { data: primaryCompanyUser } = await supabase
            .from('company_users' as any)
            .select('company_id')
            .eq('user_id', user.id)
            .eq('status', 'active')
            .eq('is_primary', true)
            .maybeSingle();
          
          if (primaryCompanyUser && 'company_id' in primaryCompanyUser) {
            targetCompanyId = (primaryCompanyUser as any).company_id;
          } else {
            // Fallback to first active company
            const { data: firstCompanyUser } = await supabase
              .from('company_users' as any)
              .select('company_id')
              .eq('user_id', user.id)
              .eq('status', 'active')
              .order('joined_at', { ascending: true })
              .limit(1)
              .maybeSingle();
            
            if (firstCompanyUser && 'company_id' in firstCompanyUser) {
              targetCompanyId = (firstCompanyUser as any).company_id;
            }
          }
        }

        // For non-platform admins, fetch only their companies
        const { data: userCompanies } = await supabase
          .from('company_users' as any)
          .select('company_id, companies(*)')
          .eq('user_id', user.id)
          .eq('status', 'active');
        
        if (userCompanies) {
          const companies = userCompanies
            .map((uc: any) => uc.companies)
            .filter((c: any) => c && c.status === 'active');
          setAllCompanies(companies);
        }
      }

      if (!targetCompanyId) {
        setIsLoading(false);
        return;
      }

      // Get company user association for this company
      const { data: companyUserData } = await supabase
        .from('company_users' as any)
        .select('*')
        .eq('user_id', user.id)
        .eq('company_id', targetCompanyId)
        .eq('status', 'active')
        .maybeSingle();

      setCompanyUser(companyUserData as any);

      // Get company details
      const { data: companyData, error: companyError } = await supabase
        .from('companies' as any)
        .select('*')
        .eq('id', targetCompanyId)
        .single();

      if (companyError) {
        console.error('Error fetching company:', companyError);
      } else {
        setCompany(companyData as any);
        // isPlatformAdmin is already set above, no need to set it again here
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
      
      // Check if user is platform admin (this should persist across company switches)
      const { data: isAdmin } = await supabase.rpc('is_platform_admin', { _user_id: user.id });
      setIsPlatformAdmin(isAdmin || false);
      
      // Get company user association
      const { data: companyUserData } = await supabase
        .from('company_users' as any)
        .select('*')
        .eq('user_id', user.id)
        .eq('company_id', companyId)
        .eq('status', 'active')
        .maybeSingle();

      setCompanyUser(companyUserData as any);

      // Get company details
      const { data: companyData, error } = await supabase
        .from('companies' as any)
        .select('*')
        .eq('id', companyId)
        .single();

      if (!error && companyData) {
        setCompany(companyData as any);
      }
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

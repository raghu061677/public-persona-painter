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
}

const CompanyContext = createContext<CompanyContextType | undefined>(undefined);

export function CompanyProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const { currentTenantId, isPlatformAdmin: isTenantPlatformAdmin, loading: tenantLoading } = useTenant();
  const [company, setCompany] = useState<Company | null>(null);
  const [companyUser, setCompanyUser] = useState<CompanyUser | null>(null);
  const [isPlatformAdmin, setIsPlatformAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const loadCompanyData = async () => {
    if (!user) {
      setCompany(null);
      setCompanyUser(null);
      setIsPlatformAdmin(false);
      setIsLoading(false);
      return;
    }

    // Wait for tenant context to finish loading
    if (tenantLoading) {
      return;
    }

    try {
      setIsLoading(true);

      let targetCompanyId: string | null = null;

      // If we have a tenant ID from subdomain, use that company
      if (currentTenantId) {
        targetCompanyId = currentTenantId;
      } else {
        // No subdomain - check if user is platform admin
        if (isTenantPlatformAdmin) {
          // Get the platform admin company
          const { data: platformCompany } = await supabase
            .from('companies' as any)
            .select('id')
            .eq('type', 'platform_admin')
            .eq('status', 'active')
            .maybeSingle();
          
          if (platformCompany && 'id' in platformCompany) {
            targetCompanyId = (platformCompany as any).id;
          }
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
        setIsPlatformAdmin((companyData as any).type === 'platform_admin');
      }
    } catch (error) {
      console.error('Error in loadCompanyData:', error);
    } finally {
      setIsLoading(false);
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
        refreshCompany
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

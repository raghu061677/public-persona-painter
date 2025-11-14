import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './AuthContext';

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

    try {
      setIsLoading(true);

      // Get user's company association (handle multiple companies - take first active)
      const { data: companyUserData, error: cuError } = await supabase
        .from('company_users' as any)
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .order('created_at', { ascending: true })
        .limit(1)
        .maybeSingle();

      if (cuError) {
        console.error('Error fetching company user:', cuError);
        setIsLoading(false);
        return;
      }

      setCompanyUser(companyUserData as any);

      if (companyUserData) {
        // Get company details
        const { data: companyData, error: companyError } = await supabase
          .from('companies' as any)
          .select('*')
          .eq('id', (companyUserData as any).company_id)
          .single();

        if (companyError) {
          console.error('Error fetching company:', companyError);
        } else {
          setCompany(companyData as any);
          setIsPlatformAdmin((companyData as any).type === 'platform_admin');
        }
      }
    } catch (error) {
      console.error('Error in loadCompanyData:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadCompanyData();
  }, [user]);

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

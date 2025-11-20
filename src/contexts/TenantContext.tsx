import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface TenantContextType {
  currentTenantId: string | null;
  currentTenantSlug: string | null;
  currentTenantName: string | null;
  isPlatformAdmin: boolean;
  loading: boolean;
  setTenant: (tenantId: string, tenantSlug: string, tenantName: string) => void;
}

const TenantContext = createContext<TenantContextType | undefined>(undefined);

export function TenantProvider({ children }: { children: React.ReactNode }) {
  const [currentTenantId, setCurrentTenantId] = useState<string | null>(null);
  const [currentTenantSlug, setCurrentTenantSlug] = useState<string | null>(null);
  const [currentTenantName, setCurrentTenantName] = useState<string | null>(null);
  const [isPlatformAdmin, setIsPlatformAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    detectTenantFromSubdomain();
  }, []);

  const detectTenantFromSubdomain = async () => {
    try {
      // Get hostname from window
      const hostname = window.location.hostname;
      
      // Check if we're on a subdomain (not localhost, not admin, not www)
      const parts = hostname.split('.');
      
      // For local development, check localStorage for manual tenant selection
      if (hostname === 'localhost' || hostname.startsWith('127.0.0.1')) {
        const storedTenantId = localStorage.getItem('selected_tenant_id');
        const storedTenantSlug = localStorage.getItem('selected_tenant_slug');
        const storedTenantName = localStorage.getItem('selected_tenant_name');
        
        if (storedTenantId && storedTenantSlug) {
          setCurrentTenantId(storedTenantId);
          setCurrentTenantSlug(storedTenantSlug);
          setCurrentTenantName(storedTenantName || null);
        }
        
        // Check if user is platform admin
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          const { data: companyUser } = await supabase
            .from('company_users')
            .select('company_id, companies(type)')
            .eq('user_id', session.user.id)
            .eq('status', 'active')
            .single();
          
          if (companyUser?.companies?.type === 'platform_admin') {
            setIsPlatformAdmin(true);
          }
        }
        
        setLoading(false);
        return;
      }
      
      // Check if we're on admin subdomain or main domain
      if (parts[0] === 'admin' || parts[0] === 'www' || parts.length < 3) {
        // Platform admin access - no tenant filtering
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          const { data: companyUser } = await supabase
            .from('company_users')
            .select('company_id, companies(type)')
            .eq('user_id', session.user.id)
            .eq('status', 'active')
            .single();
          
          if (companyUser?.companies?.type === 'platform_admin') {
            setIsPlatformAdmin(true);
          }
        }
        setLoading(false);
        return;
      }
      
      // Extract subdomain slug
      const slug = parts[0];
      
      // Look up company by slug
      const { data: company, error } = await supabase
        .from('companies')
        .select('id, name, slug, status')
        .eq('slug', slug)
        .single();
      
      if (error || !company) {
        console.error('Company not found for slug:', slug);
        setLoading(false);
        return;
      }
      
      if (company.status !== 'active') {
        console.error('Company is not active:', company.name);
        setLoading(false);
        return;
      }
      
      setCurrentTenantId(company.id);
      setCurrentTenantSlug(company.slug);
      setCurrentTenantName(company.name);
      setLoading(false);
      
    } catch (error) {
      console.error('Error detecting tenant:', error);
      setLoading(false);
    }
  };

  const setTenant = (tenantId: string, tenantSlug: string, tenantName: string) => {
    setCurrentTenantId(tenantId);
    setCurrentTenantSlug(tenantSlug);
    setCurrentTenantName(tenantName);
    
    // Store in localStorage for local development
    localStorage.setItem('selected_tenant_id', tenantId);
    localStorage.setItem('selected_tenant_slug', tenantSlug);
    localStorage.setItem('selected_tenant_name', tenantName);
  };

  return (
    <TenantContext.Provider
      value={{
        currentTenantId,
        currentTenantSlug,
        currentTenantName,
        isPlatformAdmin,
        loading,
        setTenant,
      }}
    >
      {children}
    </TenantContext.Provider>
  );
}

export function useTenant() {
  const context = useContext(TenantContext);
  if (context === undefined) {
    throw new Error('useTenant must be used within a TenantProvider');
  }
  return context;
}

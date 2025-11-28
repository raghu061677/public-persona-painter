import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useLocation } from 'react-router-dom';

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
  const location = useLocation();

  const detectTenantFromPath = async () => {
    try {
      // Extract tenant slug from path (e.g., /matrix-networksolutions/...)
      const pathParts = location.pathname.split('/').filter(Boolean);
      const potentialSlug = pathParts[0];
      
      // Skip if it's a known non-tenant route
      const nonTenantRoutes = ['auth', 'register', 'portal', 'admin', 'settings', 'dashboard', 'marketplace'];
      if (!potentialSlug || nonTenantRoutes.includes(potentialSlug)) {
        // Fallback to subdomain detection
        await detectTenantFromSubdomain();
        return;
      }

      // Look up company by slug
      const { data: company, error } = await supabase
        .from('companies')
        .select('id, name, slug, status')
        .eq('slug', potentialSlug)
        .eq('status', 'active')
        .single();

      if (error || !company) {
        console.log('No company found for path slug:', potentialSlug, '- falling back to subdomain');
        await detectTenantFromSubdomain();
        return;
      }

      // Store tenant info
      localStorage.setItem('currentTenantId', company.id);
      localStorage.setItem('currentTenantSlug', company.slug || potentialSlug);
      localStorage.setItem('currentTenantName', company.name);
      
      setCurrentTenantId(company.id);
      setCurrentTenantSlug(company.slug || potentialSlug);
      setCurrentTenantName(company.name);

      // Check platform admin status
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: isAdmin } = await supabase.rpc('is_platform_admin', { _user_id: user.id });
        setIsPlatformAdmin(isAdmin || false);
      }

      setLoading(false);
    } catch (error) {
      console.error('Error detecting tenant from path:', error);
      // Fallback to subdomain
      await detectTenantFromSubdomain();
    }
  };

  const detectTenantFromSubdomain = async () => {
    try {
      // Get hostname from window
      const hostname = window.location.hostname;
      
      // Check if we're on a subdomain (not localhost, not admin, not www)
      const parts = hostname.split('.');
      
      // For local development or Lovable preview/staging, check localStorage for manual tenant selection
      const isLocalDev = hostname === 'localhost' || hostname.startsWith('127.0.0.1');
      const isLovablePreview = hostname.includes('lovable.app') || hostname.includes('lovableproject.com');
      
      // Also check if hostname starts with 'app' which is typically a preview/development subdomain
      const isAppSubdomain = hostname.startsWith('app.') && (isLovablePreview || hostname.includes('.dev') || hostname.includes('.staging'));
      
      if (isLocalDev || isLovablePreview || isAppSubdomain) {
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
        // Check localStorage for stored tenant
        const storedTenantId = localStorage.getItem('currentTenantId');
        const storedTenantSlug = localStorage.getItem('currentTenantSlug');
        const storedTenantName = localStorage.getItem('currentTenantName');
        
        if (storedTenantId && storedTenantSlug) {
          setCurrentTenantId(storedTenantId);
          setCurrentTenantSlug(storedTenantSlug);
          setCurrentTenantName(storedTenantName || null);
        }
        
        // Platform admin access - no tenant filtering
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          const { data: isAdmin } = await supabase.rpc('is_platform_admin', { _user_id: session.user.id });
          setIsPlatformAdmin(isAdmin || false);
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
        .eq('status', 'active')
        .single();
      
      if (error || !company) {
        console.error('Company not found for subdomain slug:', slug);
        setLoading(false);
        return;
      }
      
      // Store tenant info
      localStorage.setItem('currentTenantId', company.id);
      localStorage.setItem('currentTenantSlug', company.slug || slug);
      localStorage.setItem('currentTenantName', company.name);
      
      setCurrentTenantId(company.id);
      setCurrentTenantSlug(company.slug || slug);
      setCurrentTenantName(company.name);
      setLoading(false);
      
    } catch (error) {
      console.error('Error detecting tenant:', error);
      setLoading(false);
    }
  };

  useEffect(() => {
    detectTenantFromPath();
  }, [location.pathname]);

  const setTenant = (tenantId: string, tenantSlug: string, tenantName: string) => {
    setCurrentTenantId(tenantId);
    setCurrentTenantSlug(tenantSlug);
    setCurrentTenantName(tenantName);
    
    // Store in localStorage
    localStorage.setItem('currentTenantId', tenantId);
    localStorage.setItem('currentTenantSlug', tenantSlug);
    localStorage.setItem('currentTenantName', tenantName);
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

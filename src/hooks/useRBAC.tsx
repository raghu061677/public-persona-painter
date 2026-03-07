/**
 * useRBAC hook - Updated to use enterprise DB-driven permissions
 * while maintaining backward-compatible API surface.
 */
import { useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useCompany } from '@/contexts/CompanyContext';
import { useEnterpriseRBAC } from './useEnterpriseRBAC';
import type { ModuleKey } from '@/lib/rbac/permissions';

export type PlatformRole = 'platform_admin';
export type CompanyRole = 'company_admin' | 'admin' | 'sales' | 'operations' | 'operations_manager' | 'accounts' | 'finance' | 'installation' | 'mounting' | 'monitor' | 'monitoring' | 'viewer';
export type ModuleName = ModuleKey | 'platform_admin' | 'company_management';

interface RBACPermissions {
  isPlatformAdmin: boolean;
  hasPlatformRole: (role: PlatformRole) => boolean;
  isCompanyAdmin: boolean;
  hasCompanyRole: (role: CompanyRole | CompanyRole[]) => boolean;
  canAccessModule: (module: ModuleName) => boolean;
  canViewModule: (module: ModuleName) => boolean;
  canEditModule: (module: ModuleName) => boolean;
  canDeleteModule: (module: ModuleName) => boolean;
  companyRole: CompanyRole | null;
}

export function useRBAC(): RBACPermissions {
  const { isAdmin } = useAuth();
  const { isPlatformAdmin, companyUser } = useCompany();
  const enterprise = useEnterpriseRBAC();

  const companyRole = useMemo((): CompanyRole | null => {
    if (isPlatformAdmin) return null;
    const raw = companyUser?.role;
    if (!raw) return null;
    return raw as CompanyRole;
  }, [isPlatformAdmin, companyUser]);

  const hasPlatformRole = (role: PlatformRole): boolean => {
    return isPlatformAdmin;
  };

  const hasCompanyRole = (role: CompanyRole | CompanyRole[]): boolean => {
    if (isPlatformAdmin || isAdmin) return true;
    if (!companyRole) return false;
    const rolesToCheck = Array.isArray(role) ? role : [role];
    
    // Check direct match or normalized match
    return rolesToCheck.some(r => {
      if (companyRole === r) return true;
      // Handle aliases
      if (r === 'company_admin' && companyRole === 'admin') return true;
      if (r === 'accounts' && companyRole === 'finance') return true;
      if (r === 'operations' && (companyRole === 'operations_manager' || companyRole === 'operations')) return true;
      if (r === 'installation' && (companyRole === 'mounting' || companyRole === 'installation')) return true;
      if (r === 'monitor' && (companyRole === 'monitoring' || companyRole === 'monitor')) return true;
      return false;
    });
  };

  const canAccessModule = (module: ModuleName): boolean => {
    if (isPlatformAdmin || isAdmin) return true;
    if (module === 'platform_admin') return isPlatformAdmin;
    if (module === 'company_management') return isPlatformAdmin || isAdmin;
    return enterprise.canViewModule(module as ModuleKey);
  };

  const canViewModule = (module: ModuleName): boolean => canAccessModule(module);

  const canEditModule = (module: ModuleName): boolean => {
    if (isPlatformAdmin || isAdmin) return true;
    if (module === 'platform_admin' || module === 'company_management') return isPlatformAdmin;
    return enterprise.canEdit(module as ModuleKey);
  };

  const canDeleteModule = (module: ModuleName): boolean => {
    if (isPlatformAdmin || isAdmin) return true;
    return false; // Only admins can delete
  };

  return {
    isPlatformAdmin,
    hasPlatformRole,
    isCompanyAdmin: isPlatformAdmin || isAdmin || companyRole === 'admin',
    hasCompanyRole,
    canAccessModule,
    canViewModule,
    canEditModule,
    canDeleteModule,
    companyRole,
  };
}

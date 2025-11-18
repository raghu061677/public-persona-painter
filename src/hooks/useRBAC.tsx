import { useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useCompany } from '@/contexts/CompanyContext';

/**
 * Role hierarchy and mapping
 * Platform level: platform_admin
 * Company level: company_admin, sales, operations, accounts (finance)
 */

export type PlatformRole = 'platform_admin';
export type CompanyRole = 'company_admin' | 'sales' | 'operations' | 'accounts';
export type ModuleName = 
  | 'media_assets' 
  | 'clients' 
  | 'plans' 
  | 'campaigns' 
  | 'operations' 
  | 'finance' 
  | 'reports'
  | 'settings'
  | 'platform_admin'
  | 'company_management';

interface RBACPermissions {
  // Platform checks
  isPlatformAdmin: boolean;
  hasPlatformRole: (role: PlatformRole) => boolean;
  
  // Company workspace checks
  isCompanyAdmin: boolean;
  hasCompanyRole: (role: CompanyRole | CompanyRole[]) => boolean;
  
  // Module access
  canAccessModule: (module: ModuleName) => boolean;
  canViewModule: (module: ModuleName) => boolean;
  canEditModule: (module: ModuleName) => boolean;
  canDeleteModule: (module: ModuleName) => boolean;
  
  // Company user info
  companyRole: CompanyRole | null;
}

/**
 * Map database roles to new role structure
 * admin -> company_admin (within company) OR platform_admin (if platform company)
 * finance -> accounts
 * Keep: sales, operations
 */
const mapDatabaseRole = (dbRole: string, isPlatform: boolean): CompanyRole | PlatformRole | null => {
  if (dbRole === 'admin') {
    return isPlatform ? 'platform_admin' : 'company_admin';
  }
  if (dbRole === 'finance') return 'accounts';
  if (dbRole === 'sales') return 'sales';
  if (dbRole === 'operations') return 'operations';
  return null;
};

/**
 * Module access rules per role
 */
const MODULE_ACCESS_RULES: Record<CompanyRole | PlatformRole, {
  modules: ModuleName[];
  readOnly?: ModuleName[];
}> = {
  platform_admin: {
    modules: ['media_assets', 'clients', 'plans', 'campaigns', 'operations', 'finance', 'reports', 'settings', 'platform_admin', 'company_management'],
  },
  company_admin: {
    modules: ['media_assets', 'clients', 'plans', 'campaigns', 'operations', 'finance', 'reports', 'settings'],
  },
  sales: {
    modules: ['media_assets', 'clients', 'plans', 'campaigns', 'reports'],
    readOnly: ['operations'], // Can view operations for context
  },
  operations: {
    modules: ['operations', 'campaigns'],
    readOnly: ['media_assets', 'plans'], // Can view for context
  },
  accounts: {
    modules: ['finance', 'reports', 'campaigns'],
    readOnly: ['clients', 'media_assets'], // Can view for billing context
  },
};

export function useRBAC(): RBACPermissions {
  const { roles, isAdmin } = useAuth();
  const { isPlatformAdmin, companyUser } = useCompany();
  
  const mappedRole = useMemo(() => {
    // Platform admin check
    if (isPlatformAdmin) return 'platform_admin';
    
    // Check company user role
    if (companyUser?.role) {
      const mapped = mapDatabaseRole(companyUser.role, false);
      if (mapped && mapped !== 'platform_admin') return mapped as CompanyRole;
    }
    
    // Fallback to auth roles
    if (isAdmin) return 'company_admin';
    if (roles.includes('finance')) return 'accounts';
    if (roles.includes('sales')) return 'sales';
    if (roles.includes('operations')) return 'operations';
    
    return null;
  }, [isPlatformAdmin, companyUser, roles, isAdmin]);

  const hasPlatformRole = (role: PlatformRole): boolean => {
    return mappedRole === role;
  };

  const hasCompanyRole = (role: CompanyRole | CompanyRole[]): boolean => {
    if (!mappedRole) return false;
    if (mappedRole === 'platform_admin') return true; // Platform admin has all company roles
    
    const rolesToCheck = Array.isArray(role) ? role : [role];
    return rolesToCheck.includes(mappedRole as CompanyRole);
  };

  const canAccessModule = (module: ModuleName): boolean => {
    if (!mappedRole) return false;
    
    const rules = MODULE_ACCESS_RULES[mappedRole];
    if (!rules) return false;
    
    // Check if module is in allowed modules or read-only modules
    return rules.modules.includes(module) || (rules.readOnly?.includes(module) ?? false);
  };

  const canViewModule = (module: ModuleName): boolean => {
    return canAccessModule(module);
  };

  const canEditModule = (module: ModuleName): boolean => {
    if (!mappedRole) return false;
    
    const rules = MODULE_ACCESS_RULES[mappedRole];
    if (!rules) return false;
    
    // Can edit if in modules list but NOT in readOnly list
    return rules.modules.includes(module) && !(rules.readOnly?.includes(module) ?? false);
  };

  const canDeleteModule = (module: ModuleName): boolean => {
    // Only admins can delete
    return mappedRole === 'platform_admin' || mappedRole === 'company_admin';
  };

  return {
    isPlatformAdmin,
    hasPlatformRole,
    isCompanyAdmin: mappedRole === 'company_admin' || isPlatformAdmin,
    hasCompanyRole,
    canAccessModule,
    canViewModule,
    canEditModule,
    canDeleteModule,
    companyRole: (mappedRole !== 'platform_admin' ? mappedRole : null) as CompanyRole | null,
  };
}

/**
 * Enterprise RBAC hook - DB-driven permissions with fallback.
 * This is the primary permission hook for all access control.
 */
import { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useCompany } from '@/contexts/CompanyContext';
import { getPermissionQueryRole, normalizeRole } from '@/lib/rbac/roleNormalization';
import {
  ModuleKey, ModulePermission, PermissionMatrix, ScopeMode,
  EMPTY_PERMISSION, FULL_PERMISSION, ALL_MODULES,
  checkScopeAccess, mergePermissions,
} from '@/lib/rbac/permissions';

export interface EnterpriseRBACResult {
  loading: boolean;
  permissions: PermissionMatrix;
  
  // Module-level checks
  canViewModule: (module: ModuleKey) => boolean;
  canCreate: (module: ModuleKey) => boolean;
  canEdit: (module: ModuleKey, record?: any) => boolean;
  canDelete: (module: ModuleKey, record?: any) => boolean;
  canAssign: (module: ModuleKey, record?: any) => boolean;
  canApprove: (module: ModuleKey, record?: any) => boolean;
  canExport: (module: ModuleKey, record?: any) => boolean;
  canUploadProof: (module: ModuleKey, record?: any) => boolean;
  canViewSensitive: (module: ModuleKey, record?: any) => boolean;
  
  // Scope
  getScopeMode: (module: ModuleKey) => ScopeMode;
  hasRecordAccess: (module: ModuleKey, record: any) => boolean;
  
  // Role info
  effectiveRole: string;
  isPlatformAdmin: boolean;
  isCompanyAdmin: boolean;
  
  // Field masking
  maskSensitiveValue: (module: ModuleKey, fieldName: string, value: any, record?: any) => any;
}

export function useEnterpriseRBAC(): EnterpriseRBACResult {
  const { user, roles: authRoles, isAdmin } = useAuth();
  const { isPlatformAdmin, companyUser } = useCompany();
  const [permissions, setPermissions] = useState<PermissionMatrix>({});
  const [loading, setLoading] = useState(true);

  // Determine effective role
  const effectiveRole = useMemo(() => {
    if (isPlatformAdmin) return 'platform_admin';
    const rawRole = companyUser?.role || (authRoles?.[0]) || 'user';
    return rawRole;
  }, [isPlatformAdmin, companyUser, authRoles]);

  const isEffectiveAdmin = isPlatformAdmin || isAdmin || effectiveRole === 'admin';

  // Load permissions from DB
  useEffect(() => {
    if (!user) {
      setPermissions({});
      setLoading(false);
      return;
    }

    const loadPerms = async () => {
      try {
        // Get the role key to query permissions
        const queryRole = getPermissionQueryRole(effectiveRole);
        
        const { data, error } = await supabase
          .from('role_permissions')
          .select('module, can_view, can_create, can_edit, can_update, can_delete, can_assign, can_approve, can_export, can_upload_proof, can_view_sensitive, scope_mode')
          .eq('role', queryRole)
          .is('company_id', null); // Global defaults

        if (error) {
          console.error('Error loading permissions:', error);
          setPermissions({});
          setLoading(false);
          return;
        }

        const matrix: PermissionMatrix = {};
        (data || []).forEach((row: any) => {
          const mod = row.module as ModuleKey;
          matrix[mod] = {
            can_view: row.can_view ?? false,
            can_create: row.can_create ?? false,
            can_edit: row.can_edit ?? row.can_update ?? false,
            can_delete: row.can_delete ?? false,
            can_assign: row.can_assign ?? false,
            can_approve: row.can_approve ?? false,
            can_export: row.can_export ?? false,
            can_upload_proof: row.can_upload_proof ?? false,
            can_view_sensitive: row.can_view_sensitive ?? false,
            scope_mode: (row.scope_mode as ScopeMode) ?? 'none',
          };
        });

        setPermissions(matrix);
      } catch (err) {
        console.error('Permission load error:', err);
      } finally {
        setLoading(false);
      }
    };

    loadPerms();
  }, [user, effectiveRole]);

  // Permission check helpers
  const getModulePerm = useCallback((module: ModuleKey): ModulePermission => {
    if (isEffectiveAdmin) return FULL_PERMISSION;
    return permissions[module] ?? EMPTY_PERMISSION;
  }, [permissions, isEffectiveAdmin]);

  const canViewModule = useCallback((module: ModuleKey) => getModulePerm(module).can_view, [getModulePerm]);
  const canCreate = useCallback((module: ModuleKey) => getModulePerm(module).can_create, [getModulePerm]);
  
  const canEdit = useCallback((module: ModuleKey, record?: any) => {
    const perm = getModulePerm(module);
    if (!perm.can_edit) return false;
    if (!record) return true;
    return checkScopeAccess(perm.scope_mode, record, user?.id);
  }, [getModulePerm, user]);

  const canDelete = useCallback((module: ModuleKey, record?: any) => {
    const perm = getModulePerm(module);
    if (!perm.can_delete) return false;
    if (!record) return true;
    return checkScopeAccess(perm.scope_mode, record, user?.id);
  }, [getModulePerm, user]);

  const canAssign = useCallback((module: ModuleKey, record?: any) => {
    const perm = getModulePerm(module);
    if (!perm.can_assign) return false;
    if (!record) return true;
    return checkScopeAccess(perm.scope_mode, record, user?.id);
  }, [getModulePerm, user]);

  const canApprove = useCallback((module: ModuleKey, record?: any) => {
    const perm = getModulePerm(module);
    if (!perm.can_approve) return false;
    if (!record) return true;
    return checkScopeAccess(perm.scope_mode, record, user?.id);
  }, [getModulePerm, user]);

  const canExport = useCallback((module: ModuleKey, record?: any) => {
    const perm = getModulePerm(module);
    if (!perm.can_export) return false;
    if (!record) return true;
    return checkScopeAccess(perm.scope_mode, record, user?.id);
  }, [getModulePerm, user]);

  const canUploadProof = useCallback((module: ModuleKey, record?: any) => {
    const perm = getModulePerm(module);
    if (!perm.can_upload_proof) return false;
    if (!record) return true;
    return checkScopeAccess(perm.scope_mode, record, user?.id);
  }, [getModulePerm, user]);

  const canViewSensitive = useCallback((module: ModuleKey, record?: any) => {
    const perm = getModulePerm(module);
    if (!perm.can_view_sensitive) return false;
    if (!record) return true;
    // For 'own' scope, can see sensitive data only on own records
    if (perm.scope_mode === 'own') {
      return checkScopeAccess('own', record, user?.id);
    }
    return true;
  }, [getModulePerm, user]);

  const getScopeMode = useCallback((module: ModuleKey): ScopeMode => {
    return getModulePerm(module).scope_mode;
  }, [getModulePerm]);

  const hasRecordAccess = useCallback((module: ModuleKey, record: any): boolean => {
    const perm = getModulePerm(module);
    if (!perm.can_view) return false;
    return checkScopeAccess(perm.scope_mode, record, user?.id);
  }, [getModulePerm, user]);

  const maskSensitiveValue = useCallback((module: ModuleKey, fieldName: string, value: any, record?: any): any => {
    if (isEffectiveAdmin) return value;
    if (canViewSensitive(module, record)) return value;
    // Return masked value
    if (typeof value === 'number') return null;
    if (typeof value === 'string') return '••••••';
    return null;
  }, [isEffectiveAdmin, canViewSensitive]);

  return {
    loading,
    permissions,
    canViewModule,
    canCreate,
    canEdit,
    canDelete,
    canAssign,
    canApprove,
    canExport,
    canUploadProof,
    canViewSensitive,
    getScopeMode,
    hasRecordAccess,
    effectiveRole,
    isPlatformAdmin,
    isCompanyAdmin: isEffectiveAdmin,
    maskSensitiveValue,
  };
}

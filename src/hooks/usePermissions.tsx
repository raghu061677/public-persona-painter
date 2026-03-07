/**
 * Legacy-compatible usePermissions hook.
 * Now delegates to useEnterpriseRBAC for DB-driven permissions.
 * Maintains the same API surface for backward compatibility.
 */
import { useEnterpriseRBAC } from './useEnterpriseRBAC';
import type { ModuleKey } from '@/lib/rbac/permissions';

export function usePermissions() {
  const rbac = useEnterpriseRBAC();

  const canView = (module: string): boolean => rbac.canViewModule(module as ModuleKey);
  const canCreate = (module: string): boolean => rbac.canCreate(module as ModuleKey);
  const canUpdate = (module: string): boolean => rbac.canEdit(module as ModuleKey);
  const canDelete = (module: string): boolean => rbac.canDelete(module as ModuleKey);

  const canAccess = (module: string, action: 'view' | 'create' | 'update' | 'delete'): boolean => {
    switch (action) {
      case 'view': return canView(module);
      case 'create': return canCreate(module);
      case 'update': return canUpdate(module);
      case 'delete': return canDelete(module);
      default: return false;
    }
  };

  const hasAnyPermission = (module: string): boolean => {
    return canView(module) || canCreate(module) || canUpdate(module) || canDelete(module);
  };

  return {
    permissions: rbac.permissions,
    loading: rbac.loading,
    canView,
    canCreate,
    canUpdate,
    canDelete,
    canAccess,
    hasAnyPermission,
  };
}

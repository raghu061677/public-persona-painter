/**
 * useModuleActions - Quick access to all action permissions for a specific module.
 * Use in page components to control button visibility and behavior.
 * 
 * Usage:
 *   const actions = useModuleActions('plans');
 *   {actions.canCreate && <Button>New Plan</Button>}
 *   {actions.canDelete(record) && <Button>Delete</Button>}
 */
import { useEnterpriseRBAC } from '@/hooks/useEnterpriseRBAC';
import type { ModuleKey } from '@/lib/rbac/permissions';

export function useModuleActions(module: ModuleKey) {
  const rbac = useEnterpriseRBAC();

  return {
    canView: rbac.canViewModule(module),
    canCreate: rbac.canCreate(module),
    canEdit: (record?: any) => rbac.canEdit(module, record),
    canDelete: (record?: any) => rbac.canDelete(module, record),
    canAssign: (record?: any) => rbac.canAssign(module, record),
    canApprove: (record?: any) => rbac.canApprove(module, record),
    canExport: (record?: any) => rbac.canExport(module, record),
    canUploadProof: (record?: any) => rbac.canUploadProof(module, record),
    canViewSensitive: (record?: any) => rbac.canViewSensitive(module, record),
    scopeMode: rbac.getScopeMode(module),
    loading: rbac.loading,
    effectiveRole: rbac.effectiveRole,
    isPlatformAdmin: rbac.isPlatformAdmin,
    isCompanyAdmin: rbac.isCompanyAdmin,
  };
}

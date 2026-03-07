/**
 * ActionGuard component - conditionally renders action buttons based on enterprise RBAC.
 * Usage: <ActionGuard module="plans" action="edit" record={plan}><Button>Edit</Button></ActionGuard>
 */
import { ReactNode } from 'react';
import { useEnterpriseRBAC } from '@/hooks/useEnterpriseRBAC';
import type { ModuleKey } from '@/lib/rbac/permissions';

type ActionType = 'view' | 'create' | 'edit' | 'delete' | 'assign' | 'approve' | 'export' | 'upload_proof' | 'view_sensitive';

interface ActionGuardProps {
  children: ReactNode;
  module: ModuleKey;
  action: ActionType;
  record?: any;
  fallback?: ReactNode;
}

export function ActionGuard({ children, module, action, record, fallback = null }: ActionGuardProps) {
  const rbac = useEnterpriseRBAC();

  let allowed = false;

  switch (action) {
    case 'view':
      allowed = rbac.canViewModule(module);
      break;
    case 'create':
      allowed = rbac.canCreate(module);
      break;
    case 'edit':
      allowed = rbac.canEdit(module, record);
      break;
    case 'delete':
      allowed = rbac.canDelete(module, record);
      break;
    case 'assign':
      allowed = rbac.canAssign(module, record);
      break;
    case 'approve':
      allowed = rbac.canApprove(module, record);
      break;
    case 'export':
      allowed = rbac.canExport(module, record);
      break;
    case 'upload_proof':
      allowed = rbac.canUploadProof(module, record);
      break;
    case 'view_sensitive':
      allowed = rbac.canViewSensitive(module, record);
      break;
  }

  if (allowed) return <>{children}</>;
  return <>{fallback}</>;
}

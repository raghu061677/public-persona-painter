/**
 * Enterprise RBAC permission types and utilities for Go-Ads 360°.
 * DB-driven permissions with hardcoded fallback for safety.
 */

export type ModuleKey =
  | 'dashboard'
  | 'media_assets'
  | 'clients'
  | 'plans'
  | 'campaigns'
  | 'operations'
  | 'monitoring'
  | 'finance'
  | 'reports'
  | 'users'
  | 'settings';

export type ScopeMode = 'all' | 'own' | 'assigned' | 'team' | 'basic_all' | 'none';

export interface ModulePermission {
  can_view: boolean;
  can_create: boolean;
  can_edit: boolean;
  can_delete: boolean;
  can_assign: boolean;
  can_approve: boolean;
  can_export: boolean;
  can_upload_proof: boolean;
  can_view_sensitive: boolean;
  scope_mode: ScopeMode;
}

export type PermissionMatrix = Partial<Record<ModuleKey, ModulePermission>>;

/** Default empty permission (deny all) */
export const EMPTY_PERMISSION: ModulePermission = {
  can_view: false,
  can_create: false,
  can_edit: false,
  can_delete: false,
  can_assign: false,
  can_approve: false,
  can_export: false,
  can_upload_proof: false,
  can_view_sensitive: false,
  scope_mode: 'none',
};

/** Full admin permission */
export const FULL_PERMISSION: ModulePermission = {
  can_view: true,
  can_create: true,
  can_edit: true,
  can_delete: true,
  can_assign: true,
  can_approve: true,
  can_export: true,
  can_upload_proof: true,
  can_view_sensitive: true,
  scope_mode: 'all',
};

/** All module keys */
export const ALL_MODULES: ModuleKey[] = [
  'dashboard', 'media_assets', 'clients', 'plans', 'campaigns',
  'operations', 'monitoring', 'finance', 'reports', 'users', 'settings',
];

/**
 * Check if a user owns a record based on common ownership fields.
 */
export function isRecordOwner(record: any, userId: string | undefined): boolean {
  if (!userId || !record) return false;
  return (
    record.created_by === userId ||
    record.sales_owner_id === userId ||
    record.assigned_to === userId ||
    record.user_id === userId
  );
}

/**
 * Check if a user is assigned to a record (for mounting/monitoring scope).
 */
export function isAssignedToRecord(record: any, userId: string | undefined): boolean {
  if (!userId || !record) return false;
  return (
    record.assigned_to === userId ||
    record.assigned_mounter_id === userId ||
    record.mounting_assigned_to === userId ||
    record.monitoring_assigned_to === userId ||
    record.operations_manager_id === userId
  );
}

/**
 * Check if scope allows access to a specific record.
 */
export function checkScopeAccess(
  scopeMode: ScopeMode,
  record: any,
  userId: string | undefined
): boolean {
  switch (scopeMode) {
    case 'all':
    case 'basic_all':
      return true;
    case 'own':
      return isRecordOwner(record, userId);
    case 'assigned':
      return isAssignedToRecord(record, userId) || isRecordOwner(record, userId);
    case 'team':
      // Team scope would check team membership - for now treat like 'own'
      return isRecordOwner(record, userId);
    case 'none':
      return false;
    default:
      return false;
  }
}

/**
 * Merge multiple permissions (for users with multiple roles) - take most permissive.
 */
export function mergePermissions(perms: ModulePermission[]): ModulePermission {
  if (perms.length === 0) return { ...EMPTY_PERMISSION };
  
  const scopePriority: ScopeMode[] = ['all', 'basic_all', 'team', 'own', 'assigned', 'none'];
  
  return perms.reduce((merged, perm) => ({
    can_view: merged.can_view || perm.can_view,
    can_create: merged.can_create || perm.can_create,
    can_edit: merged.can_edit || perm.can_edit,
    can_delete: merged.can_delete || perm.can_delete,
    can_assign: merged.can_assign || perm.can_assign,
    can_approve: merged.can_approve || perm.can_approve,
    can_export: merged.can_export || perm.can_export,
    can_upload_proof: merged.can_upload_proof || perm.can_upload_proof,
    can_view_sensitive: merged.can_view_sensitive || perm.can_view_sensitive,
    scope_mode: scopePriority.indexOf(merged.scope_mode) <= scopePriority.indexOf(perm.scope_mode)
      ? merged.scope_mode
      : perm.scope_mode,
  }), { ...EMPTY_PERMISSION });
}

/**
 * useRecordAccessMode - Enterprise access mode resolver for detail pages.
 * Returns FULL_DETAIL, SUMMARY_READONLY, or NO_ACCESS for a given record.
 */
import { useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useEnterpriseRBAC } from '@/hooks/useEnterpriseRBAC';
import type { ModuleKey } from '@/lib/rbac/permissions';

export type RecordAccessMode = 'FULL_DETAIL' | 'SUMMARY_READONLY' | 'NO_ACCESS';

export interface RecordOwnership {
  created_by?: string | null;
  owner_id?: string | null;
  secondary_owner_ids?: string[] | null;
  company_id?: string | null;
}

/**
 * Checks if the current user has full detail access to a record.
 * Full detail access is granted if:
 * - User is admin (platform or company)
 * - User is the record creator
 * - User is the record owner
 * - User is in secondary_owner_ids
 */
export function checkFullDetailAccess(
  record: RecordOwnership | null,
  userId: string | undefined,
  isAdmin: boolean,
): boolean {
  if (isAdmin) return true;
  if (!record || !userId) return false;

  return (
    record.created_by === userId ||
    record.owner_id === userId ||
    (Array.isArray(record.secondary_owner_ids) && record.secondary_owner_ids.includes(userId))
  );
}

/**
 * Hook to determine access mode for a record on a detail page.
 */
export function useRecordAccessMode(
  record: RecordOwnership | null,
  module: ModuleKey,
): RecordAccessMode {
  const { user } = useAuth();
  const { isCompanyAdmin, isPlatformAdmin, canViewModule } = useEnterpriseRBAC();

  return useMemo(() => {
    if (!record) return 'NO_ACCESS';
    if (!canViewModule(module)) return 'NO_ACCESS';

    const isAdmin = isCompanyAdmin || isPlatformAdmin;
    const hasFullAccess = checkFullDetailAccess(record, user?.id, isAdmin);

    if (hasFullAccess) return 'FULL_DETAIL';
    return 'SUMMARY_READONLY';
  }, [record, user?.id, isCompanyAdmin, isPlatformAdmin, canViewModule, module]);
}

/**
 * Convenience helpers built on top of access mode.
 */
export function useRecordPermissions(record: RecordOwnership | null, module: ModuleKey) {
  const accessMode = useRecordAccessMode(record, module);

  return useMemo(() => ({
    accessMode,
    canViewFullDetail: accessMode === 'FULL_DETAIL',
    canViewFinancials: accessMode === 'FULL_DETAIL',
    canEditRecord: accessMode === 'FULL_DETAIL',
    canDeleteRecord: accessMode === 'FULL_DETAIL',
    canExportFinancials: accessMode === 'FULL_DETAIL',
    canViewSensitiveContacts: accessMode === 'FULL_DETAIL',
    isReadOnly: accessMode === 'SUMMARY_READONLY',
    isBlocked: accessMode === 'NO_ACCESS',
  }), [accessMode]);
}

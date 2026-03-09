/**
 * useRestrictedFields - Hook that combines RBAC permissions with ownership
 * to provide field-level access context for any module.
 * 
 * Usage:
 *   const { access, filterRecord, filterRecords, visibleColumns, isRestricted } = useRestrictedFields('plans', record);
 */
import { useMemo, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useEnterpriseRBAC } from '@/hooks/useEnterpriseRBAC';
import { checkFullDetailAccess, type RecordOwnership } from '@/hooks/useRecordAccessMode';
import {
  type RestrictedModule,
  type FieldAccessContext,
  filterRestrictedFields,
  filterRestrictedRecords,
  getVisibleColumns,
  isFieldRestricted,
  getMaskedValue,
  getRestrictedFieldNames,
} from '@/lib/rbac/restrictedFields';
import type { ModuleKey } from '@/lib/rbac/permissions';
import { logActivity } from '@/utils/activityLogger';

// Map restricted module to RBAC module key
const MODULE_MAP: Record<RestrictedModule, ModuleKey> = {
  clients: 'clients',
  plans: 'plans',
  campaigns: 'campaigns',
  invoices: 'finance',
  payments: 'finance',
  media_assets: 'media_assets',
  operations: 'operations',
};

export interface UseRestrictedFieldsResult {
  /** Current field access context */
  access: FieldAccessContext;
  /** Filter a single record */
  filterRecord: <T extends Record<string, any>>(record: T) => T;
  /** Filter an array of records */
  filterRecords: <T extends Record<string, any>>(records: T[]) => T[];
  /** Filter column definitions */
  visibleColumns: <C extends { accessorKey?: string; id?: string }>(columns: C[]) => C[];
  /** Check if a specific field is restricted */
  isRestricted: (fieldName: string) => boolean;
  /** Get masked value for a field */
  masked: (fieldName: string, value: any) => { value: any; isMasked: boolean };
  /** Get list of restricted field names */
  restrictedFieldNames: string[];
  /** Whether user has full financial visibility */
  canViewFinancial: boolean;
  /** Whether user has contact visibility */
  canViewContacts: boolean;
}

/**
 * Primary hook for restricted field filtering.
 * 
 * @param module - The restricted module key
 * @param record - Optional ownership record for detail-page context.
 *                 When provided, ownership is checked for full-detail access.
 *                 When null/undefined, only role-based permissions apply.
 */
export function useRestrictedFields(
  module: RestrictedModule,
  record?: RecordOwnership | null,
): UseRestrictedFieldsResult {
  const { user } = useAuth();
  const rbac = useEnterpriseRBAC();

  const rbacModule = MODULE_MAP[module];

  const access: FieldAccessContext = useMemo(() => {
    // Admin bypass
    if (rbac.isPlatformAdmin || rbac.isCompanyAdmin) {
      return { canViewFinancial: true, canViewContacts: true, canViewInternal: true };
    }

    // Check ownership if record is provided
    const hasOwnership = record
      ? checkFullDetailAccess(record, user?.id, false)
      : false;

    // Role-based permission from role_permissions table
    const rolePerm = rbac.permissions[rbacModule];
    const roleCanViewSensitive = rolePerm?.can_view_sensitive ?? false;

    // Financial: owner OR role has can_view_sensitive (will use can_view_financial when available)
    const canViewFinancial = hasOwnership || roleCanViewSensitive;

    // Contacts: owner OR role has can_view_sensitive (will use can_view_contacts when available)
    const canViewContacts = hasOwnership || roleCanViewSensitive;

    return {
      canViewFinancial,
      canViewContacts,
      canViewInternal: canViewFinancial,
    };
  }, [rbac.isPlatformAdmin, rbac.isCompanyAdmin, rbac.permissions, rbacModule, record, user?.id]);

  const filterRecord = useCallback(<T extends Record<string, any>>(rec: T): T => {
    return filterRestrictedFields(module, rec, access);
  }, [module, access]);

  const filterRecordsFn = useCallback(<T extends Record<string, any>>(records: T[]): T[] => {
    return filterRestrictedRecords(module, records, access);
  }, [module, access]);

  const visibleColumnsFn = useCallback(<C extends { accessorKey?: string; id?: string }>(columns: C[]): C[] => {
    return getVisibleColumns(module, columns, access);
  }, [module, access]);

  const isRestrictedFn = useCallback((fieldName: string): boolean => {
    const restricted = isFieldRestricted(module, fieldName, access);
    // Log restricted access attempts for audit
    if (restricted && user?.id) {
      logActivity('view', 'plan', undefined, undefined, {
        restricted_field: fieldName,
        module,
        access_denied: true,
      }).catch(() => {});
    }
    return restricted;
  }, [module, access, user?.id]);

  const maskedFn = useCallback((fieldName: string, value: any) => {
    return getMaskedValue(module, fieldName, value, access);
  }, [module, access]);

  const restrictedFieldNames = useMemo(() => {
    return getRestrictedFieldNames(module, access);
  }, [module, access]);

  return {
    access,
    filterRecord,
    filterRecords: filterRecordsFn,
    visibleColumns: visibleColumnsFn,
    isRestricted: isRestrictedFn,
    masked: maskedFn,
    restrictedFieldNames,
    canViewFinancial: access.canViewFinancial,
    canViewContacts: access.canViewContacts,
  };
}

/**
 * useScopedQuery - Applies RBAC scope filtering to Supabase queries.
 * Returns a function that modifies a query builder based on user's scope_mode.
 * 
 * Usage:
 *   const { applyScopeFilter } = useScopedQuery('plans');
 *   let query = supabase.from('plans').select('*');
 *   query = applyScopeFilter(query);
 */
import { useCallback } from 'react';
import { useEnterpriseRBAC } from '@/hooks/useEnterpriseRBAC';
import { useAuth } from '@/contexts/AuthContext';
import type { ModuleKey } from '@/lib/rbac/permissions';

interface ScopeFilterOptions {
  /** Override the ownership column (default: 'created_by') */
  ownerColumn?: string;
  /** Additional ownership columns to OR against (e.g., 'sales_owner_id') */
  additionalOwnerColumns?: string[];
  /** Assignment column for 'assigned' scope (default: 'assigned_to') */
  assignmentColumn?: string;
  /** Additional assignment columns (e.g., 'assigned_mounter_id') */
  additionalAssignmentColumns?: string[];
}

export function useScopedQuery(module: ModuleKey, options: ScopeFilterOptions = {}) {
  const { getScopeMode, isPlatformAdmin, isCompanyAdmin, loading: rbacLoading } = useEnterpriseRBAC();
  const { user } = useAuth();

  const {
    ownerColumn = 'created_by',
    additionalOwnerColumns = [],
    assignmentColumn = 'assigned_to',
    additionalAssignmentColumns = [],
  } = options;

  const applyScopeFilter = useCallback(
    (query: any) => {
      // While RBAC is still loading, don't restrict — return all (will re-filter after load)
      if (rbacLoading) return query;
      // Admins see everything
      if (isPlatformAdmin || isCompanyAdmin) return query;

      const scopeMode = getScopeMode(module);
      const userId = user?.id;

      if (!userId) return query;

      switch (scopeMode) {
        case 'all':
        case 'basic_all':
          // No row filter, but basic_all may hide sensitive columns (handled at field level)
          return query;

        case 'own': {
          // Filter to records owned by this user using OR across ownership columns
          const allOwnerCols = [ownerColumn, ...additionalOwnerColumns].filter(Boolean);
          const orFilter = allOwnerCols.map(col => `${col}.eq.${userId}`).join(',');
          return query.or(orFilter);
        }

        case 'assigned': {
          // Filter to records assigned to this user
          const allCols = [
            ownerColumn,
            ...additionalOwnerColumns,
            assignmentColumn,
            ...additionalAssignmentColumns,
          ].filter(Boolean);
          const orFilter = allCols.map(col => `${col}.eq.${userId}`).join(',');
          return query.or(orFilter);
        }

        case 'team':
          // For now, treat team as own (team membership not yet tracked)
          return query.eq(ownerColumn, userId);

        case 'none':
          // Return empty result by filtering impossible condition
          return query.eq('id', '00000000-0000-0000-0000-000000000000');

        default:
          return query;
      }
    },
    [rbacLoading, getScopeMode, isPlatformAdmin, isCompanyAdmin, user, module, ownerColumn, additionalOwnerColumns, assignmentColumn, additionalAssignmentColumns]
  );

  /**
   * Filter an already-fetched array of records client-side by scope.
   */
  const filterByScope = useCallback(
    (records: any[]) => {
      // While RBAC is still loading, return all records (will re-filter after load)
      if (rbacLoading) return records;
      if (isPlatformAdmin || isCompanyAdmin) return records;

      const scopeMode = getScopeMode(module);
      const userId = user?.id;

      if (!userId) return records;

      switch (scopeMode) {
        case 'all':
        case 'basic_all':
          return records;
        case 'own': {
          const ownerCols = [ownerColumn, ...additionalOwnerColumns];
          return records.filter(r => ownerCols.some(col => r[col] === userId));
        }
        case 'assigned': {
          const allCols = [ownerColumn, ...additionalOwnerColumns, assignmentColumn, ...additionalAssignmentColumns];
          return records.filter(r => allCols.some(col => r[col] === userId));
        }
        case 'team': {
          const ownerCols = [ownerColumn, ...additionalOwnerColumns];
          return records.filter(r => ownerCols.some(col => r[col] === userId));
        }
        case 'none':
          return [];
        default:
          return records;
      }
    },
    [getScopeMode, isPlatformAdmin, isCompanyAdmin, user, module, ownerColumn, additionalOwnerColumns, assignmentColumn, additionalAssignmentColumns]
  );

  return { applyScopeFilter, filterByScope, scopeMode: getScopeMode(module) };
}

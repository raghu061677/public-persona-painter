import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

type AppRole = 'admin' | 'sales' | 'operations' | 'finance' | 'user';

interface Permission {
  module: string;
  can_view: boolean;
  can_create: boolean;
  can_update: boolean;
  can_delete: boolean;
}

interface PermissionsMap {
  [module: string]: Permission;
}

export function usePermissions() {
  const { roles, isAdmin } = useAuth();
  const [permissions, setPermissions] = useState<PermissionsMap>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPermissions();
  }, [roles]);

  const loadPermissions = async () => {
    if (!roles || roles.length === 0) {
      setLoading(false);
      return;
    }

    try {
      // Fetch all permissions for user's roles
      const { data, error } = await supabase
        .from('role_permissions')
        .select('*')
        .in('role', roles);

      if (error) throw error;

      // Merge permissions - if user has multiple roles, take the most permissive
      const mergedPermissions: PermissionsMap = {};
      
      (data || []).forEach((perm: any) => {
        const module = perm.module;
        if (!mergedPermissions[module]) {
          mergedPermissions[module] = {
            module,
            can_view: perm.can_view || false,
            can_create: perm.can_create || false,
            can_update: perm.can_update || false,
            can_delete: perm.can_delete || false,
          };
        } else {
          // Take the most permissive setting for each permission
          mergedPermissions[module].can_view = mergedPermissions[module].can_view || perm.can_view;
          mergedPermissions[module].can_create = mergedPermissions[module].can_create || perm.can_create;
          mergedPermissions[module].can_update = mergedPermissions[module].can_update || perm.can_update;
          mergedPermissions[module].can_delete = mergedPermissions[module].can_delete || perm.can_delete;
        }
      });

      setPermissions(mergedPermissions);
    } catch (error) {
      console.error('Error loading permissions:', error);
    } finally {
      setLoading(false);
    }
  };

  // Helper functions for permission checks
  const canView = (module: string): boolean => {
    if (isAdmin) return true;
    return permissions[module]?.can_view || false;
  };

  const canCreate = (module: string): boolean => {
    if (isAdmin) return true;
    return permissions[module]?.can_create || false;
  };

  const canUpdate = (module: string): boolean => {
    if (isAdmin) return true;
    return permissions[module]?.can_update || false;
  };

  const canDelete = (module: string): boolean => {
    if (isAdmin) return true;
    return permissions[module]?.can_delete || false;
  };

  const canAccess = (module: string, action: 'view' | 'create' | 'update' | 'delete'): boolean => {
    if (isAdmin) return true;
    
    switch (action) {
      case 'view':
        return canView(module);
      case 'create':
        return canCreate(module);
      case 'update':
        return canUpdate(module);
      case 'delete':
        return canDelete(module);
      default:
        return false;
    }
  };

  const hasAnyPermission = (module: string): boolean => {
    if (isAdmin) return true;
    const perm = permissions[module];
    return perm?.can_view || perm?.can_create || perm?.can_update || perm?.can_delete || false;
  };

  return {
    permissions,
    loading,
    canView,
    canCreate,
    canUpdate,
    canDelete,
    canAccess,
    hasAnyPermission,
  };
}

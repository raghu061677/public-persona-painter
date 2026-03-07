/**
 * ModuleGuard - Route-level permission gate using enterprise RBAC.
 * Wraps page content and denies access if user lacks can_view for the module.
 */
import { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useEnterpriseRBAC } from '@/hooks/useEnterpriseRBAC';
import type { ModuleKey } from '@/lib/rbac/permissions';
import { Loader2, ShieldAlert } from 'lucide-react';

interface ModuleGuardProps {
  children: ReactNode;
  module: ModuleKey;
  /** If true, redirect to /admin/access-denied instead of inline message */
  redirect?: boolean;
}

export function ModuleGuard({ children, module, redirect = false }: ModuleGuardProps) {
  const { loading, canViewModule } = useEnterpriseRBAC();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!canViewModule(module)) {
    if (redirect) {
      return <Navigate to="/admin/access-denied" replace />;
    }
    return (
      <div className="flex flex-col items-center justify-center min-h-[40vh] gap-3 text-center px-4">
        <ShieldAlert className="h-12 w-12 text-muted-foreground/50" />
        <h2 className="text-lg font-semibold text-foreground">Access Restricted</h2>
        <p className="text-sm text-muted-foreground max-w-md">
          You don't have permission to access this module. Contact your administrator to request access.
        </p>
      </div>
    );
  }

  return <>{children}</>;
}

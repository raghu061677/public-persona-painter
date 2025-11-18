import { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useRBAC, PlatformRole, CompanyRole, ModuleName } from '@/hooks/useRBAC';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface RoleGuardProps {
  children: ReactNode;
  
  // Role requirements
  requirePlatformRole?: PlatformRole;
  requireCompanyRole?: CompanyRole | CompanyRole[];
  
  // Module requirements
  requireModule?: ModuleName;
  requireEdit?: boolean; // Requires edit access to module
  
  // Fallback
  fallback?: ReactNode;
  redirectTo?: string;
}

export function RoleGuard({
  children,
  requirePlatformRole,
  requireCompanyRole,
  requireModule,
  requireEdit = false,
  fallback,
  redirectTo,
}: RoleGuardProps) {
  const rbac = useRBAC();

  // Check platform role
  if (requirePlatformRole && !rbac.hasPlatformRole(requirePlatformRole)) {
    if (redirectTo) return <Navigate to={redirectTo} replace />;
    if (fallback) return <>{fallback}</>;
    return <AccessDeniedMessage reason="platform_role" />;
  }

  // Check company role
  if (requireCompanyRole && !rbac.hasCompanyRole(requireCompanyRole)) {
    if (redirectTo) return <Navigate to={redirectTo} replace />;
    if (fallback) return <>{fallback}</>;
    return <AccessDeniedMessage reason="company_role" />;
  }

  // Check module access
  if (requireModule) {
    const hasAccess = requireEdit 
      ? rbac.canEditModule(requireModule)
      : rbac.canViewModule(requireModule);
    
    if (!hasAccess) {
      if (redirectTo) return <Navigate to={redirectTo} replace />;
      if (fallback) return <>{fallback}</>;
      return <AccessDeniedMessage reason="module" module={requireModule} />;
    }
  }

  return <>{children}</>;
}

function AccessDeniedMessage({ 
  reason, 
  module 
}: { 
  reason: 'platform_role' | 'company_role' | 'module';
  module?: ModuleName;
}) {
  const getMessage = () => {
    switch (reason) {
      case 'platform_role':
        return 'This area is only accessible to Platform Administrators.';
      case 'company_role':
        return 'You do not have the required company role to access this area.';
      case 'module':
        return `You do not have permission to access the ${module} module.`;
      default:
        return 'Access denied.';
    }
  };

  return (
    <div className="flex items-center justify-center min-h-[60vh] p-4">
      <Alert className="max-w-md border-destructive/50">
        <ShieldAlert className="h-5 w-5 text-destructive" />
        <AlertTitle className="text-lg font-semibold mb-2">Access Denied</AlertTitle>
        <AlertDescription className="space-y-4">
          <p className="text-sm text-muted-foreground">{getMessage()}</p>
          <p className="text-sm text-muted-foreground">
            If you believe you should have access, please contact your administrator.
          </p>
          <Button 
            variant="outline" 
            onClick={() => window.history.back()}
            className="w-full"
          >
            Go Back
          </Button>
        </AlertDescription>
      </Alert>
    </div>
  );
}

// Convenience components for common guards
export function PlatformAdminGuard({ children }: { children: ReactNode }) {
  return (
    <RoleGuard requirePlatformRole="platform_admin" redirectTo="/admin/dashboard">
      {children}
    </RoleGuard>
  );
}

export function CompanyAdminGuard({ children }: { children: ReactNode }) {
  return (
    <RoleGuard requireCompanyRole="company_admin" redirectTo="/admin/dashboard">
      {children}
    </RoleGuard>
  );
}

export function FinanceGuard({ children }: { children: ReactNode }) {
  return (
    <RoleGuard requireCompanyRole={['company_admin', 'accounts']} redirectTo="/admin/dashboard">
      {children}
    </RoleGuard>
  );
}

export function OperationsGuard({ children }: { children: ReactNode }) {
  return (
    <RoleGuard requireCompanyRole={['company_admin', 'operations']} redirectTo="/admin/dashboard">
      {children}
    </RoleGuard>
  );
}

export function SalesGuard({ children }: { children: ReactNode }) {
  return (
    <RoleGuard requireCompanyRole={['company_admin', 'sales']} redirectTo="/admin/dashboard">
      {children}
    </RoleGuard>
  );
}

import { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { usePermissions } from '@/hooks/usePermissions';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ShieldAlert, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

type AppRole = 'admin' | 'sales' | 'operations' | 'finance' | 'user';

interface ProtectedRouteProps {
  children: ReactNode;
  requireAuth?: boolean;
  requiredRole?: AppRole | AppRole[];
  requiredModule?: string;
  requiredAction?: 'view' | 'create' | 'update' | 'delete';
  redirectTo?: string;
}

export function ProtectedRoute({
  children,
  requireAuth = true,
  requiredRole,
  requiredModule,
  requiredAction = 'view',
  redirectTo = '/auth',
}: ProtectedRouteProps) {
  const { user, roles, loading: authLoading, isAdmin } = useAuth();
  const { canAccess, loading: permLoading } = usePermissions();

  // Show loading state while checking authentication
  if (authLoading || permLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Check authentication
  if (requireAuth && !user) {
    return <Navigate to={redirectTo} replace />;
  }

  // Check role requirement
  if (requiredRole && !isAdmin) {
    const requiredRoles = Array.isArray(requiredRole) ? requiredRole : [requiredRole];
    const hasRequiredRole = requiredRoles.some(role => roles.includes(role));
    
    if (!hasRequiredRole) {
      return <AccessDenied reason="insufficient_role" requiredRole={requiredRoles} />;
    }
  }

  // Check module permission
  if (requiredModule && !isAdmin) {
    if (!canAccess(requiredModule, requiredAction)) {
      return <AccessDenied reason="insufficient_permission" module={requiredModule} action={requiredAction} />;
    }
  }

  return <>{children}</>;
}

interface AccessDeniedProps {
  reason: 'insufficient_role' | 'insufficient_permission';
  requiredRole?: AppRole[];
  module?: string;
  action?: string;
}

function AccessDenied({ reason, requiredRole, module, action }: AccessDeniedProps) {
  return (
    <div className="flex items-center justify-center min-h-screen p-4">
      <Card className="max-w-md w-full">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <ShieldAlert className="h-16 w-16 text-destructive" />
          </div>
          <CardTitle className="text-2xl">Access Denied</CardTitle>
          <CardDescription>
            {reason === 'insufficient_role' && requiredRole && (
              <>You need one of the following roles to access this page: {requiredRole.join(', ')}</>
            )}
            {reason === 'insufficient_permission' && module && (
              <>You don't have permission to {action} {module.replace('_', ' ')}</>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center">
          <p className="text-sm text-muted-foreground mb-4">
            Contact your administrator if you believe this is an error.
          </p>
          <Button onClick={() => window.history.back()} variant="outline">
            Go Back
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

import { ReactNode } from 'react';
import { usePermissions } from '@/hooks/usePermissions';
import { useAuth } from '@/contexts/AuthContext';

interface PermissionGateProps {
  children: ReactNode;
  module: string;
  action: 'view' | 'create' | 'update' | 'delete';
  fallback?: ReactNode;
}

/**
 * Component to conditionally render children based on permissions
 * Used to show/hide UI elements based on user permissions
 */
export function PermissionGate({ 
  children, 
  module, 
  action, 
  fallback = null 
}: PermissionGateProps) {
  const { isAdmin } = useAuth();
  const { canAccess, loading } = usePermissions();

  // Admins always have access
  if (isAdmin) {
    return <>{children}</>;
  }

  // Don't show anything while loading
  if (loading) {
    return null;
  }

  // Check permission
  if (canAccess(module, action)) {
    return <>{children}</>;
  }

  return <>{fallback}</>;
}

interface RoleGateProps {
  children: ReactNode;
  allowedRoles: ('admin' | 'sales' | 'operations' | 'finance' | 'user')[];
  fallback?: ReactNode;
}

/**
 * Component to conditionally render children based on user roles
 */
export function RoleGate({ children, allowedRoles, fallback = null }: RoleGateProps) {
  const { roles, isAdmin, loading } = useAuth();

  // Admins always have access
  if (isAdmin) {
    return <>{children}</>;
  }

  // Don't show anything while loading
  if (loading) {
    return null;
  }

  // Check if user has any of the allowed roles
  const hasAccess = allowedRoles.some(role => roles.includes(role));

  if (hasAccess) {
    return <>{children}</>;
  }

  return <>{fallback}</>;
}

import { ROLE_DASHBOARDS } from "@/lib/routes";

// Valid role types based on database enum (expanded)
type AppRole = 'admin' | 'sales' | 'operations' | 'operations_manager' | 'finance' | 'installation' | 'mounting' | 'monitor' | 'monitoring' | 'viewer' | 'user' | 'manager';

/**
 * Get the appropriate dashboard route based on user's primary role
 * Priority order: admin > sales > operations_manager > operations > finance > mounting > monitoring > viewer > user
 */
export function getRoleDashboard(roles: AppRole[]): string {
  const rolePriority: AppRole[] = [
    'admin', 'sales', 'operations_manager', 'operations', 'finance',
    'installation', 'mounting', 'monitor', 'monitoring', 'viewer', 'user', 'manager'
  ];
  
  for (const role of rolePriority) {
    if (roles.includes(role)) {
      // Field operations users go to mobile dashboard
      if (role === 'installation' || role === 'mounting' || role === 'monitor' || role === 'monitoring') {
        return '/mobile';
      }
      // Operations manager goes to operations
      if (role === 'operations_manager' || role === 'operations' || role === 'manager') {
        return ROLE_DASHBOARDS.operations || '/admin/operations';
      }
      return ROLE_DASHBOARDS[role as keyof typeof ROLE_DASHBOARDS] || ROLE_DASHBOARDS.user;
    }
  }
  
  return ROLE_DASHBOARDS.user;
}

/**
 * Check if user has permission to access a route based on their roles
 */
export function canAccessRoute(roles: AppRole[], requiredRole: AppRole): boolean {
  if (roles.includes('admin')) return true;
  if (roles.includes(requiredRole)) return true;
  
  // Handle aliases
  if (requiredRole === 'operations' && roles.includes('operations_manager')) return true;
  if (requiredRole === 'operations_manager' && roles.includes('operations')) return true;
  if (requiredRole === 'mounting' && roles.includes('installation')) return true;
  if (requiredRole === 'installation' && roles.includes('mounting')) return true;
  if (requiredRole === 'monitoring' && roles.includes('monitor')) return true;
  if (requiredRole === 'monitor' && roles.includes('monitoring')) return true;
  
  return false;
}

/**
 * Get user-friendly label for a role
 */
export function getRoleLabel(role: AppRole): string {
  const labels: Record<AppRole, string> = {
    admin: 'Administrator',
    sales: 'Sales Manager',
    operations: 'Operations Manager',
    operations_manager: 'Operations Manager',
    finance: 'Finance Manager',
    installation: 'Mounting / Installation',
    mounting: 'Mounting / Installation',
    monitor: 'Monitoring',
    monitoring: 'Monitoring',
    viewer: 'Viewer',
    user: 'User',
    manager: 'Operations Manager',
  };
  
  return labels[role] || role;
}

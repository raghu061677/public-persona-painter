import { ROLE_DASHBOARDS } from "@/lib/routes";

// Valid role types based on database enum
type AppRole = 'admin' | 'sales' | 'operations' | 'finance' | 'user';

/**
 * Get the appropriate dashboard route based on user's primary role
 * Priority order: admin > sales > operations > finance > user
 */
export function getRoleDashboard(roles: AppRole[]): string {
  // Priority order for role-based redirects
  const rolePriority: AppRole[] = ['admin', 'sales', 'operations', 'finance', 'user'];
  
  // Find the highest priority role the user has
  for (const role of rolePriority) {
    if (roles.includes(role)) {
      return ROLE_DASHBOARDS[role];
    }
  }
  
  // Default fallback
  return ROLE_DASHBOARDS.user;
}

/**
 * Check if user has permission to access a route based on their roles
 */
export function canAccessRoute(roles: AppRole[], requiredRole: AppRole): boolean {
  // Admin can access everything
  if (roles.includes('admin')) return true;
  
  // Check if user has the required role
  return roles.includes(requiredRole);
}

/**
 * Get user-friendly label for a role
 */
export function getRoleLabel(role: AppRole): string {
  const labels: Record<AppRole, string> = {
    admin: 'Administrator',
    sales: 'Sales Manager',
    operations: 'Operations Manager',
    finance: 'Finance Manager',
    user: 'User',
  };
  
  return labels[role] || role;
}

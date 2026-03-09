/**
 * Role normalization and compatibility mapping for Go-Ads 360° RBAC.
 * Maps legacy/variant role names to standard internal role keys.
 */

/** Standard role keys used in the permission system */
export type StandardRole =
  | 'platform_admin'
  | 'admin'
  | 'sales'
  | 'operations_manager'
  | 'mounting'
  | 'monitoring'
  | 'finance'
  | 'viewer';

/** All role keys including legacy ones that may exist in the database */
export type AnyRole = StandardRole
  | 'operations'
  | 'installation'
  | 'monitor'
  | 'manager'
  | 'user'
  | 'accounts'
  | 'company_admin'
  | 'ops'
  | 'mounter';

/**
 * Map any raw role string to its canonical standard role.
 * Ensures backward compatibility with legacy role names.
 */
export function normalizeRole(rawRole: string): StandardRole {
  const mapping: Record<string, StandardRole> = {
    // Direct standard roles
    platform_admin: 'platform_admin',
    admin: 'admin',
    sales: 'sales',
    operations_manager: 'operations_manager',
    mounting: 'mounting',
    monitoring: 'monitoring',
    finance: 'finance',
    viewer: 'viewer',

    // Legacy aliases
    company_admin: 'admin',
    ops: 'operations_manager',
    operations: 'operations_manager',
    manager: 'operations_manager',
    installation: 'mounting',
    mounter: 'mounting',
    monitor: 'monitoring',
    accounts: 'finance',
    user: 'viewer',
  };

  return mapping[rawRole?.toLowerCase?.()] ?? 'viewer';
}

/**
 * Get the DB role key to query role_permissions table.
 * Returns the raw role if it exists in DB, otherwise falls back.
 * This is needed because role_permissions has rows for legacy roles too.
 */
export function getPermissionQueryRole(rawRole: string): string {
  // These roles have direct entries in role_permissions table
  const directRoles = [
    'admin', 'sales', 'finance', 'operations', 'operations_manager',
    'mounting', 'monitoring', 'installation', 'monitor', 'manager',
    'user', 'viewer',
  ];
  if (directRoles.includes(rawRole)) return rawRole;
  
  // Fallback mapping for roles not directly in DB
  const fallback: Record<string, string> = {
    company_admin: 'admin',
    ops: 'operations',
    accounts: 'finance',
    mounter: 'mounting',
    platform_admin: 'admin',
  };
  return fallback[rawRole] ?? 'user';
}

/** Human-readable label for any role */
export function getRoleLabel(role: string): string {
  const labels: Record<string, string> = {
    platform_admin: 'Platform Admin',
    admin: 'Administrator',
    sales: 'Sales',
    operations_manager: 'Operations Manager',
    operations: 'Operations Manager',
    mounting: 'Mounting / Installation',
    installation: 'Mounting / Installation',
    monitoring: 'Monitoring',
    monitor: 'Monitoring',
    finance: 'Finance',
    accounts: 'Finance',
    viewer: 'Viewer',
    user: 'Viewer',
    manager: 'Operations Manager',
    company_admin: 'Company Admin',
    mounter: 'Mounting / Installation',
    ops: 'Operations Manager',
  };
  return labels[role] ?? role;
}

/** Role badge color class for UI display */
export function getRoleBadgeVariant(role: string): string {
  const normalized = normalizeRole(role);
  const variants: Record<StandardRole, string> = {
    platform_admin: 'bg-destructive text-destructive-foreground',
    admin: 'bg-destructive/90 text-destructive-foreground',
    sales: 'bg-blue-500/90 text-white',
    operations_manager: 'bg-emerald-600 text-white',
    mounting: 'bg-amber-500 text-white',
    monitoring: 'bg-cyan-600 text-white',
    finance: 'bg-purple-600 text-white',
    viewer: 'bg-muted text-muted-foreground',
  };
  return variants[normalized] ?? 'bg-muted text-muted-foreground';
}

/** List of all standard assignable company roles (excludes platform_admin) */
export const STANDARD_COMPANY_ROLES: StandardRole[] = [
  'admin',
  'sales',
  'operations_manager',
  'mounting',
  'monitoring',
  'finance',
  'viewer',
];

/** Sensitive commercial fields that should be masked for unauthorized users */
export const SENSITIVE_FIELDS = [
  'base_rate',
  'card_rate',
  'negotiated_rate',
  'final_rate',
  'vendor_rate',
  'purchase_cost',
  'mounting_cost',
  'printing_cost',
  'margin',
  'gross_revenue',
  'net_revenue',
  'profit',
  'payment_status',
  'outstanding',
  'invoice_amount',
  'commission',
  'internal_notes_finance',
  'rent_amount',
  'daily_rate',
  'base_rate_monthly',
  'total_price',
  'mounting_charges',
  'printing_charges',
  'mounting_cost_default',
  'printing_cost_default',
  'mounting_rate_per_sqft',
  'printing_rate_per_sqft',
  // Additional financial fields used in list views
  'grand_total',
  'total_amount',
  'balance_due',
  'paid_amount',
  'subtotal',
  'cgst_amount',
  'sgst_amount',
  'igst_amount',
  'taxable_amount',
  'discount_amount',
  'amount',
  'amount_before_tax',
  'net_payable',
  // Client contact fields - sensitive for non-owners
  'email',
  'phone',
  'contact_person',
  'mobile',
  'work_phone',
  'designation',
] as const;

export type SensitiveField = typeof SENSITIVE_FIELDS[number];

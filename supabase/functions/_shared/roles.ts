/**
 * Canonical role definitions for Go-Ads 360°.
 * Single source of truth for all edge functions.
 */

export const CANONICAL_ROLES = [
  'admin',
  'sales',
  'operations_manager',
  'mounting',
  'monitoring',
  'finance',
  'viewer',
] as const;

export type CanonicalRole = typeof CANONICAL_ROLES[number];

const ALIAS_MAP: Record<string, CanonicalRole> = {
  // Direct canonical
  admin: 'admin',
  sales: 'sales',
  operations_manager: 'operations_manager',
  mounting: 'mounting',
  monitoring: 'monitoring',
  finance: 'finance',
  viewer: 'viewer',
  // Legacy aliases
  ops: 'operations_manager',
  operations: 'operations_manager',
  manager: 'operations_manager',
  installation: 'mounting',
  mounter: 'mounting',
  monitor: 'monitoring',
  accounts: 'finance',
  user: 'viewer',
  company_admin: 'admin',
};

/**
 * Normalize any role string to a canonical role.
 * Returns null if the role is completely unknown.
 */
export function normalizeRoleServer(raw: string | null | undefined): CanonicalRole | null {
  if (!raw) return null;
  return ALIAS_MAP[raw.toLowerCase().trim()] ?? null;
}

/**
 * Validate and normalize a role, returning the canonical value or throwing.
 */
export function validateRole(raw: string | null | undefined): CanonicalRole {
  const normalized = normalizeRoleServer(raw);
  if (!normalized) {
    throw new Error(`Invalid role: "${raw}". Must be one of: ${CANONICAL_ROLES.join(', ')}`);
  }
  return normalized;
}

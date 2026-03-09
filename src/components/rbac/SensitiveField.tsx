/**
 * SensitiveField component - masks commercial/contact data for unauthorized users.
 * Now backed by the centralized Restricted Fields Framework.
 * 
 * Usage: <SensitiveField module="plans" field="negotiated_rate" value={plan.negotiated_rate} record={plan} />
 */
import { ReactNode } from 'react';
import { useEnterpriseRBAC } from '@/hooks/useEnterpriseRBAC';
import type { ModuleKey } from '@/lib/rbac/permissions';
import type { RestrictedModule, FieldAccessContext } from '@/lib/rbac/restrictedFields';
import { isFieldRestricted, getMaskedValue } from '@/lib/rbac/restrictedFields';

// Map ModuleKey to RestrictedModule where applicable
function toRestrictedModule(module: ModuleKey): RestrictedModule | null {
  const map: Partial<Record<ModuleKey, RestrictedModule>> = {
    clients: 'clients',
    plans: 'plans',
    campaigns: 'campaigns',
    finance: 'invoices',
    media_assets: 'media_assets',
    operations: 'operations',
  };
  return map[module] ?? null;
}

interface SensitiveFieldProps {
  module: ModuleKey;
  field: string;
  value: any;
  record?: any;
  /** Custom render for masked state */
  maskedDisplay?: ReactNode;
  /** Format function for the value when visible */
  format?: (value: any) => ReactNode;
  children?: (value: any, isMasked: boolean) => ReactNode;
}

export function SensitiveField({
  module,
  field,
  value,
  record,
  maskedDisplay,
  format,
  children,
}: SensitiveFieldProps) {
  const { isPlatformAdmin, isCompanyAdmin, getFieldAccess } = useEnterpriseRBAC();

  // Admin bypass
  if (isPlatformAdmin || isCompanyAdmin) {
    if (children) return <>{children(value, false)}</>;
    if (format) return <>{format(value)}</>;
    return <>{value ?? '—'}</>;
  }

  const restrictedModule = toRestrictedModule(module);
  const access: FieldAccessContext = getFieldAccess(module, record);

  // Check restriction using centralized registry
  const restricted = restrictedModule
    ? isFieldRestricted(restrictedModule, field, access)
    : false;

  if (!restricted) {
    if (children) return <>{children(value, false)}</>;
    if (format) return <>{format(value)}</>;
    return <>{value ?? '—'}</>;
  }

  // Masked state
  if (children) return <>{children(null, true)}</>;
  if (maskedDisplay) return <>{maskedDisplay}</>;
  
  return <span className="text-muted-foreground select-none">••••••</span>;
}

/**
 * Hook version for programmatic use in tables/lists.
 * Now delegates to the Restricted Fields Framework.
 */
export function useSensitiveFieldMask(module: ModuleKey) {
  const { isPlatformAdmin, isCompanyAdmin, getFieldAccess } = useEnterpriseRBAC();
  const restrictedModule = toRestrictedModule(module);

  return {
    mask: (field: string, value: any, record?: any) => {
      if (isPlatformAdmin || isCompanyAdmin) return value;
      if (!restrictedModule) return value;
      
      const access = getFieldAccess(module, record);
      const { value: masked } = getMaskedValue(restrictedModule, field, value, access);
      return masked ?? value;
    },
    canSee: (field: string, record?: any) => {
      if (isPlatformAdmin || isCompanyAdmin) return true;
      if (!restrictedModule) return true;
      
      const access = getFieldAccess(module, record);
      return !isFieldRestricted(restrictedModule, field, access);
    },
  };
}

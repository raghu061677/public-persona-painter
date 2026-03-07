/**
 * SensitiveField component - masks commercial data for unauthorized users.
 * Usage: <SensitiveField module="plans" field="negotiated_rate" value={plan.negotiated_rate} record={plan} />
 */
import { ReactNode } from 'react';
import { useEnterpriseRBAC } from '@/hooks/useEnterpriseRBAC';
import type { ModuleKey } from '@/lib/rbac/permissions';
import { SENSITIVE_FIELDS } from '@/lib/rbac/roleNormalization';

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
  const { canViewSensitive, isPlatformAdmin, isCompanyAdmin } = useEnterpriseRBAC();

  // Check if this field is in the sensitive list
  const isSensitive = (SENSITIVE_FIELDS as readonly string[]).includes(field);
  
  // If not sensitive, or user has access, show the real value
  if (!isSensitive || isPlatformAdmin || isCompanyAdmin || canViewSensitive(module, record)) {
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
 */
export function useSensitiveFieldMask(module: ModuleKey) {
  const { canViewSensitive, isPlatformAdmin, isCompanyAdmin, maskSensitiveValue } = useEnterpriseRBAC();

  return {
    mask: (field: string, value: any, record?: any) => {
      const isSensitive = (SENSITIVE_FIELDS as readonly string[]).includes(field);
      if (!isSensitive || isPlatformAdmin || isCompanyAdmin || canViewSensitive(module, record)) {
        return value;
      }
      return typeof value === 'number' ? null : '••••••';
    },
    canSee: (field: string, record?: any) => {
      const isSensitive = (SENSITIVE_FIELDS as readonly string[]).includes(field);
      if (!isSensitive) return true;
      return isPlatformAdmin || isCompanyAdmin || canViewSensitive(module, record);
    },
  };
}

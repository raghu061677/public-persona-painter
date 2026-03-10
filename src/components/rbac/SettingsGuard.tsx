/**
 * SettingsGuard — Sub-permission guard for /admin/company-settings/* pages.
 * 
 * Uses the 'settings' ModuleKey from enterprise RBAC.
 * Admin role gets full access. Other roles get filtered access based on
 * a settings access policy map.
 */
import { ReactNode } from 'react';
import { useEnterpriseRBAC } from '@/hooks/useEnterpriseRBAC';
import { Loader2, ShieldAlert } from 'lucide-react';

export type SettingsSection =
  | 'profile'
  | 'branding'
  | 'email_providers'
  | 'email_templates'
  | 'email_outbox'
  | 'alerts'
  | 'reminders'
  | 'taxes'
  | 'direct_taxes'
  | 'einvoicing'
  | 'general'
  | 'currencies'
  | 'client_portal'
  | 'payments'
  | 'sales'
  | 'rate_settings'
  | 'concession_contracts'
  | 'pdf_templates'
  | 'sms_notifications'
  | 'digital_signature'
  | 'automation'
  | 'workflows'
  | 'integrations'
  | 'developer'
  | 'users'
  | 'roles';

/** Sections that ONLY admin can access */
const ADMIN_ONLY_SECTIONS: SettingsSection[] = [
  'email_providers',
  'taxes',
  'direct_taxes',
  'einvoicing',
  'integrations',
  'developer',
  'users',
  'roles',
];

/** Sections accessible to admin + authorized editor roles (settings can_edit) */
const EDITOR_SECTIONS: SettingsSection[] = [
  'profile',
  'branding',
  'email_templates',
  'email_outbox',
  'alerts',
  'reminders',
  'general',
  'currencies',
  'client_portal',
  'payments',
  'sales',
  'rate_settings',
  'concession_contracts',
  'pdf_templates',
  'sms_notifications',
  'digital_signature',
  'automation',
  'workflows',
];

export function isAdminOnlySection(section: SettingsSection): boolean {
  return ADMIN_ONLY_SECTIONS.includes(section);
}

export function canAccessSettingsSection(
  section: SettingsSection,
  isAdmin: boolean,
  canViewSettings: boolean,
  canEditSettings: boolean,
): boolean {
  if (isAdmin) return true;
  if (isAdminOnlySection(section)) return false;
  // Editor sections need at least settings view
  return canViewSettings;
}

export function canEditSettingsSection(
  section: SettingsSection,
  isAdmin: boolean,
  canEditSettings: boolean,
): boolean {
  if (isAdmin) return true;
  if (isAdminOnlySection(section)) return false;
  return canEditSettings;
}

interface SettingsGuardProps {
  children: ReactNode;
  section: SettingsSection;
}

export function SettingsGuard({ children, section }: SettingsGuardProps) {
  const { loading, isCompanyAdmin, canViewModule, canEdit } = useEnterpriseRBAC();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const canView = canViewModule('settings');
  const canEditMod = canEdit('settings');
  const hasAccess = canAccessSettingsSection(section, isCompanyAdmin, canView, canEditMod);

  if (!hasAccess) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[40vh] gap-3 text-center px-4">
        <ShieldAlert className="h-12 w-12 text-muted-foreground/50" />
        <h2 className="text-lg font-semibold text-foreground">Access Restricted</h2>
        <p className="text-sm text-muted-foreground max-w-md">
          You don't have permission to access this settings section. Contact your administrator to request access.
        </p>
      </div>
    );
  }

  return <>{children}</>;
}

/**
 * Hook for settings pages to check if current user can edit the section.
 */
export function useSettingsAccess(section: SettingsSection) {
  const { loading, isCompanyAdmin, canViewModule, canEdit } = useEnterpriseRBAC();

  const canView = canViewModule('settings');
  const canEditMod = canEdit('settings');

  return {
    loading,
    canView: canAccessSettingsSection(section, isCompanyAdmin, canView, canEditMod),
    canEdit: canEditSettingsSection(section, isCompanyAdmin, canEditMod),
    isAdmin: isCompanyAdmin,
  };
}

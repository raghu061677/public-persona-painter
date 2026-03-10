/**
 * SettingsPageWrapper — Wraps settings page content with RBAC-aware read-only mode.
 * 
 * When the user lacks edit permission for a section:
 * - Shows a "View only" banner at the top
 * - Disables all interactive elements (inputs, buttons, switches, selects) via CSS pointer-events
 * - Provides a React context so child components can check `isReadOnly`
 * 
 * This avoids modifying every individual settings page while still enforcing RBAC.
 */
import { createContext, ReactNode, useContext } from 'react';
import { useSettingsAccess, type SettingsSection } from '@/components/rbac/SettingsGuard';
import { Eye } from 'lucide-react';

interface SettingsReadOnlyContextValue {
  isReadOnly: boolean;
  canView: boolean;
  isAdmin: boolean;
}

const SettingsReadOnlyContext = createContext<SettingsReadOnlyContextValue>({
  isReadOnly: false,
  canView: true,
  isAdmin: false,
});

export function useSettingsReadOnly() {
  return useContext(SettingsReadOnlyContext);
}

interface SettingsPageWrapperProps {
  children: ReactNode;
  section: SettingsSection;
}

export function SettingsPageWrapper({ children, section }: SettingsPageWrapperProps) {
  const { canView, canEdit, isAdmin, loading } = useSettingsAccess(section);
  const isReadOnly = !canEdit;

  if (loading) return null; // SettingsGuard already shows loader

  return (
    <SettingsReadOnlyContext.Provider value={{ isReadOnly, canView, isAdmin }}>
      {isReadOnly && (
        <div className="mb-4 flex items-center gap-2 rounded-lg border border-border bg-muted/50 px-4 py-2.5 text-sm text-muted-foreground">
          <Eye className="h-4 w-4 shrink-0" />
          <span>You have <strong>view-only</strong> access to this section. Contact an administrator to make changes.</span>
        </div>
      )}
      <div className={isReadOnly ? 'settings-read-only' : undefined}>
        {children}
      </div>
    </SettingsReadOnlyContext.Provider>
  );
}

import { useState, useEffect, forwardRef, useImperativeHandle } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Loader2, Save, Shield } from "lucide-react";
import { Badge } from "@/components/ui/badge";

type AppRole = 'admin' | 'sales' | 'operations_manager' | 'finance' | 'mounting' | 'monitoring' | 'viewer';

export interface RolePermissionsMatrixRef {
  selectRole: (role: string) => void;
}

interface RolePermission {
  id: string;
  role: AppRole;
  module: string;
  can_view: boolean;
  can_create: boolean;
  can_update: boolean;
  can_delete: boolean;
}

const MODULES = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'media_assets', label: 'Media Assets' },
  { id: 'clients', label: 'Clients' },
  { id: 'leads', label: 'Leads' },
  { id: 'plans', label: 'Plans' },
  { id: 'estimations', label: 'Estimations' },
  { id: 'proformas', label: 'Proformas' },
  { id: 'campaigns', label: 'Campaigns' },
  { id: 'monitoring', label: 'Monitoring' },
  { id: 'invoices', label: 'Invoices' },
  { id: 'expenses', label: 'Expenses' },
  { id: 'power_bills', label: 'Power Bills' },
  { id: 'company_settings', label: 'Company Settings' },
  { id: 'settings', label: 'Settings' },
  { id: 'users', label: 'User Management' },
  { id: 'user_management', label: 'User Access' },
  { id: 'role_permissions', label: 'Role Permissions' },
];

const ROLES: { id: AppRole; label: string; color: string }[] = [
  { id: 'admin', label: 'Admin', color: 'bg-red-100 text-red-800' },
  { id: 'sales', label: 'Sales', color: 'bg-blue-100 text-blue-800' },
  { id: 'operations_manager', label: 'Operations Manager', color: 'bg-green-100 text-green-800' },
  { id: 'finance', label: 'Finance', color: 'bg-yellow-100 text-yellow-800' },
  { id: 'mounting', label: 'Mounting', color: 'bg-purple-100 text-purple-800' },
  { id: 'monitoring', label: 'Monitoring', color: 'bg-cyan-100 text-cyan-800' },
  { id: 'viewer', label: 'Viewer', color: 'bg-gray-100 text-gray-800' },
];

// Map legacy role names from System Roles cards to canonical DB roles
const ROLE_ALIAS_MAP: Record<string, AppRole> = {
  admin: 'admin',
  sales: 'sales',
  operations: 'operations_manager',
  operations_manager: 'operations_manager',
  finance: 'finance',
  mounting: 'mounting',
  monitoring: 'monitoring',
  viewer: 'viewer',
};

export const RolePermissionsMatrix = forwardRef<RolePermissionsMatrixRef>(function RolePermissionsMatrix(_props, ref) {
  const [permissions, setPermissions] = useState<RolePermission[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedRole, setSelectedRole] = useState<AppRole>('sales');

  useImperativeHandle(ref, () => ({
    selectRole: (role: string) => {
      const canonical = ROLE_ALIAS_MAP[role] || role;
      const match = ROLES.find(r => r.id === canonical);
      if (match) setSelectedRole(match.id);
    },
  }));

  useEffect(() => {
    loadPermissions();
  }, []);

  const loadPermissions = async () => {
    try {
      const { data, error } = await supabase
        .from('role_permissions')
        .select('*')
        .order('module');

      if (error) throw error;
      
      // Map database structure to component interface
      const mappedData: RolePermission[] = (data || []).map((item: any) => ({
        id: item.id,
        role: item.role as AppRole,
        module: item.module,
        can_view: item.can_view ?? false,
        can_create: item.can_create ?? false,
        can_update: item.can_update ?? false,
        can_delete: item.can_delete ?? false,
      }));
      
      setPermissions(mappedData);
    } catch (error) {
      console.error('Error loading permissions:', error);
      toast.error('Failed to load permissions');
    } finally {
      setLoading(false);
    }
  };

  const getPermission = (role: AppRole, module: string): RolePermission => {
    const found = permissions.find(p => p.role === role && p.module === module);
    if (found) return found;
    // Return a default (all false) for missing entries
    return {
      id: `new-${role}-${module}`,
      role,
      module,
      can_view: false,
      can_create: false,
      can_update: false,
      can_delete: false,
    };
  };

  const togglePermission = (role: AppRole, module: string, field: keyof Omit<RolePermission, 'id' | 'role' | 'module'>) => {
    setPermissions(prev => {
      const existing = prev.find(p => p.role === role && p.module === module);
      if (existing) {
        return prev.map(p => 
          p.id === existing.id 
            ? { ...p, [field]: !p[field] }
            : p
        );
      }
      // Create new entry for previously missing permission
      const newPerm: RolePermission = {
        id: `new-${role}-${module}`,
        role,
        module,
        can_view: false,
        can_create: false,
        can_update: false,
        can_delete: false,
        [field]: true,
      };
      return [...prev, newPerm];
    });
  };

  const savePermissions = async () => {
    setSaving(true);
    try {
      const updates = permissions.map(perm => ({
        id: perm.id,
        role: perm.role,
        module: perm.module,
        can_view: perm.can_view,
        can_create: perm.can_create,
        can_update: perm.can_update,
        can_delete: perm.can_delete,
      }));

      const { error } = await supabase
        .from('role_permissions')
        .upsert(updates);

      if (error) throw error;

      toast.success('Permissions saved successfully');
    } catch (error) {
      console.error('Error saving permissions:', error);
      toast.error('Failed to save permissions');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  const rolePermissions = permissions.filter(p => p.role === selectedRole);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            <CardTitle>Role Permissions Matrix</CardTitle>
          </div>
          <Button onClick={savePermissions} disabled={saving}>
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Save Changes
              </>
            )}
          </Button>
        </div>
        <CardDescription>
          Configure granular module-level permissions for each user role
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Role Selector */}
        <div className="flex gap-2 flex-wrap">
          {ROLES.map(role => (
            <Badge
              key={role.id}
              variant={selectedRole === role.id ? "default" : "outline"}
              className={`cursor-pointer px-4 py-2 ${selectedRole === role.id ? role.color : ''}`}
              onClick={() => setSelectedRole(role.id)}
            >
              {role.label}
            </Badge>
          ))}
        </div>

        {/* Permissions Table */}
        <div className="rounded-md border">
          <table className="w-full">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="p-3 text-left font-medium">Module</th>
                <th className="p-3 text-center font-medium w-24">View</th>
                <th className="p-3 text-center font-medium w-24">Create</th>
                <th className="p-3 text-center font-medium w-24">Edit</th>
                <th className="p-3 text-center font-medium w-24">Delete</th>
              </tr>
            </thead>
            <tbody>
              {MODULES.map(module => {
                const perm = getPermission(selectedRole, module.id);
                if (!perm) return null;

                return (
                  <tr key={module.id} className="border-b hover:bg-muted/50 transition-colors">
                    <td className="p-3 font-medium">{module.label}</td>
                    <td className="p-3 text-center">
                      <Checkbox
                        checked={perm.can_view}
                        onCheckedChange={() => togglePermission(selectedRole, module.id, 'can_view')}
                      />
                    </td>
                    <td className="p-3 text-center">
                      <Checkbox
                        checked={perm.can_create}
                        onCheckedChange={() => togglePermission(selectedRole, module.id, 'can_create')}
                      />
                    </td>
                    <td className="p-3 text-center">
                      <Checkbox
                        checked={perm.can_update}
                        onCheckedChange={() => togglePermission(selectedRole, module.id, 'can_update')}
                      />
                    </td>
                    <td className="p-3 text-center">
                      <Checkbox
                        checked={perm.can_delete}
                        onCheckedChange={() => togglePermission(selectedRole, module.id, 'can_delete')}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="text-sm text-muted-foreground">
          <p>
            <strong>Note:</strong> Admin role always has full permissions. Changes to admin permissions will not affect actual access.
          </p>
        </div>
      </CardContent>
    </Card>
  );
});
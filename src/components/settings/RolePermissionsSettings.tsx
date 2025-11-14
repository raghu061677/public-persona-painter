import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Shield, Save, RotateCcw } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";

interface Permission {
  view: boolean;
  create: boolean;
  update: boolean;
  delete: boolean;
}

interface RolePermissions {
  [module: string]: Permission;
}

const MODULES = [
  { key: 'media_assets', label: 'Media Assets' },
  { key: 'clients', label: 'Clients' },
  { key: 'plans', label: 'Plans & Quotations' },
  { key: 'campaigns', label: 'Campaigns' },
  { key: 'operations', label: 'Operations & Proofs' },
  { key: 'invoices', label: 'Invoices' },
  { key: 'expenses', label: 'Expenses' },
  { key: 'power_bills', label: 'Power Bills' },
  { key: 'reports', label: 'Reports & Analytics' },
  { key: 'settings', label: 'Settings' },
  { key: 'users', label: 'User Management' },
  { key: 'companies', label: 'Company Management' },
];

const ROLES = [
  { key: 'admin', label: 'Admin', color: 'bg-red-500' },
  { key: 'sales', label: 'Sales', color: 'bg-blue-500' },
  { key: 'operations', label: 'Operations', color: 'bg-green-500' },
  { key: 'finance', label: 'Finance', color: 'bg-yellow-500' },
  { key: 'user', label: 'Viewer', color: 'bg-gray-500' },
];

const ACTIONS = [
  { key: 'view', label: 'View' },
  { key: 'create', label: 'Create' },
  { key: 'update', label: 'Update' },
  { key: 'delete', label: 'Delete' },
];

export function RolePermissionsSettings() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selectedRole, setSelectedRole] = useState('sales');
  const [permissions, setPermissions] = useState<RolePermissions>({});
  const [originalPermissions, setOriginalPermissions] = useState<RolePermissions>({});

  useEffect(() => {
    loadPermissions();
  }, [selectedRole]);

  const loadPermissions = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('role_permissions')
        .select('*')
        .eq('role', selectedRole);

      if (error) throw error;

      const perms: RolePermissions = {};
      data?.forEach((perm: any) => {
        perms[perm.module] = {
          view: perm.can_view,
          create: perm.can_create,
          update: perm.can_update,
          delete: perm.can_delete,
        };
      });

      setPermissions(perms);
      setOriginalPermissions(perms);
    } catch (error: any) {
      console.error("Error loading permissions:", error);
      toast({
        title: "Failed to load permissions",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePermissionChange = (module: string, action: keyof Permission, value: boolean) => {
    setPermissions(prev => ({
      ...prev,
      [module]: {
        ...prev[module],
        [action]: value,
      },
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // Update each module's permissions
      for (const module of MODULES) {
        const perm = permissions[module.key] || { view: false, create: false, update: false, delete: false };
        
        const { error } = await supabase
          .from('role_permissions')
          .upsert({
            role: selectedRole,
            module: module.key,
            can_view: perm.view,
            can_create: perm.create,
            can_update: perm.update,
            can_delete: perm.delete,
          }, {
            onConflict: 'role,module',
          });

        if (error) throw error;
      }

      setOriginalPermissions(permissions);

      toast({
        title: "✅ Permissions updated",
        description: `Role permissions for ${ROLES.find(r => r.key === selectedRole)?.label} have been saved`,
      });
    } catch (error: any) {
      console.error("Error saving permissions:", error);
      toast({
        title: "Failed to save permissions",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setPermissions(originalPermissions);
    toast({
      title: "Changes discarded",
      description: "Permissions reset to last saved state",
    });
  };

  const hasChanges = JSON.stringify(permissions) !== JSON.stringify(originalPermissions);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Shield className="h-5 w-5" />
          <CardTitle>Role-Based Permissions</CardTitle>
        </div>
        <CardDescription>
          Configure granular access controls for each role across all modules
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Role Selector */}
        <div className="space-y-3">
          <Label>Select Role</Label>
          <div className="flex gap-2 flex-wrap">
            {ROLES.map(role => (
              <Button
                key={role.key}
                variant={selectedRole === role.key ? "default" : "outline"}
                onClick={() => setSelectedRole(role.key)}
                className="gap-2"
              >
                <div className={`w-3 h-3 rounded-full ${role.color}`} />
                {role.label}
              </Button>
            ))}
          </div>
        </div>

        <Separator />

        {/* Permissions Matrix */}
        {loading ? (
          <div className="text-center py-8 text-muted-foreground">Loading permissions...</div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-5 gap-4 pb-2 border-b font-medium text-sm">
              <div>Module</div>
              {ACTIONS.map(action => (
                <div key={action.key} className="text-center">{action.label}</div>
              ))}
            </div>

            {MODULES.map(module => {
              const perm = permissions[module.key] || { view: false, create: false, update: false, delete: false };
              
              return (
                <div key={module.key} className="grid grid-cols-5 gap-4 items-center py-2 hover:bg-muted/50 rounded px-2">
                  <div className="font-medium text-sm">{module.label}</div>
                  
                  {ACTIONS.map(action => (
                    <div key={action.key} className="flex justify-center">
                      <Switch
                        checked={perm[action.key as keyof Permission]}
                        onCheckedChange={(checked) => 
                          handlePermissionChange(module.key, action.key as keyof Permission, checked)
                        }
                      />
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-2 justify-end pt-4 border-t">
          <Button
            variant="outline"
            onClick={handleReset}
            disabled={!hasChanges || saving}
          >
            <RotateCcw className="h-4 w-4 mr-2" />
            Reset
          </Button>
          <Button
            onClick={handleSave}
            disabled={!hasChanges || saving}
          >
            <Save className="h-4 w-4 mr-2" />
            {saving ? "Saving..." : "Save Permissions"}
          </Button>
        </div>

        {/* Info */}
        <div className="bg-blue-50 dark:bg-blue-950 p-4 rounded-lg text-sm space-y-2">
          <p className="font-medium">💡 Permission Guidelines:</p>
          <ul className="space-y-1 text-muted-foreground ml-4 list-disc">
            <li><strong>Admin</strong> - Full access to all modules</li>
            <li><strong>Sales</strong> - Manage clients, plans, campaigns</li>
            <li><strong>Operations</strong> - Handle installations and proof uploads</li>
            <li><strong>Finance</strong> - Access invoices, expenses, billing</li>
            <li><strong>Viewer</strong> - Read-only access to assigned modules</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}

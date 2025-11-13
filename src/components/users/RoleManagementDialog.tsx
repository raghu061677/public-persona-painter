import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Shield } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface UserProfile {
  id: string;
  username: string;
  email: string;
}

interface RoleManagementDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: UserProfile | null;
  onSuccess: () => void;
}

const AVAILABLE_ROLES = [
  { value: 'admin' as const, label: 'Admin', description: 'Full system access', color: 'bg-red-500' },
  { value: 'sales' as const, label: 'Sales', description: 'Plans, Clients, Campaigns', color: 'bg-blue-500' },
  { value: 'operations' as const, label: 'Operations', description: 'Field app, Proof uploads', color: 'bg-green-500' },
  { value: 'finance' as const, label: 'Finance', description: 'Invoices, Payments, Expenses', color: 'bg-yellow-500' },
  { value: 'user' as const, label: 'User', description: 'Basic access', color: 'bg-gray-500' },
];

type AppRole = typeof AVAILABLE_ROLES[number]['value'];

export function RoleManagementDialog({ open, onOpenChange, user, onSuccess }: RoleManagementDialogProps) {
  const [selectedRoles, setSelectedRoles] = useState<AppRole[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (open && user) {
      loadUserRoles();
    }
  }, [open, user]);

  const loadUserRoles = async () => {
    if (!user) return;

    setFetching(true);
    try {
      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id);

      if (error) throw error;

      setSelectedRoles((data?.map(r => r.role) || []) as AppRole[]);
    } catch (error: any) {
      toast({
        title: "Error loading roles",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setFetching(false);
    }
  };

  const toggleRole = (role: AppRole) => {
    setSelectedRoles(prev => 
      prev.includes(role) 
        ? prev.filter(r => r !== role)
        : [...prev, role]
    );
  };

  const handleSave = async () => {
    if (!user) return;

    setLoading(true);
    try {
      // Get current roles
      const { data: currentRoles, error: fetchError } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id);

      if (fetchError) throw fetchError;

      const currentRoleValues = (currentRoles?.map(r => r.role) || []) as AppRole[];

      // Determine roles to add and remove
      const rolesToAdd = selectedRoles.filter(r => !currentRoleValues.includes(r));
      const rolesToRemove = currentRoleValues.filter(r => !selectedRoles.includes(r as AppRole));

      // Remove roles
      if (rolesToRemove.length > 0) {
        const { error: deleteError } = await supabase
          .from('user_roles')
          .delete()
          .eq('user_id', user.id)
          .in('role', rolesToRemove);

        if (deleteError) throw deleteError;
      }

      // Add roles
      if (rolesToAdd.length > 0) {
        const { error: insertError } = await supabase
          .from('user_roles')
          .insert(rolesToAdd.map(role => ({
            user_id: user.id,
            role: role as AppRole
          })));

        if (insertError) throw insertError;
      }

      // Log activity
      await supabase.rpc('log_activity', {
        p_action: 'update',
        p_resource_type: 'user_roles',
        p_resource_id: user.id,
        p_resource_name: user.username,
        p_details: {
          added_roles: rolesToAdd,
          removed_roles: rolesToRemove,
          final_roles: selectedRoles
        }
      });

      toast({
        title: "Roles updated",
        description: `Successfully updated roles for ${user.username}`,
      });

      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      toast({
        title: "Error updating roles",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (!user) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Manage User Roles
          </DialogTitle>
          <DialogDescription>
            Assign or remove roles for {user.username} ({user.email})
          </DialogDescription>
        </DialogHeader>

        {fetching ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-4 py-4">
            <div className="flex items-center gap-2 mb-4">
              <span className="text-sm font-medium">Current Roles:</span>
              {selectedRoles.length === 0 ? (
                <Badge variant="outline">No roles assigned</Badge>
              ) : (
                selectedRoles.map(role => {
                  const roleInfo = AVAILABLE_ROLES.find(r => r.value === role);
                  return (
                    <Badge key={role} className={roleInfo?.color}>
                      {roleInfo?.label || role}
                    </Badge>
                  );
                })
              )}
            </div>

            <div className="space-y-3">
              {AVAILABLE_ROLES.map(role => (
                <div
                  key={role.value}
                  className="flex items-start space-x-3 rounded-lg border p-4 hover:bg-accent/50 transition-colors"
                >
                  <Checkbox
                    id={`role-${role.value}`}
                    checked={selectedRoles.includes(role.value)}
                    onCheckedChange={() => toggleRole(role.value)}
                  />
                  <div className="flex-1 space-y-1">
                    <Label
                      htmlFor={`role-${role.value}`}
                      className="flex items-center gap-2 cursor-pointer"
                    >
                      <span className={`inline-block w-2 h-2 rounded-full ${role.color}`} />
                      <span className="font-medium">{role.label}</span>
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      {role.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-4 p-4 bg-muted/50 rounded-lg">
              <p className="text-sm text-muted-foreground">
                <strong>Note:</strong> Users can have multiple roles. Admins have full system access regardless of other roles.
              </p>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={loading || fetching}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Roles
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

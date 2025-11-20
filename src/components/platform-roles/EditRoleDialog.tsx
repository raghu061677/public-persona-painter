import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ModulePermissions } from "./ModulePermissions";
import { useQuery } from "@tanstack/react-query";

interface EditRoleDialogProps {
  role: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

const MODULES = [
  "Companies Management",
  "User Management",
  "Billing & Subscriptions",
  "Multi-Tenant Reports",
  "Marketplace",
  "Clients",
  "Plans",
  "Campaigns",
  "Operations",
  "Finance",
  "Settings",
];

export function EditRoleDialog({ role, open, onOpenChange, onSuccess }: EditRoleDialogProps) {
  const [loading, setLoading] = useState(false);
  const [description, setDescription] = useState(role.description || "");
  const [permissions, setPermissions] = useState<Record<string, any>>({});

  const { data: existingPermissions } = useQuery({
    queryKey: ["role-permissions", role.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("platform_role_permissions")
        .select("*")
        .eq("role_id", role.id);
      
      if (error) throw error;
      return data;
    },
    enabled: open,
  });

  useEffect(() => {
    if (existingPermissions) {
      const permsMap: Record<string, any> = {};
      existingPermissions.forEach((perm: any) => {
        permsMap[perm.module_name] = {
          view: perm.can_view,
          create: perm.can_create,
          update: perm.can_update,
          delete: perm.can_delete,
        };
      });
      setPermissions(permsMap);
    }
  }, [existingPermissions]);

  const handleSubmit = async () => {
    setLoading(true);
    try {
      // Update role description
      const { error: roleError } = await supabase
        .from("platform_roles")
        .update({ description: description.trim() || null })
        .eq("id", role.id);

      if (roleError) throw roleError;

      // Delete existing permissions
      await supabase
        .from("platform_role_permissions")
        .delete()
        .eq("role_id", role.id);

      // Insert new permissions
      const permissionInserts = Object.entries(permissions).map(([module, perms]: [string, any]) => ({
        role_id: role.id,
        module_name: module,
        can_view: perms.view || false,
        can_create: perms.create || false,
        can_update: perms.update || false,
        can_delete: perms.delete || false,
      }));

      if (permissionInserts.length > 0) {
        const { error: permError } = await supabase
          .from("platform_role_permissions")
          .insert(permissionInserts);

        if (permError) throw permError;
      }

      toast({
        title: "Success",
        description: "Role updated successfully",
      });

      onSuccess();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Role: {role.role_name}</DialogTitle>
          <DialogDescription>
            Update role description and permissions
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="details" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="details">Role Details</TabsTrigger>
            <TabsTrigger value="permissions">Permissions</TabsTrigger>
          </TabsList>

          <TabsContent value="details" className="space-y-4">
            <div>
              <Label>Role Name</Label>
              <Input value={role.role_name} disabled />
            </div>
            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Describe the role and its responsibilities"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                disabled={role.is_system_role}
              />
            </div>
          </TabsContent>

          <TabsContent value="permissions" className="space-y-4">
            <ModulePermissions
              modules={MODULES}
              permissions={permissions}
              onChange={setPermissions}
            />
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? "Updating..." : "Update Role"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

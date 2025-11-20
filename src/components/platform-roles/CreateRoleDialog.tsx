import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ModulePermissions } from "./ModulePermissions";

interface CreateRoleDialogProps {
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

export function CreateRoleDialog({ open, onOpenChange, onSuccess }: CreateRoleDialogProps) {
  const [loading, setLoading] = useState(false);
  const [roleName, setRoleName] = useState("");
  const [description, setDescription] = useState("");
  const [permissions, setPermissions] = useState<Record<string, any>>({});

  const handleSubmit = async () => {
    if (!roleName.trim()) {
      toast({
        title: "Error",
        description: "Role name is required",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      // Create role
      const { data: role, error: roleError } = await supabase
        .from("platform_roles")
        .insert({
          role_name: roleName.trim(),
          description: description.trim() || null,
          is_system_role: false,
        })
        .select()
        .single();

      if (roleError) throw roleError;

      // Create permissions
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
        description: "Role created successfully",
      });

      setRoleName("");
      setDescription("");
      setPermissions({});
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
          <DialogTitle>Create Platform Role</DialogTitle>
          <DialogDescription>
            Define a new platform role with custom permissions
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="details" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="details">Role Details</TabsTrigger>
            <TabsTrigger value="permissions">Permissions</TabsTrigger>
          </TabsList>

          <TabsContent value="details" className="space-y-4">
            <div>
              <Label htmlFor="role-name">Role Name</Label>
              <Input
                id="role-name"
                placeholder="e.g., platform_manager"
                value={roleName}
                onChange={(e) => setRoleName(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Describe the role and its responsibilities"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
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
            {loading ? "Creating..." : "Create Role"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

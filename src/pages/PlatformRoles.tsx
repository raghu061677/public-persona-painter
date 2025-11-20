import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Shield, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PlatformRolesTable } from "@/components/platform-roles/PlatformRolesTable";
import { CreateRoleDialog } from "@/components/platform-roles/CreateRoleDialog";
import { EditRoleDialog } from "@/components/platform-roles/EditRoleDialog";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

export default function PlatformRoles() {
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editRole, setEditRole] = useState<any>(null);

  const { data: roles, isLoading, refetch } = useQuery({
    queryKey: ["platform-roles"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("platform_roles")
        .select("*")
        .order("role_name");
      
      if (error) throw error;
      return data;
    },
  });

  const handleDeleteRole = async (roleId: string) => {
    try {
      const { error } = await supabase
        .from("platform_roles")
        .delete()
        .eq("id", roleId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Role deleted successfully",
      });
      refetch();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  return (
    <div className="h-full flex flex-col space-y-6 p-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Roles & Permissions</h1>
          <p className="text-muted-foreground">
            Configure platform-level role definitions and permissions
          </p>
        </div>
        <Button onClick={() => setCreateDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Create Role
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Platform Role Configuration
          </CardTitle>
          <CardDescription>
            Define and manage global role settings for platform administration
          </CardDescription>
        </CardHeader>
        <CardContent>
          <PlatformRolesTable
            roles={roles || []}
            loading={isLoading}
            onEdit={setEditRole}
            onDelete={handleDeleteRole}
          />
        </CardContent>
      </Card>

      <CreateRoleDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onSuccess={() => {
          refetch();
          setCreateDialogOpen(false);
        }}
      />

      {editRole && (
        <EditRoleDialog
          role={editRole}
          open={!!editRole}
          onOpenChange={(open) => !open && setEditRole(null)}
          onSuccess={() => {
            refetch();
            setEditRole(null);
          }}
        />
      )}
    </div>
  );
}

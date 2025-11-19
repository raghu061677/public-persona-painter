import { useEffect, useState } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { UserPlus, Shield, Activity } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { UsersList } from "@/components/users/UsersList";
import { InviteUserDialog } from "@/components/users/InviteUserDialog";
import { RolePermissionsMatrix } from "@/components/users/RolePermissionsMatrix";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function Users() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<any[]>([]);
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      setLoading(true);
      
      // Call the list-users edge function
      const { data, error } = await supabase.functions.invoke('list-users');
      
      if (error) throw error;

      if (data?.users) {
        setUsers(data.users);
      } else {
        setUsers([]);
      }
    } catch (error: any) {
      console.error('Error loading users:', error);
      toast({
        title: "Error loading users",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <PageHeader
        title="User Management"
        description="Manage team members, roles, and permissions"
        breadcrumbs={[
          { label: "Admin", href: "/admin" },
          { label: "Users" }
        ]}
      >
        <Button onClick={() => setInviteDialogOpen(true)}>
          <UserPlus className="mr-2 h-4 w-4" />
          Invite User
        </Button>
      </PageHeader>

      <Tabs defaultValue="users" className="space-y-6">
        <TabsList>
          <TabsTrigger value="users">
            <Shield className="mr-2 h-4 w-4" />
            Users
          </TabsTrigger>
          <TabsTrigger value="permissions">
            <Activity className="mr-2 h-4 w-4" />
            Permissions Matrix
          </TabsTrigger>
        </TabsList>

        <TabsContent value="users" className="space-y-4">
          <UsersList users={users} loading={loading} onRefresh={loadUsers} />
        </TabsContent>

        <TabsContent value="permissions" className="space-y-4">
          <RolePermissionsMatrix />
        </TabsContent>
      </Tabs>

      <InviteUserDialog
        open={inviteDialogOpen}
        onOpenChange={setInviteDialogOpen}
        onSuccess={loadUsers}
      />
    </div>
  );
}

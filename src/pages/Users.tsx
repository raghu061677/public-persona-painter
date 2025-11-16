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
      
      // Get all users from auth
      const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers();
      
      if (authError) throw authError;

      // Get profiles and roles
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*');

      const { data: roles, error: rolesError } = await supabase
        .from('user_roles')
        .select('*');

      if (profilesError) throw profilesError;
      if (rolesError) throw rolesError;

      // Merge data
      const mergedUsers = authUsers.users.map(user => {
        const profile = profiles?.find(p => p.id === user.id);
        const userRoles = roles?.filter(r => r.user_id === user.id).map(r => r.role) || [];
        
        return {
          id: user.id,
          email: user.email,
          username: profile?.username || 'Unknown',
          avatar_url: profile?.avatar_url,
          roles: userRoles,
          created_at: user.created_at,
          last_sign_in: user.last_sign_in_at,
        };
      });

      setUsers(mergedUsers);
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

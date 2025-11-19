import { useEffect, useState } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { UserPlus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { UsersList } from "@/components/users/UsersList";
import { InviteUserDialog } from "@/components/users/InviteUserDialog";
import { useAuth } from "@/contexts/AuthContext";

export default function Users() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<any[]>([]);
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [companyName, setCompanyName] = useState<string>("");

  useEffect(() => {
    if (user?.id) {
      loadCurrentCompany();
    }
  }, [user?.id]);

  useEffect(() => {
    if (companyId) {
      loadUsers();
    }
  }, [companyId]);

  const loadCurrentCompany = async () => {
    if (!user?.id) return;
    
    try {
      // Get user's primary company
      const { data, error } = await supabase
        .from('company_users')
        .select('company_id, companies(name)')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .order('is_primary', { ascending: false })
        .limit(1)
        .single();

      if (error) throw error;

      if (data) {
        setCompanyId(data.company_id);
        setCompanyName((data.companies as any)?.name || '');
      }
    } catch (error: any) {
      console.error('Error loading company:', error);
      toast({
        title: "Error",
        description: "Failed to load company information",
        variant: "destructive",
      });
    }
  };

  const loadUsers = async () => {
    if (!companyId) return;
    
    try {
      setLoading(true);
      
      // Get company users for the current company
      const { data: companyUsers, error: companyUsersError } = await supabase
        .from('company_users')
        .select(`
          user_id,
          role,
          status,
          joined_at
        `)
        .eq('company_id', companyId)
        .eq('status', 'active');

      if (companyUsersError) throw companyUsersError;

      if (!companyUsers || companyUsers.length === 0) {
        setUsers([]);
        return;
      }

      // Get user IDs
      const userIds = companyUsers.map(cu => cu.user_id);

      // Get profiles for these users
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, username, avatar_url')
        .in('id', userIds);

      if (profilesError) throw profilesError;

      // Try to get auth data from edge function (optional - will fail gracefully)
      let authUsers: any[] = [];
      try {
        const { data: authData } = await supabase.functions.invoke('list-users');
        if (authData?.users) {
          authUsers = authData.users;
        }
      } catch (error) {
        console.log('Could not load email data:', error);
      }

      // Merge all data
      const mergedUsers = companyUsers.map(cu => {
        const profile = profiles?.find(p => p.id === cu.user_id);
        const authUser = authUsers.find((au: any) => au.id === cu.user_id);
        
        return {
          id: cu.user_id,
          email: authUser?.email || 'N/A',
          username: profile?.username || authUser?.username || 'Unknown',
          avatar_url: profile?.avatar_url,
          roles: [cu.role],
          created_at: cu.joined_at,
          last_sign_in: authUser?.last_sign_in_at,
          status: cu.status,
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

  if (!companyId) {
    return (
      <div className="container mx-auto py-6">
        <Card>
          <CardContent className="p-6">
            <p className="text-muted-foreground">Loading company information...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <PageHeader
        title="User Management"
        description={`Manage team members for ${companyName}`}
        breadcrumbs={[
          { label: "Admin", href: "/admin" },
          { label: "Users" }
        ]}
      >
        <Button onClick={() => setInviteDialogOpen(true)}>
          <UserPlus className="mr-2 h-4 w-4" />
          Add User
        </Button>
      </PageHeader>

      <UsersList users={users} loading={loading} onRefresh={loadUsers} />

      <InviteUserDialog
        open={inviteDialogOpen}
        onOpenChange={setInviteDialogOpen}
        onSuccess={loadUsers}
        companyId={companyId}
      />
    </div>
  );
}

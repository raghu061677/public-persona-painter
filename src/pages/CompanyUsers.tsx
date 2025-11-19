import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { UserPlus, Shield, Mail, Calendar, MoreVertical } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { InviteUserDialog } from "@/components/users/InviteUserDialog";

interface CompanyUser {
  id: string;
  user_id: string;
  email: string;
  username: string;
  role: string;
  status: string;
  joined_at: string;
  is_primary: boolean;
}

export default function CompanyUsers() {
  const { companyId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [company, setCompany] = useState<any>(null);
  const [users, setUsers] = useState<CompanyUser[]>([]);
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);

  useEffect(() => {
    if (companyId) {
      loadCompanyData();
      loadUsers();
    }
  }, [companyId]);

  const loadCompanyData = async () => {
    try {
      const { data, error } = await supabase
        .from('companies')
        .select('*')
        .eq('id', companyId)
        .single();

      if (error) throw error;
      setCompany(data);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
      navigate('/admin/platform/companies');
    }
  };

  const loadUsers = async () => {
    try {
      setLoading(true);
      
      // Get company users with explicit typing
      const { data, error: companyUsersError } = await supabase
        .from('company_users')
        .select('*')
        .eq('company_id', companyId);

      if (companyUsersError) throw companyUsersError;
      
      if (!data || data.length === 0) {
        setUsers([]);
        return;
      }

      // Get auth users and profiles
      const { data: { users: authUsers }, error: authError } = await supabase.auth.admin.listUsers();
      if (authError) throw authError;

      const { data: profiles } = await supabase
        .from('profiles')
        .select('*');

      // Merge data - data is now properly typed by Supabase
      const mergedUsers: CompanyUser[] = data.map((cu) => {
        const authUser = authUsers.find(au => au.id === cu.user_id);
        const profile = profiles?.find(p => p.id === cu.user_id);

        return {
          id: cu.id,
          user_id: cu.user_id,
          email: authUser?.email || 'Unknown',
          username: profile?.username || 'Unknown',
          role: cu.role,
          status: cu.status || 'active',
          joined_at: cu.joined_at,
          is_primary: cu.is_primary || false,
        };
      });

      setUsers(mergedUsers);
    } catch (error: any) {
      console.error('Error loading users:', error);
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveUser = async (userId: string) => {
    try {
      const { error } = await supabase
        .from('company_users')
        .update({ status: 'inactive' })
        .eq('user_id', userId)
        .eq('company_id', companyId);

      if (error) throw error;

      toast({
        title: "User Removed",
        description: "User has been removed from the company",
      });

      loadUsers();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const getRoleBadgeColor = (role: string) => {
    const colors: Record<string, string> = {
      admin: "bg-red-100 text-red-800",
      sales: "bg-blue-100 text-blue-800",
      operations: "bg-green-100 text-green-800",
      finance: "bg-purple-100 text-purple-800",
      user: "bg-gray-100 text-gray-800",
    };
    return colors[role] || colors.user;
  };

  const getRoleLabel = (role: string) => {
    const labels: Record<string, string> = {
      admin: "Company Admin",
      sales: "Sales Executive",
      operations: "Operations / Mounting",
      finance: "Accounts / Finance",
      user: "Read-Only",
    };
    return labels[role] || role;
  };

  if (!company) {
    return null;
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <PageHeader
        title={`Users & Access - ${company.name}`}
        description="Manage users and their roles for this company"
        breadcrumbs={[
          { label: "Admin", href: "/admin" },
          { label: "Platform", href: "/admin/platform" },
          { label: "Companies", href: "/admin/platform/companies" },
          { label: company.name, href: `/admin/platform/companies/${companyId}` },
          { label: "Users" }
        ]}
      >
        <Button onClick={() => setInviteDialogOpen(true)}>
          <UserPlus className="mr-2 h-4 w-4" />
          Invite User
        </Button>
      </PageHeader>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Company Users ({users.length})
          </CardTitle>
          <CardDescription>
            Users assigned to {company.name} and their roles
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">Loading users...</div>
          ) : users.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No users assigned yet. Click "Invite User" to add team members.
            </div>
          ) : (
            <div className="space-y-4">
              {users.map((user) => (
                <div
                  key={user.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary font-semibold">
                      {user.username.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{user.username}</p>
                        {user.is_primary && (
                          <Badge variant="outline" className="text-xs">Primary</Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Mail className="h-3 w-3" />
                          {user.email}
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          Joined {new Date(user.joined_at).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <Badge className={getRoleBadgeColor(user.role)}>
                      {getRoleLabel(user.role)}
                    </Badge>
                    
                    <Badge variant={user.status === 'active' ? 'default' : 'secondary'}>
                      {user.status}
                    </Badge>

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleRemoveUser(user.user_id)}>
                          Remove from Company
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <InviteUserDialog
        open={inviteDialogOpen}
        onOpenChange={setInviteDialogOpen}
        onSuccess={loadUsers}
        companyId={companyId}
      />
    </div>
  );
}

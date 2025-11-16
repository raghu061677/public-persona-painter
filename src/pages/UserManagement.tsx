import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useCompany } from "@/contexts/CompanyContext";
import { ROUTES } from "@/lib/routes";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Search, UserPlus, Pencil, Trash2, Mail, Shield, Upload, Key, MoreVertical } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import EditUserDialog from "@/components/users/EditUserDialog";
import AddUserDialog from "@/components/users/AddUserDialog";
import UserPermissionsView from "@/components/users/UserPermissionsView";
import { RolePermissionsMatrix } from "@/components/users/RolePermissionsMatrix";
import TeamsManagement from "@/components/users/TeamsManagement";
import UserActivityDashboard from "@/components/users/UserActivityDashboard";
import BulkImportDialog from "@/components/users/BulkImportDialog";
import PasswordResetDialog from "@/components/users/PasswordResetDialog";
import { RoleManagementDialog } from "@/components/users/RoleManagementDialog";
import { AccessRequestsManager } from "@/components/users/AccessRequestsManager";
import { logAudit } from "@/utils/auditLog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface UserProfile {
  id: string;
  username: string;
  avatar_url?: string;
  created_at: string;
  email?: string;
  roles?: string[];
  status?: string;
}

const MODULES = [
  { key: 'sales', label: 'Sales' },
  { key: 'planning', label: 'Planning' },
  { key: 'execution', label: 'Execution' },
  { key: 'inventory', label: 'Inventory' },
  { key: 'finance', label: 'Finance' },
  { key: 'administration', label: 'Administration' },
];

const ROLES = ['admin', 'sales', 'operations', 'finance'];

export default function UserManagement() {
  const { isAdmin, user } = useAuth();
  const { company, isPlatformAdmin } = useCompany();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [rolePermissions, setRolePermissions] = useState<Record<string, Record<string, boolean>>>({});
  const [addUserOpen, setAddUserOpen] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<string>("sales");
  const [submitting, setSubmitting] = useState(false);
  const [editUser, setEditUser] = useState<UserProfile | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [bulkImportOpen, setBulkImportOpen] = useState(false);
  const [passwordResetOpen, setPasswordResetOpen] = useState(false);
  const [roleManagementOpen, setRoleManagementOpen] = useState(false);
  const [selectedUserForReset, setSelectedUserForReset] = useState<{
    id: string;
    email: string;
    username: string;
  } | null>(null);
  const [selectedUserForRoleManagement, setSelectedUserForRoleManagement] = useState<{
    id: string;
    email: string;
    username: string;
  } | null>(null);

  useEffect(() => {
    // Allow both admins and platform admins to access
    if (!isAdmin && !isPlatformAdmin) {
      toast({
        title: "Access Denied",
        description: "You need admin privileges to access user management. Please contact your platform administrator.",
        variant: "destructive",
      });
      navigate(ROUTES.DASHBOARD);
      return;
    }
    loadData();
  }, [isAdmin, isPlatformAdmin, navigate]);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Get current session
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast({
          title: "Authentication required",
          description: "Please log in to view users",
          variant: "destructive",
        });
        navigate("/auth");
        return;
      }

      // Fetch users via edge function
      const { data: usersData, error: usersError } = await supabase.functions.invoke('list-users', {
        headers: {
          Authorization: `Bearer ${session.access_token}`
        }
      });

      if (usersError) {
        console.error("Error fetching users:", usersError);
        throw usersError;
      }

      if (!usersData?.users) {
        throw new Error("No user data received");
      }

      setUsers(usersData.users);

      // Load role permissions
      const { data: permsData, error: permsError } = await supabase
        .from("role_permissions")
        .select("*");
      if (permsError) throw permsError;

      const permsMap: Record<string, Record<string, boolean>> = {};
      ROLES.forEach(role => {
        permsMap[role] = {};
        MODULES.forEach(module => {
          const perm = permsData?.find(p => p.role === role && p.module === module.key);
          permsMap[role][module.key] = (perm as any)?.can_view || false;
        });
      });
      
      setRolePermissions(permsMap);
    } catch (error: any) {
      console.error("Error loading data:", error);
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleInviteUser = async () => {
    if (!inviteEmail || !inviteRole) {
      toast({
        title: "Error",
        description: "Please fill in all fields",
        variant: "destructive",
      });
      return;
    }

    setSubmitting(true);
    try {
      const { data: { user: currentUserData } } = await supabase.auth.getUser();
      const { data: profile } = await supabase
        .from("profiles")
        .select("username")
        .eq("id", currentUserData?.id)
        .single();

      // Call edge function to send invite
      const { error: inviteError } = await supabase.functions.invoke('send-user-invite', {
        body: {
          email: inviteEmail,
          role: inviteRole,
          inviterName: profile?.username || 'Admin',
        },
      });

      if (inviteError) throw inviteError;

      // Log audit
      await logAudit({
        action: 'invite_user',
        resourceType: 'user_management',
        details: {
          email: inviteEmail,
          role: inviteRole,
        },
      });

      toast({
        title: "User invited",
        description: `Invitation email sent to ${inviteEmail}`,
      });

      setInviteOpen(false);
      setInviteEmail("");
      setInviteRole("sales");
      loadData();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleTogglePermission = async (role: string, module: string) => {
    if (role === 'admin') {
      toast({
        title: "Cannot modify",
        description: "Admin permissions are locked",
        variant: "destructive",
      });
      return;
    }

    const currentValue = rolePermissions[role]?.[module] || false;
    
    try {
      const { error } = await supabase
        .from("role_permissions")
        .update({ can_view: !currentValue } as any)
        .eq("role", role)
        .eq("module", module);

      if (error) throw error;

      setRolePermissions(prev => ({
        ...prev,
        [role]: {
          ...prev[role],
          [module]: !currentValue
        }
      }));

      // Log audit
      await logAudit({
        action: 'change_permissions',
        resourceType: 'user_role',
        details: {
          role,
          module,
          old_value: currentValue,
          new_value: !currentValue,
        },
      });

      toast({
        title: "Permission updated",
        description: `${role} ${!currentValue ? 'can now' : 'cannot'} access ${module}`,
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const filteredUsers = users.filter(user =>
    user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return <div className="flex items-center justify-center h-full">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">User Management</h1>
          <p className="text-muted-foreground mt-2">
            Manage your team members and their account permissions.
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setAddUserOpen(true)}>
            <UserPlus className="h-4 w-4 mr-2" />
            Add User
          </Button>
          <Button variant="outline" onClick={() => setBulkImportOpen(true)}>
            <Upload className="h-4 w-4 mr-2" />
            Bulk Import
          </Button>
          <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Mail className="h-4 w-4 mr-2" />
                Invite User
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Invite New User</DialogTitle>
                <DialogDescription>
                  Send an invitation to a new team member
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                <div>
                  <Label htmlFor="email">Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="user@example.com"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    className="mt-2"
                  />
                </div>
                <div>
                  <Label htmlFor="role">Role</Label>
                  <Select value={inviteRole} onValueChange={setInviteRole}>
                    <SelectTrigger className="mt-2">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ROLES.map(role => (
                        <SelectItem key={role} value={role} className="capitalize">
                          {role}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button 
                  onClick={handleInviteUser} 
                  disabled={submitting}
                  className="w-full"
                >
                  <Mail className="h-4 w-4 mr-2" />
                  {submitting ? "Sending..." : "Send Invitation"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Tabs defaultValue="users" className="w-full">
        <TabsList>
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="teams">Teams</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
          <TabsTrigger value="permissions">Role Permissions</TabsTrigger>
          <TabsTrigger value="user-access">User Access</TabsTrigger>
          <TabsTrigger value="access-requests">Access Requests</TabsTrigger>
        </TabsList>

        <TabsContent value="users" className="space-y-4 mt-6">
          <div className="flex items-center gap-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={user.avatar_url} />
                          <AvatarFallback>
                            {user.username.substring(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-medium">{user.username}</div>
                          <div className="text-sm text-muted-foreground">{user.email}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {user.roles && user.roles.length > 0 ? (
                        <div className="flex gap-1">
                          {user.roles.map(role => (
                            <Badge key={role} variant="secondary" className="capitalize">
                              {role}
                            </Badge>
                          ))}
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-sm">No role</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={user.status === 'Active' ? 'default' : 'secondary'}>
                        {user.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button 
                          variant="ghost" 
                          size="icon"
                          onClick={async () => {
                            try {
                              const { data: { user: currentUserData } } = await supabase.auth.getUser();
                              const { data: profile } = await supabase
                                .from("profiles")
                                .select("username")
                                .eq("id", currentUserData?.id)
                                .single();

                              // Call edge function to send invite
                              const { error: inviteError } = await supabase.functions.invoke('send-user-invite', {
                                body: {
                                  email: user.email,
                                  role: user.roles?.[0] || 'user',
                                  inviterName: profile?.username || 'Admin',
                                },
                              });

                              if (inviteError) throw inviteError;

                              toast({
                                title: "Invitation sent",
                                description: `Invitation email sent to ${user.email}`,
                              });
                            } catch (error: any) {
                              toast({
                                title: "Error",
                                description: error.message,
                                variant: "destructive",
                              });
                            }
                          }}
                          title="Send invitation"
                        >
                          <Mail className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon"
                          onClick={() => {
                            setEditUser(user);
                            setEditOpen(true);
                          }}
                          title="Edit user"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon"
                          onClick={() => {
                            setSelectedUserForReset({
                              id: user.id,
                              email: user.email || '',
                              username: user.username,
                            });
                            setPasswordResetOpen(true);
                          }}
                          title="Reset password"
                        >
                          <Key className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" title="Delete user">
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        <TabsContent value="teams" className="space-y-4 mt-6">
          <TeamsManagement />
        </TabsContent>

        <TabsContent value="activity" className="space-y-4 mt-6">
          <UserActivityDashboard />
        </TabsContent>

        <TabsContent value="permissions" className="space-y-4 mt-6">
          <RolePermissionsMatrix />
        </TabsContent>

        <TabsContent value="user-access" className="space-y-4 mt-6">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-primary" />
                <div>
                  <CardTitle>User Permissions Dashboard</CardTitle>
                  <CardDescription>
                    View what each user can access across all modules
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <UserPermissionsView />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="access-requests" className="space-y-4 mt-6">
          <AccessRequestsManager />
        </TabsContent>
      </Tabs>

      <AddUserDialog
        open={addUserOpen}
        onOpenChange={setAddUserOpen}
        onSuccess={loadData}
      />
      
      <EditUserDialog
        user={editUser}
        open={editOpen}
        onOpenChange={setEditOpen}
        onSuccess={loadData}
      />

      <BulkImportDialog
        open={bulkImportOpen}
        onOpenChange={setBulkImportOpen}
        onSuccess={loadData}
      />

      {selectedUserForReset && (
        <PasswordResetDialog
          open={passwordResetOpen}
          onOpenChange={setPasswordResetOpen}
          userId={selectedUserForReset.id}
          userEmail={selectedUserForReset.email}
          username={selectedUserForReset.username}
        />
      )}

      {selectedUserForRoleManagement && (
        <RoleManagementDialog
          open={roleManagementOpen}
          onOpenChange={setRoleManagementOpen}
          user={selectedUserForRoleManagement}
          onSuccess={loadData}
        />
      )}
    </div>
  );
}

import { useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { getRoleLabel, getRoleBadgeVariant, normalizeRole } from "@/lib/rbac/roleNormalization";
import { ModuleGuard } from "@/components/rbac/ModuleGuard";
import { useCompany } from "@/contexts/CompanyContext";
import { ROUTES } from "@/lib/routes";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Search, UserPlus, Pencil, Trash2, Mail, Shield, Upload, Key, MoreVertical, Copy, ShieldCheck } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
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
import UserAccessDrawer from "@/components/users/UserAccessDrawer";
import UserKpiCards from "@/components/users/UserKpiCards";
import UsersAdvancedToolbar from "@/components/users/UsersAdvancedToolbar";
import { logAudit } from "@/utils/auditLog";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
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

const getSafeText = (value: any) => String(value ?? "");
const getUserDisplayName = (user: any) =>
  getSafeText(user?.username ?? user?.name ?? user?.full_name ?? user?.display_name ?? user?.email ?? "User");
const getUserInitials = (user: any) => {
  const displayName = getUserDisplayName(user).trim();
  if (!displayName) return "U";
  const parts = displayName.split(" ").filter(Boolean);
  if (parts.length >= 2) return `${parts[0]?.[0] ?? ""}${parts[1]?.[0] ?? ""}`.toUpperCase();
  return displayName.substring(0, 2).toUpperCase();
};

const MODULES = [
  { key: 'dashboard', label: 'Dashboard' },
  { key: 'media_assets', label: 'Media Assets' },
  { key: 'clients', label: 'Clients' },
  { key: 'plans', label: 'Plans' },
  { key: 'campaigns', label: 'Campaigns' },
  { key: 'operations', label: 'Operations' },
  { key: 'monitoring', label: 'Monitoring' },
  { key: 'finance', label: 'Finance' },
  { key: 'reports', label: 'Reports' },
  { key: 'users', label: 'Users' },
  { key: 'settings', label: 'Settings' },
];

const ROLES = ['admin', 'sales', 'operations_manager', 'mounting', 'monitoring', 'finance', 'viewer'];

export default function UserManagement() {
  const { isAdmin, user } = useAuth();
  const { company, isPlatformAdmin } = useCompany();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
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
  const [accessDrawerUser, setAccessDrawerUser] = useState<UserProfile | null>(null);
  const [selectedUserForReset, setSelectedUserForReset] = useState<{
    id: string; email: string; username: string;
  } | null>(null);
  const [selectedUserForRoleManagement, setSelectedUserForRoleManagement] = useState<{
    id: string; email: string; username: string;
  } | null>(null);

  useEffect(() => {
    if (!isAdmin && !isPlatformAdmin) {
      toast({ title: "Access Denied", description: "You need admin privileges to access user management.", variant: "destructive" });
      navigate(ROUTES.DASHBOARD);
      return;
    }
    loadData();
  }, [isAdmin, isPlatformAdmin, navigate]);

  const loadData = async () => {
    try {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { navigate("/auth"); return; }

      const { data: usersData, error: usersError } = await supabase.functions.invoke('list-users', {
        headers: { Authorization: `Bearer ${session.access_token}` }
      });
      if (usersError) throw usersError;
      if (!usersData?.users) throw new Error("No user data received");
      setUsers(usersData.users);

      const { data: permsData, error: permsError } = await supabase.from("role_permissions").select("*");
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
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally { setLoading(false); }
  };

  const handleInviteUser = async () => {
    if (!inviteEmail || !inviteRole) {
      toast({ title: "Error", description: "Please fill in all fields", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    try {
      const { data: { user: currentUserData } } = await supabase.auth.getUser();
      const { data: profile } = await supabase.from("profiles").select("username").eq("id", currentUserData?.id).single();
      const { error: inviteError } = await supabase.functions.invoke('send-user-invite', {
        body: { email: inviteEmail, role: inviteRole, inviterName: profile?.username || 'Admin' },
      });
      if (inviteError) throw inviteError;
      await logAudit({ action: 'invite_user', resourceType: 'user_management', details: { email: inviteEmail, role: inviteRole } });
      toast({ title: "User invited", description: `Invitation email sent to ${inviteEmail}` });
      setInviteOpen(false); setInviteEmail(""); setInviteRole("sales"); loadData();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally { setSubmitting(false); }
  };

  const filteredUsers = useMemo(() => {
    return users.filter(u => {
      const matchesSearch = !searchTerm ||
        (u.username || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        (u.email || "").toLowerCase().includes(searchTerm.toLowerCase());
      const matchesRole = !roleFilter || u.roles?.some(r => {
        const norm = normalizeRole(r);
        return r === roleFilter || norm === roleFilter || r.includes(roleFilter);
      });
      const matchesStatus = !statusFilter || u.status === statusFilter;
      return matchesSearch && matchesRole && matchesStatus;
    });
  }, [users, searchTerm, roleFilter, statusFilter]);

  const handleResendInvite = useCallback(async (targetUser: UserProfile) => {
    try {
      const { data: { user: currentUserData } } = await supabase.auth.getUser();
      const { data: profile } = await supabase.from("profiles").select("username").eq("id", currentUserData?.id).single();
      const { error } = await supabase.functions.invoke('send-user-invite', {
        body: { email: targetUser.email, role: targetUser.roles?.[0] || 'user', inviterName: profile?.username || 'Admin' },
      });
      if (error) throw error;
      toast({ title: "Invitation sent", description: `Invitation email sent to ${targetUser.email}` });
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  }, []);

  const handleDeleteUser = useCallback(async (targetUser: UserProfile) => {
    if (!confirm(`Are you sure you want to delete ${getUserDisplayName(targetUser)}? This action cannot be undone.`)) return;
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { toast({ title: "Error", description: "Authentication required", variant: "destructive" }); return; }
      const { error } = await supabase.functions.invoke('delete-user', {
        headers: { Authorization: `Bearer ${session.access_token}` },
        body: { userId: targetUser.id, companyId: company?.id },
      });
      if (error) throw error;
      toast({ title: "User deleted", description: `${getUserDisplayName(targetUser)} has been removed` });
      loadData();
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Failed to delete user", variant: "destructive" });
    }
  }, [company?.id]);

  const copyEmail = useCallback((email: string) => {
    navigator.clipboard.writeText(email);
    toast({ title: "Copied", description: "Email copied to clipboard" });
  }, []);

  if (loading) {
    return (
      <ModuleGuard module="users">
        <div className="space-y-6 p-1">
          <Skeleton className="h-10 w-72" />
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
            {Array.from({ length: 7 }).map((_, i) => <Skeleton key={i} className="h-16" />)}
          </div>
          <Skeleton className="h-64" />
        </div>
      </ModuleGuard>
    );
  }

  return (
    <ModuleGuard module="users">
      <div className="space-y-5">
        {/* Page header */}
        <div>
          <h1 className="text-2xl font-bold tracking-tight">User Access & Permissions</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage team members, roles, and access control{company?.name ? ` for ${company.name}` : ""}
          </p>
        </div>

        {/* KPI Cards */}
        <UserKpiCards users={users} />

        {/* Main Tabs */}
        <Tabs defaultValue="users" className="w-full">
          <TabsList className="bg-muted/50">
            <TabsTrigger value="users">Users</TabsTrigger>
            <TabsTrigger value="permissions">Role Permissions</TabsTrigger>
            <TabsTrigger value="user-access">Access Control</TabsTrigger>
            <TabsTrigger value="teams">Teams</TabsTrigger>
            <TabsTrigger value="activity">Activity & Audit</TabsTrigger>
            <TabsTrigger value="access-requests">Access Requests</TabsTrigger>
          </TabsList>

          {/* Users tab */}
          <TabsContent value="users" className="space-y-4 mt-4">
            <UsersAdvancedToolbar
              searchTerm={searchTerm}
              onSearchChange={setSearchTerm}
              roleFilter={roleFilter}
              onRoleFilterChange={setRoleFilter}
              statusFilter={statusFilter}
              onStatusFilterChange={setStatusFilter}
              onAddUser={() => setAddUserOpen(true)}
              onBulkImport={() => setBulkImportOpen(true)}
              onInvite={() => setInviteOpen(true)}
              onRefresh={loadData}
            />

            <Card className="shadow-sm">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/30">
                    <TableHead className="w-[280px]">User</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="hidden md:table-cell">Joined</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-12 text-muted-foreground">
                        {users.length === 0 ? "No users found. Add your first team member." : "No users match your filters."}
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredUsers.map(u => (
                      <TableRow key={u.id} className="group hover:bg-accent/30 transition-colors">
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar className="h-9 w-9">
                              <AvatarImage src={u.avatar_url} />
                              <AvatarFallback className="text-xs bg-primary/5 text-primary font-medium">
                                {getUserInitials(u)}
                              </AvatarFallback>
                            </Avatar>
                            <div className="min-w-0">
                              <p className="font-medium text-sm truncate">{getUserDisplayName(u)}</p>
                              <p className="text-xs text-muted-foreground truncate">{u.email || "No email"}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          {u.roles && u.roles.length > 0 ? (
                            <div className="flex gap-1 flex-wrap">
                              {u.roles.map(role => (
                                <Badge key={role} className={`${getRoleBadgeVariant(role)} text-[11px] px-2 py-0`}>
                                  {getRoleLabel(role)}
                                </Badge>
                              ))}
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground">No role</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={u.status === "Active" ? "default" : "secondary"}
                            className="text-[11px] px-2 py-0"
                          >
                            {u.status || "Unknown"}
                          </Badge>
                        </TableCell>
                        <TableCell className="hidden md:table-cell text-xs text-muted-foreground">
                          {u.created_at ? new Date(u.created_at).toLocaleDateString() : "—"}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end items-center gap-1">
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 text-xs gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
                              onClick={() => setAccessDrawerUser(u)}
                            >
                              <ShieldCheck className="h-3.5 w-3.5" />
                              Access
                            </Button>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-7 w-7">
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-48">
                                <DropdownMenuItem onClick={() => setAccessDrawerUser(u)}>
                                  <Shield className="mr-2 h-4 w-4" /> View Access
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => { setEditUser(u); setEditOpen(true); }}>
                                  <Pencil className="mr-2 h-4 w-4" /> Edit User
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => {
                                  setSelectedUserForReset({ id: u.id, email: u.email || "", username: getUserDisplayName(u) });
                                  setPasswordResetOpen(true);
                                }}>
                                  <Key className="mr-2 h-4 w-4" /> Reset Password
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleResendInvite(u)}>
                                  <Mail className="mr-2 h-4 w-4" /> Resend Invite
                                </DropdownMenuItem>
                                {u.email && (
                                  <DropdownMenuItem onClick={() => copyEmail(u.email!)}>
                                    <Copy className="mr-2 h-4 w-4" /> Copy Email
                                  </DropdownMenuItem>
                                )}
                                <DropdownMenuSeparator />
                                <DropdownMenuItem className="text-destructive" onClick={() => handleDeleteUser(u)}>
                                  <Trash2 className="mr-2 h-4 w-4" /> Remove User
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </Card>
          </TabsContent>

          <TabsContent value="permissions" className="mt-4">
            <RolePermissionsMatrix />
          </TabsContent>

          <TabsContent value="user-access" className="mt-4">
            <Card className="shadow-sm">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <Shield className="h-5 w-5 text-primary" />
                  <div>
                    <CardTitle className="text-lg">User Permissions Dashboard</CardTitle>
                    <CardDescription>View what each user can access across all modules</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <UserPermissionsView />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="teams" className="mt-4">
            <TeamsManagement />
          </TabsContent>

          <TabsContent value="activity" className="mt-4">
            <UserActivityDashboard />
          </TabsContent>

          <TabsContent value="access-requests" className="mt-4">
            <AccessRequestsManager />
          </TabsContent>
        </Tabs>

        {/* Invite Dialog */}
        <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Invite New User</DialogTitle>
              <DialogDescription>Send an invitation to a new team member</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div>
                <Label htmlFor="email">Email Address</Label>
                <Input id="email" type="email" placeholder="user@example.com" value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} className="mt-2" />
              </div>
              <div>
                <Label htmlFor="role">Role</Label>
                <Select value={inviteRole} onValueChange={setInviteRole}>
                  <SelectTrigger className="mt-2"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {ROLES.map(role => (
                      <SelectItem key={role} value={role}>{getRoleLabel(role)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={handleInviteUser} disabled={submitting} className="w-full">
                <Mail className="h-4 w-4 mr-2" />{submitting ? "Sending..." : "Send Invitation"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Dialogs */}
        <AddUserDialog open={addUserOpen} onOpenChange={setAddUserOpen} onSuccess={loadData} />
        <EditUserDialog user={editUser} open={editOpen} onOpenChange={setEditOpen} onSuccess={loadData} />
        <BulkImportDialog open={bulkImportOpen} onOpenChange={setBulkImportOpen} onSuccess={loadData} />

        {selectedUserForReset && (
          <PasswordResetDialog
            open={passwordResetOpen} onOpenChange={setPasswordResetOpen}
            userId={selectedUserForReset.id} userEmail={selectedUserForReset.email} username={selectedUserForReset.username}
          />
        )}
        {selectedUserForRoleManagement && (
          <RoleManagementDialog
            open={roleManagementOpen} onOpenChange={setRoleManagementOpen}
            user={selectedUserForRoleManagement} onSuccess={loadData}
          />
        )}

        {/* User Access Drawer */}
        <UserAccessDrawer
          user={accessDrawerUser}
          open={!!accessDrawerUser}
          onOpenChange={open => { if (!open) setAccessDrawerUser(null); }}
          onEditRole={() => {
            if (accessDrawerUser) {
              setEditUser(accessDrawerUser);
              setEditOpen(true);
            }
          }}
          onResetPassword={() => {
            if (accessDrawerUser) {
              setSelectedUserForReset({
                id: accessDrawerUser.id,
                email: accessDrawerUser.email || "",
                username: getUserDisplayName(accessDrawerUser),
              });
              setPasswordResetOpen(true);
            }
          }}
        />
      </div>
    </ModuleGuard>
  );
}

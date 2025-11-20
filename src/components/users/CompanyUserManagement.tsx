import { useState, useEffect } from "react";
import { useCompany } from "@/contexts/CompanyContext";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Users, UserPlus, Shield } from "lucide-react";
import { InviteUserDialog } from "./InviteUserDialog";
import EditUserDialog from "./EditUserDialog";
import { useToast } from "@/hooks/use-toast";

interface CompanyUser {
  id: string;
  user_id: string;
  role: string;
  status: string;
  joined_at: string;
  email: string;
  username: string;
}

export function CompanyUserManagement() {
  const { company } = useCompany();
  const { toast } = useToast();
  const [users, setUsers] = useState<CompanyUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [editUser, setEditUser] = useState<CompanyUser | null>(null);

  useEffect(() => {
    if (company?.id) {
      loadUsers();
    }
  }, [company?.id]);

  const loadUsers = async () => {
    if (!company?.id) return;

    try {
      const { data, error } = await supabase
        .from("company_users")
        .select(`
          *,
          profiles:user_id (
            username,
            email:id(email)
          )
        `)
        .eq("company_id", company.id)
        .eq("status", "active");

      if (error) throw error;

      const formattedUsers = (data || []).map((user: any) => ({
        id: user.id,
        user_id: user.user_id,
        role: user.role,
        status: user.status,
        joined_at: user.joined_at,
        email: user.profiles?.email || "",
        username: user.profiles?.username || "",
      }));

      setUsers(formattedUsers);
    } catch (error) {
      console.error("Error loading users:", error);
      toast({
        title: "Error",
        description: "Failed to load company users",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
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

  if (loading) {
    return (
      <div className="text-center py-8">Loading users...</div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Users className="h-6 w-6" />
          <div>
            <h2 className="text-2xl font-bold">Users & Roles</h2>
            <p className="text-sm text-muted-foreground">
              Manage users and their roles for {company?.name}
            </p>
          </div>
        </div>
        <Button onClick={() => setInviteDialogOpen(true)}>
          <UserPlus className="h-4 w-4 mr-2" />
          Invite User
        </Button>
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>User</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Joined</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  No users found. Invite your first user to get started.
                </TableCell>
              </TableRow>
            ) : (
              users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="font-medium">{user.username}</TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>
                    <Badge className={getRoleBadgeColor(user.role)}>
                      <Shield className="h-3 w-3 mr-1" />
                      {user.role}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {new Date(user.joined_at).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    <Badge variant={user.status === "active" ? "default" : "secondary"}>
                      {user.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setEditUser(user)}
                    >
                      Edit
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>

      <InviteUserDialog
        open={inviteDialogOpen}
        onOpenChange={setInviteDialogOpen}
        onSuccess={() => {
          loadUsers();
          setInviteDialogOpen(false);
        }}
        companyId={company?.id}
      />

      {editUser && (
        <EditUserDialog
          open={!!editUser}
          onOpenChange={(open) => !open && setEditUser(null)}
          user={{
            id: editUser.user_id,
            email: editUser.email,
            username: editUser.username,
            roles: [editUser.role],
          }}
          onSuccess={() => {
            loadUsers();
            setEditUser(null);
          }}
        />
      )}
    </div>
  );
}

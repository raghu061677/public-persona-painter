import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Plus, UserPlus, Building2, Mail, Shield } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { CreateUserForm } from "@/components/platform/CreateUserForm";
import { AssignCompanyDialog } from "@/components/platform/AssignCompanyDialog";

interface UserProfile {
  id: string;
  email: string;
  username: string;
  created_at: string;
  companies: Array<{
    company_id: string;
    company_name: string;
    role: string;
    is_primary: boolean;
    status: string;
  }>;
}

export default function ManageUsers() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.rpc('list_all_users');
      
      if (error) throw error;
      setUsers((data as any) || []);
    } catch (error: any) {
      console.error('Error loading users:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to load users",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleUserCreated = () => {
    setCreateDialogOpen(false);
    loadUsers();
    toast({
      title: "Success",
      description: "User created successfully",
    });
  };

  const handleCompanyAssigned = () => {
    setAssignDialogOpen(false);
    setSelectedUser(null);
    loadUsers();
    toast({
      title: "Success",
      description: "User assigned to company",
    });
  };

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'admin':
        return 'destructive';
      case 'sales':
        return 'default';
      case 'operations':
        return 'secondary';
      case 'accounts':
        return 'outline';
      default:
        return 'outline';
    }
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Manage Users</h1>
          <p className="text-muted-foreground mt-1">
            Create users and assign them to companies with specific roles
          </p>
        </div>
        <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Create User
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create New User</DialogTitle>
              <DialogDescription>
                Add a new user to the platform. You can assign them to companies after creation.
              </DialogDescription>
            </DialogHeader>
            <CreateUserForm onSuccess={handleUserCreated} />
          </DialogContent>
        </Dialog>
      </div>

      {/* Users Table */}
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>User</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Companies & Roles</TableHead>
              <TableHead>Created</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-48" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-64" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-8 w-24 ml-auto" /></TableCell>
                </TableRow>
              ))
            ) : users.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-12 text-muted-foreground">
                  No users found. Create your first user to get started.
                </TableCell>
              </TableRow>
            ) : (
              users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                        <span className="text-xs font-semibold text-primary">
                          {user.username?.charAt(0).toUpperCase() || user.email.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <span>{user.username || 'No username'}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2 text-sm">
                      <Mail className="h-3 w-3 text-muted-foreground" />
                      {user.email}
                    </div>
                  </TableCell>
                  <TableCell>
                    {user.companies && user.companies.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {user.companies.map((company, idx) => (
                          <div key={idx} className="flex items-center gap-1 text-xs bg-secondary/50 px-2 py-1 rounded">
                            <Building2 className="h-3 w-3" />
                            <span className="font-medium">{company.company_name}</span>
                            <Badge variant={getRoleBadgeVariant(company.role)} className="h-4 text-[10px] px-1">
                              {company.role}
                            </Badge>
                            {company.is_primary && (
                              <Badge variant="outline" className="h-4 text-[10px] px-1">Primary</Badge>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <span className="text-sm text-muted-foreground">No company assigned</span>
                    )}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {new Date(user.created_at).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedUser(user);
                        setAssignDialogOpen(true);
                      }}
                    >
                      <UserPlus className="h-3 w-3 mr-1" />
                      Assign Company
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Assign Company Dialog */}
      {selectedUser && (
        <AssignCompanyDialog
          open={assignDialogOpen}
          onOpenChange={setAssignDialogOpen}
          user={selectedUser}
          onSuccess={handleCompanyAssigned}
        />
      )}
    </div>
  );
}

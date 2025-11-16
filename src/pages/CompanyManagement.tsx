import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useCompany } from "@/contexts/CompanyContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { Building2, UserPlus, Users, Pencil } from "lucide-react";
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

interface Company {
  id: string;
  name: string;
  legal_name: string;
  type: string;
  status: string;
  gstin?: string;
  created_at: string;
}

interface CompanyUserWithProfile {
  id: string;
  company_id: string;
  user_id: string;
  role: string;
  status: string;
  email?: string;
  username?: string;
}

export default function CompanyManagement() {
  const { isPlatformAdmin } = useCompany();
  const { user } = useAuth();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [companyUsers, setCompanyUsers] = useState<CompanyUserWithProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [addCompanyOpen, setAddCompanyOpen] = useState(false);
  const [addUserToCompanyOpen, setAddUserToCompanyOpen] = useState(false);
  
  // Form states
  const [companyName, setCompanyName] = useState("");
  const [legalName, setLegalName] = useState("");
  const [companyType, setCompanyType] = useState<"media_owner" | "agency">("media_owner");
  const [gstin, setGstin] = useState("");
  
  const [userEmail, setUserEmail] = useState("");
  const [userPassword, setUserPassword] = useState("");
  const [userName, setUserName] = useState("");
  const [userRole, setUserRole] = useState<"admin" | "sales" | "operations" | "finance">("sales");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (isPlatformAdmin) {
      loadCompanies();
    }
  }, [isPlatformAdmin]);

  const loadCompanies = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('companies')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCompanies(data || []);
    } catch (error: any) {
      toast({
        title: "Error loading companies",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const loadCompanyUsers = async (companyId: string) => {
    try {
      const { data: companyUsersData, error } = await supabase
        .from('company_users')
        .select('*')
        .eq('company_id', companyId);

      if (error) throw error;

      if (!companyUsersData || companyUsersData.length === 0) {
        setCompanyUsers([]);
        return;
      }

      // Get user profiles
      const userIds = companyUsersData.map((cu: any) => cu.user_id);
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, username')
        .in('id', userIds);

      // Combine data
      const usersWithProfiles: CompanyUserWithProfile[] = companyUsersData.map((cu: any) => {
        const profile = profiles?.find((p: any) => p.id === cu.user_id);
        return {
          id: cu.id,
          company_id: cu.company_id,
          user_id: cu.user_id,
          role: cu.role,
          status: cu.status,
          username: profile?.username,
          email: `user-${cu.user_id.substring(0, 8)}`, // Placeholder - would need auth.admin in edge function
        };
      });

      setCompanyUsers(usersWithProfiles);
    } catch (error: any) {
      toast({
        title: "Error loading company users",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleCreateCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyName || !legalName) {
      toast({
        title: "Validation Error",
        description: "Company name and legal name are required",
        variant: "destructive",
      });
      return;
    }

    try {
      setSubmitting(true);
      const { data, error } = await supabase
        .from('companies')
        .insert({
          name: companyName,
          legal_name: legalName,
          type: companyType,
          gstin: gstin || null,
          status: 'active',
          created_by: user?.id,
        })
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Success",
        description: "Company created successfully",
      });

      setAddCompanyOpen(false);
      setCompanyName("");
      setLegalName("");
      setGstin("");
      loadCompanies();
    } catch (error: any) {
      toast({
        title: "Error creating company",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddUserToCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCompany || !userEmail || !userPassword || !userName) {
      toast({
        title: "Validation Error",
        description: "All fields are required",
        variant: "destructive",
      });
      return;
    }

    try {
      setSubmitting(true);

      // Create user in auth
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: userEmail,
        password: userPassword,
        email_confirm: true,
        user_metadata: {
          username: userName,
        },
      });

      if (authError) throw authError;

      // Create profile
      const { error: profileError } = await supabase
        .from('profiles')
        .insert({
          id: authData.user.id,
          username: userName,
        });

      if (profileError) throw profileError;

      // Add user to company
      const { error: companyUserError } = await supabase
        .from('company_users')
        .insert({
          company_id: selectedCompany.id,
          user_id: authData.user.id,
          role: userRole,
          status: 'active',
        });

      if (companyUserError) throw companyUserError;

      // Add user role
      const { error: roleError } = await supabase
        .from('user_roles')
        .insert({
          user_id: authData.user.id,
          role: userRole,
        });

      if (roleError) throw roleError;

      toast({
        title: "Success",
        description: `User ${userName} added to ${selectedCompany.name}`,
      });

      setAddUserToCompanyOpen(false);
      setUserEmail("");
      setUserPassword("");
      setUserName("");
      setUserRole("sales");
      loadCompanyUsers(selectedCompany.id);
    } catch (error: any) {
      toast({
        title: "Error adding user",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (!isPlatformAdmin) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">
              You need platform admin privileges to access this page.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Company Management</h1>
          <p className="text-muted-foreground">Manage companies and their users</p>
        </div>
        <Dialog open={addCompanyOpen} onOpenChange={setAddCompanyOpen}>
          <DialogTrigger asChild>
            <Button>
              <Building2 className="mr-2 h-4 w-4" />
              Add Company
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Company</DialogTitle>
              <DialogDescription>
                Add a new media owner or agency company
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreateCompany} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="companyName">Company Name</Label>
                <Input
                  id="companyName"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="Enter company name"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="legalName">Legal Name</Label>
                <Input
                  id="legalName"
                  value={legalName}
                  onChange={(e) => setLegalName(e.target.value)}
                  placeholder="Enter legal name"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="companyType">Company Type</Label>
                <Select value={companyType} onValueChange={(value: any) => setCompanyType(value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="media_owner">Media Owner</SelectItem>
                    <SelectItem value="agency">Agency</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="gstin">GSTIN (Optional)</Label>
                <Input
                  id="gstin"
                  value={gstin}
                  onChange={(e) => setGstin(e.target.value)}
                  placeholder="Enter GSTIN"
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setAddCompanyOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={submitting}>
                  {submitting ? "Creating..." : "Create Company"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Companies</CardTitle>
          <CardDescription>All registered companies in the platform</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Legal Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>GSTIN</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {companies.map((company) => (
                <TableRow key={company.id}>
                  <TableCell className="font-medium">{company.name}</TableCell>
                  <TableCell>{company.legal_name}</TableCell>
                  <TableCell>
                    <Badge variant={company.type === 'platform_admin' ? 'default' : 'secondary'}>
                      {company.type.replace('_', ' ')}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={company.status === 'active' ? 'default' : 'secondary'}>
                      {company.status}
                    </Badge>
                  </TableCell>
                  <TableCell>{company.gstin || '-'}</TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setSelectedCompany(company);
                        loadCompanyUsers(company.id);
                      }}
                    >
                      <Users className="h-4 w-4 mr-2" />
                      Manage Users
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {selectedCompany && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>{selectedCompany.name} - Users</CardTitle>
                <CardDescription>Manage users for this company</CardDescription>
              </div>
              <Dialog open={addUserToCompanyOpen} onOpenChange={setAddUserToCompanyOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <UserPlus className="mr-2 h-4 w-4" />
                    Add User
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add User to {selectedCompany.name}</DialogTitle>
                    <DialogDescription>
                      Create a new user and assign them to this company
                    </DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleAddUserToCompany} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="userName">Full Name</Label>
                      <Input
                        id="userName"
                        value={userName}
                        onChange={(e) => setUserName(e.target.value)}
                        placeholder="Enter full name"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="userEmail">Email</Label>
                      <Input
                        id="userEmail"
                        type="email"
                        value={userEmail}
                        onChange={(e) => setUserEmail(e.target.value)}
                        placeholder="Enter email"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="userPassword">Password</Label>
                      <Input
                        id="userPassword"
                        type="password"
                        value={userPassword}
                        onChange={(e) => setUserPassword(e.target.value)}
                        placeholder="Enter password"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="userRole">Role</Label>
                      <Select value={userRole} onValueChange={(value: any) => setUserRole(value)}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="admin">Admin</SelectItem>
                          <SelectItem value="sales">Sales</SelectItem>
                          <SelectItem value="operations">Operations</SelectItem>
                          <SelectItem value="finance">Finance</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button type="button" variant="outline" onClick={() => setAddUserToCompanyOpen(false)}>
                        Cancel
                      </Button>
                      <Button type="submit" disabled={submitting}>
                        {submitting ? "Adding..." : "Add User"}
                      </Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {companyUsers.map((companyUser) => (
                  <TableRow key={companyUser.id}>
                    <TableCell>{companyUser.username || 'Unknown'}</TableCell>
                    <TableCell>{companyUser.email || 'Unknown'}</TableCell>
                    <TableCell>
                      <Badge>{companyUser.role}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={companyUser.status === 'active' ? 'default' : 'secondary'}>
                        {companyUser.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

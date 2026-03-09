import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useCompany } from "@/contexts/CompanyContext";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "@/hooks/use-toast";
import { logAudit } from "@/utils/auditLog";
import { UserPlus, AlertCircle, Loader2 } from "lucide-react";
import { STANDARD_COMPANY_ROLES, getRoleLabel } from "@/lib/rbac/roleNormalization";

interface AddUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

interface Company {
  id: string;
  name: string;
  type: string;
}

export default function AddUserDialog({
  open,
  onOpenChange,
  onSuccess,
}: AddUserDialogProps) {
  const { user: currentUser, isAdmin } = useAuth();
  const { company, isPlatformAdmin } = useCompany();
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [selectedRole, setSelectedRole] = useState<string>("sales");
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>("");
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loadingCompanies, setLoadingCompanies] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (isPlatformAdmin && open) {
      loadCompanies();
    } else if (company && open) {
      setSelectedCompanyId(company.id);
    }
  }, [isPlatformAdmin, company, open]);

  const loadCompanies = async () => {
    setLoadingCompanies(true);
    try {
      const { data, error } = await supabase
        .from('companies')
        .select('id, name, type')
        .eq('status', 'active')
        .order('name');
      if (error) throw error;
      setCompanies(data || []);
      if (data && data.length > 0 && !selectedCompanyId) {
        setSelectedCompanyId(data[0].id);
      }
    } catch (error: any) {
      console.error('Error loading companies:', error);
      toast({ title: "Error", description: "Failed to load companies", variant: "destructive" });
    } finally {
      setLoadingCompanies(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!currentUser) {
      toast({ title: "Error", description: "You must be logged in", variant: "destructive" });
      return;
    }
    if (!isAdmin && !isPlatformAdmin) {
      toast({ title: "Error", description: "Only administrators can create users", variant: "destructive" });
      return;
    }
    if (!email || !username || !password) {
      toast({ title: "Error", description: "Please fill in all required fields", variant: "destructive" });
      return;
    }
    if (password.length < 8) {
      toast({ title: "Error", description: "Password must be at least 8 characters", variant: "destructive" });
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      toast({ title: "Error", description: "Please enter a valid email address", variant: "destructive" });
      return;
    }
    if (!selectedCompanyId) {
      toast({ title: "Error", description: "Please select a company", variant: "destructive" });
      return;
    }

    setSubmitting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Authentication required");

      const { data, error } = await supabase.functions.invoke('create-user', {
        headers: { Authorization: `Bearer ${session.access_token}` },
        body: { email, password, username, role: selectedRole, company_id: selectedCompanyId },
      });

      if (error) {
        const errorMsg = typeof data === 'object' && data?.error ? data.error : error.message;
        throw new Error(errorMsg || 'Failed to create user');
      }
      if (!data?.success) {
        throw new Error(data?.error || 'Failed to create user');
      }

      await logAudit({
        action: 'create_user',
        resourceType: 'user_management',
        resourceId: data.user_id,
        details: { email, role: selectedRole, company_id: selectedCompanyId },
      });

      toast({ title: "User created", description: `User ${email} has been added successfully` });

      setEmail(""); setUsername(""); setPassword(""); setSelectedRole("sales");
      setSelectedCompanyId(isPlatformAdmin ? "" : company?.id || "");
      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      console.error('Error creating user:', error);
      toast({ title: "Failed to create user", description: error.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Add New User</DialogTitle>
          <DialogDescription>
            Create a new user account with credentials and role assignment.
          </DialogDescription>
        </DialogHeader>

        {!isAdmin && !isPlatformAdmin && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>Only administrators can create new users</AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email Address *</Label>
            <Input id="email" type="email" placeholder="user@example.com" value={email}
              onChange={(e) => setEmail(e.target.value)} required disabled={!isAdmin && !isPlatformAdmin} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="username">Name *</Label>
            <Input id="username" type="text" placeholder="Enter name" value={username}
              onChange={(e) => setUsername(e.target.value)} required disabled={!isAdmin && !isPlatformAdmin} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Password *</Label>
            <Input id="password" type="password" placeholder="Min 8 characters" value={password}
              onChange={(e) => setPassword(e.target.value)} required disabled={!isAdmin && !isPlatformAdmin} />
            <p className="text-xs text-muted-foreground">Minimum 8 characters required</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="role">Role *</Label>
            <Select value={selectedRole} onValueChange={setSelectedRole} disabled={!isAdmin && !isPlatformAdmin}>
              <SelectTrigger id="role"><SelectValue /></SelectTrigger>
              <SelectContent>
                {STANDARD_COMPANY_ROLES.map((role) => (
                  <SelectItem key={role} value={role}>{getRoleLabel(role)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {isPlatformAdmin && (
            <div className="space-y-2">
              <Label htmlFor="company">Company *</Label>
              <Select value={selectedCompanyId} onValueChange={setSelectedCompanyId}
                disabled={loadingCompanies || (!isAdmin && !isPlatformAdmin)}>
                <SelectTrigger id="company">
                  <SelectValue placeholder={loadingCompanies ? "Loading..." : "Select company"} />
                </SelectTrigger>
                <SelectContent>
                  {companies.map((comp) => (
                    <SelectItem key={comp.id} value={comp.id}>{comp.name} ({comp.type})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting || (!isAdmin && !isPlatformAdmin)}>
              {submitting ? (<><Loader2 className="mr-2 h-4 w-4 animate-spin" />Creating...</>) :
                (<><UserPlus className="mr-2 h-4 w-4" />Create User</>)}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

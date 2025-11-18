import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";

interface Company {
  id: string;
  name: string;
  type: string;
}

interface AssignCompanyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: {
    id: string;
    email: string;
    username: string;
  };
  onSuccess: () => void;
}

export function AssignCompanyDialog({
  open,
  onOpenChange,
  user,
  onSuccess,
}: AssignCompanyDialogProps) {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>("");
  const [selectedRole, setSelectedRole] = useState<"admin" | "sales" | "operations" | "finance" | "user">("user");
  const [isPrimary, setIsPrimary] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingCompanies, setLoadingCompanies] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      loadCompanies();
    }
  }, [open]);

  const loadCompanies = async () => {
    try {
      setLoadingCompanies(true);
      const { data, error } = await supabase
        .from('companies')
        .select('id, name, type')
        .eq('status', 'active')
        .order('name');

      if (error) throw error;
      setCompanies(data || []);
    } catch (error: any) {
      console.error('Error loading companies:', error);
      toast({
        title: "Error",
        description: "Failed to load companies",
        variant: "destructive",
      });
    } finally {
      setLoadingCompanies(false);
    }
  };

  const handleAssign = async () => {
    if (!selectedCompanyId || !selectedRole) {
      toast({
        title: "Validation Error",
        description: "Please select both company and role",
        variant: "destructive",
      });
      return;
    }

    try {
      setLoading(true);

      const { data, error } = await supabase.rpc('assign_user_to_company', {
        p_user_id: user.id,
        p_company_id: selectedCompanyId,
        p_role: selectedRole,
        p_is_primary: isPrimary,
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: "User assigned to company successfully",
      });

      onSuccess();
    } catch (error: any) {
      console.error('Assign error:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to assign user",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Assign Company & Role</DialogTitle>
          <DialogDescription>
            Assign {user.email} to a company with a specific role
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Company</Label>
            {loadingCompanies ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading companies...
              </div>
            ) : (
              <Select value={selectedCompanyId} onValueChange={setSelectedCompanyId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a company" />
                </SelectTrigger>
                <SelectContent>
                  {companies.map((company) => (
                    <SelectItem key={company.id} value={company.id}>
                      {company.name} ({company.type})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          <div className="space-y-2">
            <Label>Role</Label>
            <Select value={selectedRole} onValueChange={(value) => setSelectedRole(value as any)}>
              <SelectTrigger>
                <SelectValue placeholder="Select a role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="sales">Sales</SelectItem>
                <SelectItem value="operations">Operations</SelectItem>
                <SelectItem value="finance">Finance</SelectItem>
                <SelectItem value="user">User</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Admin: Full access | Sales: Lead/Client/Plan mgmt | Operations: Campaign execution | Finance: Accounting | User: Read-only
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="primary"
              checked={isPrimary}
              onCheckedChange={(checked) => setIsPrimary(checked as boolean)}
            />
            <Label htmlFor="primary" className="text-sm font-normal cursor-pointer">
              Set as primary company (default workspace on login)
            </Label>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleAssign} disabled={loading || loadingCompanies}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Assign
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

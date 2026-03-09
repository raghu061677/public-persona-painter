import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
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
import { Switch } from "@/components/ui/switch";
import { toast } from "@/hooks/use-toast";
import { logAudit } from "@/utils/auditLog";
import { STANDARD_COMPANY_ROLES, normalizeRole, getRoleLabel } from "@/lib/rbac/roleNormalization";

interface UserProfile {
  id?: string;
  user_id?: string;
  username: string;
  email?: string;
  roles?: string[];
  status?: string;
}

interface EditUserDialogProps {
  user: UserProfile | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export default function EditUserDialog({
  user,
  open,
  onOpenChange,
  onSuccess,
}: EditUserDialogProps) {
  const { user: currentUser } = useAuth();
  const [username, setUsername] = useState("");
  const [selectedRole, setSelectedRole] = useState<string>("sales");
  const [isActive, setIsActive] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (user) {
      setUsername(user.username || "");
      // Normalize any legacy role to canonical
      const rawRole = user.roles?.[0] || "viewer";
      setSelectedRole(normalizeRole(rawRole));
      setIsActive(user.status === 'Active' || user.status === 'active');
    }
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    const targetUserId = user.user_id || user.id;
    if (!targetUserId) {
      toast({ title: "Error", description: "Cannot identify user to update", variant: "destructive" });
      return;
    }

    setSubmitting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        toast({
          title: "Authentication required",
          description: "Please log in to update users",
          variant: "destructive",
        });
        setSubmitting(false);
        return;
      }

      const { data, error: updateError } = await supabase.functions.invoke('update-user', {
        headers: {
          Authorization: `Bearer ${session.access_token}`
        },
        body: {
          userId: user.id,
          name: username,
          role: selectedRole,
          status: isActive ? 'active' : 'suspended',
        },
      });

      if (updateError) {
        // Try to extract the real error message from the response
        const errorMsg = typeof data === 'object' && data?.error
          ? data.error
          : updateError.message || 'Failed to update user';
        throw new Error(errorMsg);
      }

      await logAudit({
        action: 'update_user',
        resourceType: 'user_role',
        resourceId: user.id,
        details: {
          old_values: { username: user.username, role: user.roles?.[0], status: user.status },
          new_values: { username, role: selectedRole, status: isActive ? 'Active' : 'Suspended' },
        },
      });

      toast({
        title: "User updated",
        description: "User details have been updated successfully",
      });

      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      console.error("Error updating user:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to update user",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit User</DialogTitle>
          <DialogDescription>
            Update user details, role, and status
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div>
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={user?.email || ""}
              disabled
              className="mt-2 bg-muted"
            />
            <p className="text-xs text-muted-foreground mt-1">Email cannot be changed here</p>
          </div>
          <div>
            <Label htmlFor="username">Name</Label>
            <Input
              id="username"
              type="text"
              placeholder="Enter name"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="mt-2"
            />
          </div>
          <div>
            <Label htmlFor="role">Role</Label>
            <Select value={selectedRole} onValueChange={setSelectedRole}>
              <SelectTrigger className="mt-2">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STANDARD_COMPANY_ROLES.map(role => (
                  <SelectItem key={role} value={role}>
                    {getRoleLabel(role)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center justify-between">
            <Label htmlFor="status">Active Status</Label>
            <Switch
              id="status"
              checked={isActive}
              onCheckedChange={setIsActive}
            />
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Updating..." : "Update User"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

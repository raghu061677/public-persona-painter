import { useState } from "react";
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

interface UserProfile {
  id: string;
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

const ROLES = ['admin', 'sales', 'operations', 'finance'];

export default function EditUserDialog({
  user,
  open,
  onOpenChange,
  onSuccess,
}: EditUserDialogProps) {
  const { user: currentUser } = useAuth();
  const [username, setUsername] = useState(user?.username || "");
  const [selectedRole, setSelectedRole] = useState<string>(user?.roles?.[0] || "sales");
  const [isActive, setIsActive] = useState(user?.status === 'Active');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setSubmitting(true);
    try {
      // Get current session for authorization
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

      const oldValues = {
        username: user.username,
        role: user.roles?.[0],
        status: user.status,
      };

      // Call edge function to update user with Authorization header
      const { error: updateError } = await supabase.functions.invoke('update-user', {
        headers: {
          Authorization: `Bearer ${session.access_token}`
        },
        body: {
          userId: user.id,
          username,
          role: selectedRole,
          isActive,
        },
      });

      if (updateError) {
        throw new Error(updateError.message || 'Failed to update user');
      }

      // Log audit
      await logAudit({
        action: 'update_user',
        resourceType: 'user_role',
        resourceId: user.id,
        details: {
          old_values: oldValues,
          new_values: {
            username,
            role: selectedRole,
            status: isActive ? 'Active' : 'Suspended',
          },
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
        description: error.message,
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
          </div>
          <div>
            <Label htmlFor="username">Username</Label>
            <Input
              id="username"
              type="text"
              placeholder="Enter username"
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
                {ROLES.map(role => (
                  <SelectItem key={role} value={role} className="capitalize">
                    {role}
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

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
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "@/hooks/use-toast";
import { logAudit } from "@/utils/auditLog";
import { UserPlus, AlertCircle } from "lucide-react";

interface AddUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

const ROLES = ['admin', 'sales', 'operations', 'finance', 'user'];

export default function AddUserDialog({
  open,
  onOpenChange,
  onSuccess,
}: AddUserDialogProps) {
  const { user: currentUser, isAdmin } = useAuth();
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [selectedRole, setSelectedRole] = useState<string>("user");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!currentUser) {
      toast({
        title: "Error",
        description: "You must be logged in to create users",
        variant: "destructive",
      });
      return;
    }

    if (!isAdmin) {
      toast({
        title: "Error",
        description: "Only administrators can create new users",
        variant: "destructive",
      });
      return;
    }

    if (!email || !username) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      toast({
        title: "Error",
        description: "Please enter a valid email address",
        variant: "destructive",
      });
      return;
    }

    setSubmitting(true);
    try {
      console.log('Creating user via edge function...');
      
      // Call the edge function to create user and send invite
      const { data, error } = await supabase.functions.invoke('send-user-invite', {
        body: {
          email,
          role: selectedRole,
          inviterName: username || 'Admin',
        },
      });

      if (error) {
        console.error('Edge function error:', error);
        throw new Error(error.message || 'Failed to create user');
      }

      if (!data?.success) {
        throw new Error(data?.error || 'Failed to send invitation');
      }

      console.log('User created successfully');

      // Log audit
      await logAudit({
        action: 'create_user',
        resourceType: 'user_management',
        resourceId: email,
        details: {
          email,
          username,
          role: selectedRole,
        },
      });

      toast({
        title: "User invited successfully",
        description: `An invitation has been sent to ${email} with ${selectedRole} role`,
      });

      // Reset form
      setEmail("");
      setUsername("");
      setSelectedRole("user");
      
      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      console.error("Error creating user:", error);
      
      let errorMessage = "Failed to create user";
      
      if (error.message) {
        errorMessage = error.message;
      }
      
      // Handle specific error cases
      if (error.message?.includes('User already registered')) {
        errorMessage = "A user with this email already exists";
      } else if (error.message?.includes('not allowed')) {
        errorMessage = "You don't have permission to create users. Please contact your administrator.";
      } else if (error.message?.includes('role')) {
        errorMessage = "Failed to assign role. Please try again or contact support.";
      }
      
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Add New User
          </DialogTitle>
          <DialogDescription>
            Send an invitation email to create a new user account
          </DialogDescription>
        </DialogHeader>

        {!isAdmin && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Only administrators can create new users
            </AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email Address *</Label>
            <Input
              id="email"
              type="email"
              placeholder="user@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={!isAdmin}
            />
            <p className="text-xs text-muted-foreground">
              An invitation will be sent to this email
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="username">Username *</Label>
            <Input
              id="username"
              type="text"
              placeholder="Enter username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              disabled={!isAdmin}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="role">Role *</Label>
            <Select 
              value={selectedRole} 
              onValueChange={setSelectedRole}
              disabled={!isAdmin}
            >
              <SelectTrigger>
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
            <p className="text-xs text-muted-foreground">
              {selectedRole === 'admin' && '👑 Full system access'}
              {selectedRole === 'sales' && '💼 Manage clients, leads, and plans'}
              {selectedRole === 'operations' && '⚙️ Manage campaigns and mounting tasks'}
              {selectedRole === 'finance' && '💰 Manage invoices and expenses'}
              {selectedRole === 'user' && '👤 Basic access'}
            </p>
          </div>

          <Alert>
            <AlertDescription className="text-xs">
              The user will receive an email with a link to set their password and activate their account.
            </AlertDescription>
          </Alert>

          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={submitting || !isAdmin}>
              <UserPlus className="h-4 w-4 mr-2" />
              {submitting ? "Sending Invitation..." : "Send Invitation"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

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

const ROLES = ['admin', 'manager', 'sales', 'operations', 'installation', 'monitoring'];

export default function AddUserDialog({
  open,
  onOpenChange,
  onSuccess,
}: AddUserDialogProps) {
  const { user: currentUser, isAdmin } = useAuth();
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [selectedRole, setSelectedRole] = useState<string>("sales");
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

    if (!email || !username || !password) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    // Validate password strength
    if (password.length < 6) {
      toast({
        title: "Error",
        description: "Password must be at least 6 characters long",
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
      console.log('Creating user with password...');
      
      // Create user directly via Supabase Admin API
      const { data: { user: newUser }, error: createError } = await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true, // Auto-confirm email
        user_metadata: {
          username,
          role: selectedRole
        }
      });

      if (createError) {
        console.error('User creation error:', createError);
        throw createError;
      }

      if (!newUser) {
        throw new Error('User creation failed - no user data returned');
      }

      console.log('User created:', newUser.id);

      // Insert profile for the new user
      const { error: profileError } = await supabase
        .from('profiles')
        .insert({
          id: newUser.id,
          username: username
        });

      if (profileError) {
        console.error('Profile creation error:', profileError);
        // Don't fail the whole operation if profile creation fails
      }

      // Insert role for the new user
      const { error: roleError } = await supabase
        .from('user_roles')
        .insert([{
          user_id: newUser.id,
          role: selectedRole as any
        }]);

      if (roleError) {
        console.error('Role assignment error:', roleError);
        throw new Error(`Failed to assign role: ${roleError.message}`);
      }

      console.log('Role assigned successfully:', selectedRole);

      // Log audit
      await logAudit({
        action: 'invite_user',
        resourceType: 'user_management',
        resourceId: email,
        details: {
          email,
          username,
          role: selectedRole,
        },
      });

      // Log activity
      await supabase.rpc('log_user_activity', {
        p_user_id: currentUser.id,
        p_activity_type: 'invite_user',
        p_activity_description: `Invited ${email} with role ${selectedRole}`,
        p_metadata: { invited_email: email, assigned_role: selectedRole },
      });

      toast({
        title: "User created successfully",
        description: `User ${email} has been created with ${selectedRole} role`,
      });

      // Reset form
      setEmail("");
      setUsername("");
      setPassword("");
      setSelectedRole("sales");
      
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
            Create a new user account with credentials
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
            <Label htmlFor="password">Password *</Label>
            <Input
              id="password"
              type="password"
              placeholder="Enter password (min 6 characters)"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={!isAdmin}
            />
            <p className="text-xs text-muted-foreground">
              Minimum 6 characters required
            </p>
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
              {selectedRole === 'manager' && '📊 Manage teams and oversee operations'}
              {selectedRole === 'sales' && '💼 Manage clients, leads, and plans'}
              {selectedRole === 'operations' && '⚙️ Manage campaigns and mounting tasks'}
              {selectedRole === 'installation' && '🔧 Handle media asset installation'}
              {selectedRole === 'monitoring' && '📹 Monitor asset status and performance'}
            </p>
          </div>

          <Alert>
            <AlertDescription className="text-xs">
              The user will be created immediately with the provided credentials. You can send an invitation email later from the user list.
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
              {submitting ? "Creating User..." : "Add User"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

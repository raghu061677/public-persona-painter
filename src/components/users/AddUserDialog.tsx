import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
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
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "@/hooks/use-toast";
import { logAudit } from "@/utils/auditLog";
import { Eye, EyeOff, UserPlus } from "lucide-react";

interface AddUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

const ROLES = ['admin', 'sales', 'operations', 'finance'];

const MODULES = [
  { key: 'sales', label: 'Sales' },
  { key: 'planning', label: 'Planning' },
  { key: 'execution', label: 'Execution' },
  { key: 'inventory', label: 'Inventory' },
  { key: 'finance', label: 'Finance' },
  { key: 'administration', label: 'Administration' },
];

export default function AddUserDialog({
  open,
  onOpenChange,
  onSuccess,
}: AddUserDialogProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [selectedRole, setSelectedRole] = useState<string>("sales");
  const [customPermissions, setCustomPermissions] = useState<Record<string, boolean>>({});
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handlePermissionToggle = (module: string) => {
    setCustomPermissions(prev => ({
      ...prev,
      [module]: !prev[module]
    }));
  };

  const generatePassword = () => {
    const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*";
    let newPassword = "";
    for (let i = 0; i < 12; i++) {
      newPassword += charset.charAt(Math.floor(Math.random() * charset.length));
    }
    setPassword(newPassword);
    toast({
      title: "Password Generated",
      description: "A secure password has been generated",
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email || !password || !username) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    if (password.length < 8) {
      toast({
        title: "Error",
        description: "Password must be at least 8 characters long",
        variant: "destructive",
      });
      return;
    }

    setSubmitting(true);
    try {
      // Create user via Supabase Admin API
      const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: {
          username: username,
        },
      });

      if (createError) throw createError;

      if (!newUser.user) {
        throw new Error("Failed to create user");
      }

      // Update profile with username
      const { error: profileError } = await supabase
        .from("profiles")
        .update({ username })
        .eq("id", newUser.user.id);

      if (profileError) throw profileError;

      // Assign role
      const { error: roleError } = await supabase
        .from("user_roles")
        .insert({
          user_id: newUser.user.id,
          role: selectedRole as any,
        });

      if (roleError) throw roleError;

      // If admin role and custom permissions are set, create role_permissions
      if (selectedRole !== 'admin' && Object.keys(customPermissions).length > 0) {
        const permissionsToInsert = Object.entries(customPermissions)
          .filter(([_, canAccess]) => canAccess)
          .map(([module, _]) => ({
            role: selectedRole,
            module,
            can_access: true,
          }));

        if (permissionsToInsert.length > 0) {
          const { error: permError } = await supabase
            .from("role_permissions")
            .upsert(permissionsToInsert, {
              onConflict: 'role,module',
            });

          if (permError) throw permError;
        }
      }

      // Log audit
      await logAudit({
        action: 'create_user',
        resourceType: 'user_management',
        resourceId: newUser.user.id,
        details: {
          email,
          username,
          role: selectedRole,
        },
      });

      toast({
        title: "User created successfully",
        description: `${email} has been added with ${selectedRole} role`,
      });

      // Reset form
      setEmail("");
      setPassword("");
      setUsername("");
      setSelectedRole("sales");
      setCustomPermissions({});
      
      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      console.error("Error creating user:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to create user",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Add New User
          </DialogTitle>
          <DialogDescription>
            Create a new user account with assigned role and permissions
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email Address *</Label>
              <Input
                id="email"
                type="email"
                placeholder="user@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
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
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Password *</Label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter password (min 8 characters)"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <Button
                type="button"
                variant="outline"
                onClick={generatePassword}
              >
                Generate
              </Button>
            </div>
            {password && password.length < 8 && (
              <p className="text-xs text-destructive">Password must be at least 8 characters</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="role">Role *</Label>
            <Select value={selectedRole} onValueChange={setSelectedRole}>
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
          </div>

          {selectedRole !== 'admin' && (
            <div className="space-y-3 border rounded-lg p-4">
              <Label className="text-sm font-semibold">Custom Module Permissions</Label>
              <p className="text-xs text-muted-foreground mb-2">
                Override default role permissions for this user
              </p>
              <div className="grid grid-cols-2 gap-3">
                {MODULES.map(module => (
                  <div key={module.key} className="flex items-center space-x-2">
                    <Checkbox
                      id={module.key}
                      checked={customPermissions[module.key] || false}
                      onCheckedChange={() => handlePermissionToggle(module.key)}
                    />
                    <label
                      htmlFor={module.key}
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                      {module.label}
                    </label>
                  </div>
                ))}
              </div>
            </div>
          )}

          {selectedRole === 'admin' && (
            <div className="bg-muted/50 border border-primary/20 rounded-lg p-3">
              <p className="text-sm text-muted-foreground">
                ℹ️ Admin users have access to all modules by default
              </p>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              <UserPlus className="h-4 w-4 mr-2" />
              {submitting ? "Creating..." : "Create User"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

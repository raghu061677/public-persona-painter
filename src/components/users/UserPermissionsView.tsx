import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { CheckCircle2, XCircle } from "lucide-react";

interface UserProfile {
  id: string;
  username: string;
  email?: string;
  avatar_url?: string;
  roles?: string[];
}

const MODULES = [
  { key: 'sales', label: 'Sales' },
  { key: 'planning', label: 'Planning' },
  { key: 'execution', label: 'Execution' },
  { key: 'inventory', label: 'Inventory' },
  { key: 'finance', label: 'Finance' },
  { key: 'administration', label: 'Administration' },
];

export default function UserPermissionsView() {
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [rolePermissions, setRolePermissions] = useState<Record<string, Record<string, boolean>>>({});

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);

      // Call the list-users edge function
      const { data: usersData, error: usersError } = await supabase.functions.invoke('list-users');
      if (usersError) throw usersError;

      if (usersData?.users) {
        setUsers(usersData.users);
      } else {
        setUsers([]);
      }

      // Load role permissions
      const { data: permsData, error: permsError } = await supabase
        .from("role_permissions")
        .select("*");
      if (permsError) throw permsError;

      const permsMap: Record<string, Record<string, boolean>> = {};
      const allRoles = ['admin', 'sales', 'operations', 'finance'];
      
      allRoles.forEach(role => {
        permsMap[role] = {};
        MODULES.forEach(module => {
          const perm = permsData?.find(p => p.role === role && p.module === module.key);
          // Admin has all permissions by default
          permsMap[role][module.key] = role === 'admin' ? true : ((perm as any)?.can_view || false);
        });
      });

      setRolePermissions(permsMap);
    } catch (error: any) {
      console.error("Error loading data:", error);
    } finally {
      setLoading(false);
    }
  };

  const getUserPermissions = (user: UserProfile) => {
    const userRole = user.roles?.[0] || 'sales';
    return rolePermissions[userRole] || {};
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <Skeleton className="h-20 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {users.map((user) => {
        const permissions = getUserPermissions(user);
        const accessibleModules = Object.entries(permissions)
          .filter(([_, hasAccess]) => hasAccess)
          .map(([module]) => module);

        return (
          <Card key={user.id}>
            <CardHeader>
              <div className="flex items-center gap-4">
                <Avatar className="h-12 w-12">
                  <AvatarImage src={user.avatar_url} />
                  <AvatarFallback>
                    {user.username.substring(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <CardTitle className="text-lg">{user.username}</CardTitle>
                  <CardDescription>{user.email}</CardDescription>
                </div>
                {user.roles && user.roles.length > 0 && (
                  <Badge variant="secondary" className="capitalize">
                    {user.roles[0]}
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <p className="text-sm font-medium text-muted-foreground mb-3">
                  Module Access ({accessibleModules.length}/{MODULES.length})
                </p>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {MODULES.map((module) => {
                    const hasAccess = permissions[module.key] || false;
                    return (
                      <div
                        key={module.key}
                        className="flex items-center gap-2 p-2 rounded-lg border"
                      >
                        {hasAccess ? (
                          <CheckCircle2 className="h-4 w-4 text-green-600" />
                        ) : (
                          <XCircle className="h-4 w-4 text-muted-foreground" />
                        )}
                        <span className={`text-sm ${hasAccess ? 'text-foreground' : 'text-muted-foreground'}`}>
                          {module.label}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

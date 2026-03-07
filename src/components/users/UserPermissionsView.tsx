import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { CheckCircle2, XCircle, LayoutDashboard, MapPin, Users, FileText, Megaphone, Wrench, Monitor, DollarSign, BarChart3, Settings, ClipboardList } from "lucide-react";
import { getRoleLabel, getRoleBadgeVariant } from "@/lib/rbac/roleNormalization";

interface UserProfile {
  id: string;
  username: string;
  email?: string;
  avatar_url?: string;
  roles?: string[];
}

const MODULES = [
  { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { key: 'media_assets', label: 'Media Assets', icon: MapPin },
  { key: 'clients', label: 'Clients', icon: Users },
  { key: 'plans', label: 'Plans', icon: FileText },
  { key: 'campaigns', label: 'Campaigns', icon: Megaphone },
  { key: 'operations', label: 'Operations', icon: Wrench },
  { key: 'monitoring', label: 'Monitoring', icon: Monitor },
  { key: 'finance', label: 'Finance', icon: DollarSign },
  { key: 'reports', label: 'Reports', icon: BarChart3 },
  { key: 'users', label: 'Users', icon: Users },
  { key: 'settings', label: 'Settings', icon: Settings },
];

const getSafeDisplayName = (user: UserProfile) =>
  user?.username || user?.email?.split("@")[0] || "User";

const getSafeInitials = (user: UserProfile) => {
  const name = getSafeDisplayName(user).trim();
  if (!name) return "U";
  const parts = name.split(" ").filter(Boolean);
  if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  return name.substring(0, 2).toUpperCase();
};

export default function UserPermissionsView() {
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [rolePermissions, setRolePermissions] = useState<Record<string, Record<string, boolean>>>({});

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const { data: usersData, error: usersError } = await supabase.functions.invoke('list-users');
      if (usersError) throw usersError;

      if (usersData?.users) {
        setUsers(usersData.users.map((u: any) => ({
          id: u.user_id || u.id,
          username: u.name || u.username || u.auth_email?.split('@')[0] || u.email?.split('@')[0] || 'Unknown',
          email: u.auth_email || u.email || '',
          avatar_url: u.avatar_url,
          roles: u.roles || (u.role ? [u.role] : []),
        })));
      } else { setUsers([]); }

      const { data: permsData, error: permsError } = await supabase.from("role_permissions").select("*");
      if (permsError) throw permsError;

      const permsMap: Record<string, Record<string, boolean>> = {};
      const allRoles = ['admin', 'sales', 'operations', 'finance', 'operations_manager', 'mounting', 'monitoring', 'viewer', 'installation', 'monitor', 'user'];
      allRoles.forEach(role => {
        permsMap[role] = {};
        MODULES.forEach(module => {
          const perm = permsData?.find(p => p.role === role && p.module === module.key);
          permsMap[role][module.key] = role === 'admin' ? true : ((perm as any)?.can_view || false);
        });
      });
      setRolePermissions(permsMap);
    } catch (error: any) {
      console.error("Error loading data:", error);
    } finally { setLoading(false); }
  };

  const getUserPermissions = (user: UserProfile) => {
    const userRole = user.roles?.[0] || 'viewer';
    return rolePermissions[userRole] || {};
  };

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map(i => (
          <Card key={i} className="border shadow-sm">
            <CardContent className="p-4">
              <Skeleton className="h-16 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {users.map(user => {
        const permissions = getUserPermissions(user);
        const accessibleModules = Object.entries(permissions).filter(([_, v]) => v).map(([k]) => k);
        const primaryRole = user.roles?.[0] || "viewer";

        return (
          <Card key={user.id} className="border shadow-sm hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-start gap-4">
                <Avatar className="h-10 w-10 shrink-0">
                  <AvatarImage src={user.avatar_url} />
                  <AvatarFallback className="text-xs bg-primary/5 text-primary font-medium">
                    {getSafeInitials(user)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-sm">{getSafeDisplayName(user)}</span>
                    <Badge className={`${getRoleBadgeVariant(primaryRole)} text-[11px] px-2 py-0`}>
                      {getRoleLabel(primaryRole)}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {accessibleModules.length}/{MODULES.length} modules
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5 truncate">{user.email}</p>
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {MODULES.map(module => {
                      const hasAccess = permissions[module.key] || false;
                      const Icon = module.icon;
                      return (
                        <div
                          key={module.key}
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] border ${
                            hasAccess
                              ? "bg-emerald-500/5 border-emerald-500/20 text-emerald-700"
                              : "bg-muted/30 border-transparent text-muted-foreground/50"
                          }`}
                        >
                          {hasAccess ? (
                            <CheckCircle2 className="h-3 w-3" />
                          ) : (
                            <XCircle className="h-3 w-3" />
                          )}
                          {module.label}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

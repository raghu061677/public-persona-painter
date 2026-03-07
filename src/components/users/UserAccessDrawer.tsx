import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { getRoleLabel, getRoleBadgeVariant, normalizeRole } from "@/lib/rbac/roleNormalization";
import { ALL_MODULES, EMPTY_PERMISSION, FULL_PERMISSION } from "@/lib/rbac/permissions";
import type { ModuleKey, ModulePermission } from "@/lib/rbac/permissions";
import {
  Shield, Eye, Plus, Pencil, Trash2, UserCheck, CheckCircle2,
  XCircle, Lock, Upload, FileDown, Clock, Layers, KeyRound,
  LayoutDashboard, MapPin, Users, FileText, Megaphone,
  Wrench, Monitor, DollarSign, BarChart3, Settings, ClipboardList
} from "lucide-react";
import { format } from "date-fns";

interface UserProfile {
  id: string;
  username: string;
  avatar_url?: string;
  created_at: string;
  email?: string;
  roles?: string[];
  status?: string;
}

interface UserAccessDrawerProps {
  user: UserProfile | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEditRole: () => void;
  onResetPassword: () => void;
}

const getSafeDisplayName = (user: UserProfile | null) =>
  user?.username || user?.email?.split("@")[0] || "User";

const getSafeInitials = (user: UserProfile | null) => {
  const name = getSafeDisplayName(user).trim();
  if (!name) return "U";
  const parts = name.split(" ").filter(Boolean);
  if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  return name.substring(0, 2).toUpperCase();
};

const MODULE_LABELS: Record<string, { label: string; icon: React.ComponentType<any> }> = {
  dashboard: { label: "Dashboard", icon: LayoutDashboard },
  media_assets: { label: "Media Assets", icon: MapPin },
  clients: { label: "Clients", icon: Users },
  plans: { label: "Plans", icon: FileText },
  campaigns: { label: "Campaigns", icon: Megaphone },
  operations: { label: "Operations", icon: Wrench },
  monitoring: { label: "Monitoring", icon: Monitor },
  finance: { label: "Finance", icon: DollarSign },
  reports: { label: "Reports", icon: BarChart3 },
  users: { label: "Users", icon: Users },
  settings: { label: "Settings", icon: Settings },
};

const PERMISSION_ACTIONS = [
  { key: "can_view", label: "View", icon: Eye },
  { key: "can_create", label: "Create", icon: Plus },
  { key: "can_edit", label: "Edit", icon: Pencil },
  { key: "can_delete", label: "Delete", icon: Trash2 },
  { key: "can_assign", label: "Assign", icon: UserCheck },
  { key: "can_approve", label: "Approve", icon: CheckCircle2 },
  { key: "can_export", label: "Export", icon: FileDown },
  { key: "can_upload_proof", label: "Upload Proof", icon: Upload },
  { key: "can_view_sensitive", label: "Sensitive", icon: Lock },
] as const;

export default function UserAccessDrawer({
  user, open, onOpenChange, onEditRole, onResetPassword
}: UserAccessDrawerProps) {
  const [permissions, setPermissions] = useState<Record<string, any>>({});
  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open && user) {
      loadPermissions();
      loadActivity();
    }
  }, [open, user]);

  const loadPermissions = async () => {
    if (!user?.roles?.length) return;
    setLoading(true);
    try {
      const role = user.roles[0];
      const { data } = await supabase
        .from("role_permissions")
        .select("*")
        .eq("role", role);
      const permsMap: Record<string, any> = {};
      (data || []).forEach((p: any) => { permsMap[p.module] = p; });
      setPermissions(permsMap);
    } catch { } finally { setLoading(false); }
  };

  const loadActivity = async () => {
    if (!user) return;
    try {
      const { data } = await supabase
        .from("activity_logs")
        .select("action, resource_type, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(5);
      setRecentActivity(data || []);
    } catch { }
  };

  if (!user) return null;

  const primaryRole = user.roles?.[0] || "viewer";
  const normalizedRole = normalizeRole(primaryRole);
  const isAdmin = normalizedRole === "admin" || normalizedRole === "platform_admin";

  const accessibleModules = ALL_MODULES.filter(m => {
    if (isAdmin) return true;
    return permissions[m]?.can_view;
  });

  const canViewSensitive = isAdmin || Object.values(permissions).some((p: any) => p?.can_view_sensitive);

  const getScopeLabel = () => {
    if (isAdmin) return "Full access to all records";
    if (normalizedRole === "sales") return "Own records + assigned clients";
    if (normalizedRole === "mounting") return "Assigned tasks only";
    if (normalizedRole === "monitoring") return "Assigned monitoring only";
    if (normalizedRole === "finance") return "All financial records (view)";
    if (normalizedRole === "viewer") return "Read-only basic access";
    return "Standard scope";
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-[540px] p-0">
        <ScrollArea className="h-full">
          <div className="p-6 space-y-6">
            {/* Header */}
            <SheetHeader className="space-y-0">
              <div className="flex items-start gap-4">
                <Avatar className="h-14 w-14 border-2 border-primary/10">
                  <AvatarImage src={user.avatar_url} />
                  <AvatarFallback className="bg-primary/5 text-primary font-semibold text-lg">
                    {getSafeInitials(user)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <SheetTitle className="text-lg truncate">{getSafeDisplayName(user)}</SheetTitle>
                  <p className="text-sm text-muted-foreground truncate">{user.email || "No email"}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <Badge className={`${getRoleBadgeVariant(primaryRole)} text-xs`}>
                      {getRoleLabel(primaryRole)}
                    </Badge>
                    <Badge variant={user.status === "Active" ? "default" : "secondary"} className="text-xs">
                      {user.status || "Unknown"}
                    </Badge>
                  </div>
                </div>
              </div>
            </SheetHeader>

            {/* Quick actions */}
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={onEditRole} className="flex-1">
                <Shield className="h-3.5 w-3.5 mr-1.5" /> Edit Role
              </Button>
              <Button size="sm" variant="outline" onClick={onResetPassword} className="flex-1">
                <KeyRound className="h-3.5 w-3.5 mr-1.5" /> Reset Password
              </Button>
            </div>

            <Separator />

            {/* Access summary cards */}
            <div className="grid grid-cols-3 gap-3">
              <Card className="border-0 bg-primary/5">
                <CardContent className="p-3 text-center">
                  <p className="text-2xl font-bold text-primary">{accessibleModules.length}</p>
                  <p className="text-[11px] text-muted-foreground font-medium">Modules</p>
                </CardContent>
              </Card>
              <Card className={`border-0 ${canViewSensitive ? "bg-amber-500/10" : "bg-muted"}`}>
                <CardContent className="p-3 text-center">
                  <p className="text-2xl font-bold">{canViewSensitive ? "Yes" : "No"}</p>
                  <p className="text-[11px] text-muted-foreground font-medium">Sensitive</p>
                </CardContent>
              </Card>
              <Card className="border-0 bg-muted">
                <CardContent className="p-3 text-center">
                  <p className="text-2xl font-bold">{isAdmin ? "All" : "Scoped"}</p>
                  <p className="text-[11px] text-muted-foreground font-medium">Data Scope</p>
                </CardContent>
              </Card>
            </div>

            {/* Data visibility */}
            <div>
              <h4 className="text-sm font-semibold mb-2 flex items-center gap-1.5">
                <Layers className="h-4 w-4" /> Data Visibility
              </h4>
              <p className="text-sm text-muted-foreground bg-muted/50 rounded-lg p-3">
                {getScopeLabel()}
              </p>
            </div>

            <Separator />

            {/* Module permissions grid */}
            <div>
              <h4 className="text-sm font-semibold mb-3">Module Permissions</h4>
              <div className="space-y-2">
                {ALL_MODULES.map(moduleKey => {
                  const meta = MODULE_LABELS[moduleKey] || { label: moduleKey, icon: ClipboardList };
                  const Icon = meta.icon;
                  const perm = isAdmin ? null : permissions[moduleKey];
                  const hasView = isAdmin || perm?.can_view;

                  return (
                    <div key={moduleKey}
                      className={`rounded-lg border p-3 ${hasView ? "bg-background" : "bg-muted/30 opacity-60"}`}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <Icon className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm font-medium flex-1">{meta.label}</span>
                        {hasView ? (
                          <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                        ) : (
                          <XCircle className="h-4 w-4 text-muted-foreground/50" />
                        )}
                      </div>
                      {hasView && (
                        <div className="flex flex-wrap gap-1">
                          {PERMISSION_ACTIONS.map(action => {
                            const granted = isAdmin || perm?.[action.key];
                            if (!granted) return null;
                            return (
                              <Badge key={action.key} variant="secondary" className="text-[10px] px-1.5 py-0 h-5 gap-0.5">
                                <action.icon className="h-2.5 w-2.5" />
                                {action.label}
                              </Badge>
                            );
                          })}
                          {isAdmin && (
                            <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-5 bg-primary/10 text-primary">
                              Full Access
                            </Badge>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <Separator />

            {/* Recent activity */}
            <div>
              <h4 className="text-sm font-semibold mb-3 flex items-center gap-1.5">
                <Clock className="h-4 w-4" /> Recent Activity
              </h4>
              {recentActivity.length > 0 ? (
                <div className="space-y-2">
                  {recentActivity.map((a, i) => (
                    <div key={i} className="flex items-center gap-3 text-sm py-1.5">
                      <div className="h-1.5 w-1.5 rounded-full bg-primary/50 shrink-0" />
                      <span className="flex-1 truncate text-muted-foreground">
                        {a.action} on {a.resource_type}
                      </span>
                      <span className="text-xs text-muted-foreground/70 shrink-0">
                        {format(new Date(a.created_at), "MMM d")}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No recent activity recorded.</p>
              )}
            </div>

            {/* Joined info */}
            <div className="text-xs text-muted-foreground pt-2 border-t">
              Joined {user.created_at ? format(new Date(user.created_at), "PPP") : "Unknown"}
            </div>
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}

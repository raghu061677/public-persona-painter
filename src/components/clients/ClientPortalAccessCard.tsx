import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Globe,
  Mail,
  Shield,
  ShieldCheck,
  ShieldX,
  Clock,
  Copy,
  Send,
  UserPlus,
  RefreshCw,
  Loader2,
  CheckCircle,
  XCircle,
  ExternalLink,
  Key,
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

interface PortalUser {
  id: string;
  client_id: string;
  email: string;
  name: string | null;
  phone: string | null;
  role: string | null;
  auth_user_id: string | null;
  last_login: string | null;
  invited_by: string | null;
  invited_at: string | null;
  is_active: boolean | null;
  magic_link_token: string | null;
  magic_link_expires_at: string | null;
  created_at: string | null;
}

interface ClientPortalAccessCardProps {
  clientId: string;
  clientName: string;
  clientEmail?: string | null;
  onInviteClick?: () => void;
}

type PortalStatus = "not_created" | "active" | "inactive" | "invite_pending" | "invite_expired";

function getPortalStatus(portalUser: PortalUser | null): PortalStatus {
  if (!portalUser) return "not_created";
  if (!portalUser.is_active) return "inactive";
  if (!portalUser.auth_user_id && portalUser.magic_link_token) {
    const expires = portalUser.magic_link_expires_at;
    if (expires && new Date(expires) < new Date()) return "invite_expired";
    return "invite_pending";
  }
  return "active";
}

function StatusBadge({ status }: { status: PortalStatus }) {
  const config: Record<PortalStatus, { label: string; variant: "default" | "secondary" | "destructive" | "outline"; className: string }> = {
    not_created: { label: "Not Created", variant: "outline", className: "border-muted-foreground/30 text-muted-foreground" },
    active: { label: "Active", variant: "default", className: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30" },
    inactive: { label: "Deactivated", variant: "destructive", className: "bg-destructive/15 text-destructive border-destructive/30" },
    invite_pending: { label: "Invite Pending", variant: "secondary", className: "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30" },
    invite_expired: { label: "Invite Expired", variant: "outline", className: "border-orange-500/30 text-orange-600 dark:text-orange-400" },
  };
  const c = config[status];
  return <Badge variant={c.variant} className={c.className}>{c.label}</Badge>;
}

export function ClientPortalAccessCard({ clientId, clientName, clientEmail, onInviteClick }: ClientPortalAccessCardProps) {
  const [portalUser, setPortalUser] = useState<PortalUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [createEmail, setCreateEmail] = useState(clientEmail || "");
  const [createRole, setCreateRole] = useState("viewer");
  const [createName, setCreateName] = useState(clientName || "");

  const fetchPortalUser = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error } = await (supabase as any)
        .from("client_portal_users")
        .select("*")
        .eq("client_id", clientId)
        .order("created_at", { ascending: false })
        .limit(1);

      if (error) throw error;
      setPortalUser(data && data.length > 0 ? data[0] : null);
    } catch (err: any) {
      console.error("Error fetching portal user:", err);
    } finally {
      setLoading(false);
    }
  }, [clientId]);

  useEffect(() => {
    fetchPortalUser();
  }, [fetchPortalUser]);

  const status = getPortalStatus(portalUser);

  const handleCreateAccess = async () => {
    if (!createEmail) {
      toast.error("Email is required for portal access");
      return;
    }
    setActionLoading(true);
    try {
      const { error } = await (supabase as any)
        .from("client_portal_users")
        .upsert({
          client_id: clientId,
          email: createEmail.toLowerCase().trim(),
          name: createName || clientName,
          role: createRole,
          is_active: true,
          invited_at: new Date().toISOString(),
        }, { onConflict: "client_id,email" });

      if (error) throw error;
      toast.success("Portal access created successfully");
      setShowCreateForm(false);
      await fetchPortalUser();
    } catch (err: any) {
      console.error("Error creating portal access:", err);
      toast.error(err.message || "Failed to create portal access");
    } finally {
      setActionLoading(false);
    }
  };

  const handleToggleActive = async (activate: boolean) => {
    if (!portalUser) return;
    setActionLoading(true);
    try {
      const { error } = await (supabase as any)
        .from("client_portal_users")
        .update({ is_active: activate, updated_at: new Date().toISOString() })
        .eq("id", portalUser.id);

      if (error) throw error;
      toast.success(activate ? "Portal access reactivated" : "Portal access deactivated");
      await fetchPortalUser();
    } catch (err: any) {
      toast.error(err.message || "Failed to update portal access");
    } finally {
      setActionLoading(false);
    }
  };

  const handleGenerateMagicLink = async () => {
    if (!portalUser) return;
    setActionLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const response = await supabase.functions.invoke("send-client-portal-invite", {
        body: { clientId, email: portalUser.email, expiresInHours: 72 },
        headers: { Authorization: `Bearer ${session?.access_token}` },
      });

      if (response.error) throw response.error;

      if (response.data?.magicLink) {
        await navigator.clipboard.writeText(response.data.magicLink);
        toast.success("Magic link generated & copied to clipboard!", {
          description: "Share this link with the client via WhatsApp or email.",
        });
      } else {
        toast.success("Invite sent successfully!");
      }
      await fetchPortalUser();
    } catch (err: any) {
      // Fallback: generate link manually if email fails
      toast.error(err.message || "Failed to generate magic link");
    } finally {
      setActionLoading(false);
    }
  };

  const handleCopyExistingLink = () => {
    if (!portalUser?.magic_link_token) {
      toast.error("No active magic link found");
      return;
    }
    const link = `${window.location.origin}/portal/auth?token=${portalUser.magic_link_token}`;
    navigator.clipboard.writeText(link);
    toast.success("Magic link copied to clipboard");
  };

  const handleSendInvite = () => {
    if (onInviteClick) {
      onInviteClick();
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5" />
            Client Portal Access
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Globe className="h-5 w-5 text-primary" />
            <div>
              <CardTitle className="text-base">Client Portal Access</CardTitle>
              <CardDescription>Manage portal login and permissions</CardDescription>
            </div>
          </div>
          <StatusBadge status={status} />
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Status: Not Created */}
        {status === "not_created" && !showCreateForm && (
          <div className="text-center py-6 space-y-3">
            <div className="mx-auto w-12 h-12 rounded-full bg-muted flex items-center justify-center">
              <ShieldX className="h-6 w-6 text-muted-foreground" />
            </div>
            <div>
              <p className="text-sm font-medium">No Portal Access</p>
              <p className="text-xs text-muted-foreground mt-1">
                Create portal access so the client can view campaigns, proofs, and invoices.
              </p>
            </div>
            <Button onClick={() => { setCreateEmail(clientEmail || ""); setShowCreateForm(true); }} className="mt-2">
              <UserPlus className="mr-2 h-4 w-4" />
              Create Portal Access
            </Button>
          </div>
        )}

        {/* Create Form */}
        {showCreateForm && (
          <div className="space-y-4 p-4 border rounded-lg bg-muted/30">
            <h4 className="text-sm font-medium flex items-center gap-2">
              <UserPlus className="h-4 w-4" />
              Create Portal Access
            </h4>
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="portal-name" className="text-xs">Display Name</Label>
                <Input
                  id="portal-name"
                  value={createName}
                  onChange={(e) => setCreateName(e.target.value)}
                  placeholder="Client contact name"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="portal-email" className="text-xs">Portal Email *</Label>
                <Input
                  id="portal-email"
                  type="email"
                  value={createEmail}
                  onChange={(e) => setCreateEmail(e.target.value)}
                  placeholder="client@company.com"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="portal-role" className="text-xs">Access Role</Label>
                <Select value={createRole} onValueChange={setCreateRole}>
                  <SelectTrigger id="portal-role">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="client_admin">Client Admin</SelectItem>
                    <SelectItem value="client_accounts">Client Accounts</SelectItem>
                    <SelectItem value="viewer">Viewer (Read Only)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex gap-2 pt-2">
              <Button onClick={handleCreateAccess} disabled={actionLoading || !createEmail} size="sm">
                {actionLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle className="mr-2 h-4 w-4" />}
                Create Access
              </Button>
              <Button variant="outline" size="sm" onClick={() => setShowCreateForm(false)} disabled={actionLoading}>
                Cancel
              </Button>
            </div>
          </div>
        )}

        {/* Existing Portal User Info */}
        {portalUser && !showCreateForm && (
          <>
            {/* Info Rows */}
            <div className="space-y-3">
              <InfoRow icon={<Mail className="h-4 w-4" />} label="Portal Email" value={portalUser.email} />
              <InfoRow
                icon={<Shield className="h-4 w-4" />}
                label="Access Role"
                value={
                  <Badge variant="outline" className="text-xs capitalize">
                    {(portalUser.role || "viewer").replace("_", " ")}
                  </Badge>
                }
              />
              {portalUser.last_login && (
                <InfoRow
                  icon={<Clock className="h-4 w-4" />}
                  label="Last Login"
                  value={format(new Date(portalUser.last_login), "MMM dd, yyyy 'at' hh:mm a")}
                />
              )}
              {portalUser.invited_at && (
                <InfoRow
                  icon={<Send className="h-4 w-4" />}
                  label="Last Invite Sent"
                  value={format(new Date(portalUser.invited_at), "MMM dd, yyyy 'at' hh:mm a")}
                />
              )}
              {portalUser.auth_user_id && (
                <InfoRow
                  icon={<ShieldCheck className="h-4 w-4" />}
                  label="Auth Status"
                  value={<span className="text-emerald-600 dark:text-emerald-400 text-xs font-medium">Linked & Verified</span>}
                />
              )}
              {!portalUser.auth_user_id && (
                <InfoRow
                  icon={<Key className="h-4 w-4" />}
                  label="Auth Status"
                  value={<span className="text-amber-600 dark:text-amber-400 text-xs font-medium">Not yet logged in</span>}
                />
              )}
            </div>

            <Separator />

            {/* Actions */}
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Actions</p>
              <div className="flex flex-wrap gap-2">
                {portalUser.is_active && (
                  <>
                    <Button variant="default" size="sm" onClick={handleSendInvite} disabled={actionLoading}>
                      <Send className="mr-1.5 h-3.5 w-3.5" />
                      Send Invite
                    </Button>
                    <Button variant="outline" size="sm" onClick={handleGenerateMagicLink} disabled={actionLoading}>
                      {actionLoading ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Key className="mr-1.5 h-3.5 w-3.5" />}
                      Generate & Copy Link
                    </Button>
                    {portalUser.magic_link_token && (
                      <Button variant="ghost" size="sm" onClick={handleCopyExistingLink}>
                        <Copy className="mr-1.5 h-3.5 w-3.5" />
                        Copy Last Link
                      </Button>
                    )}
                  </>
                )}

                {portalUser.is_active ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:text-destructive"
                    onClick={() => handleToggleActive(false)}
                    disabled={actionLoading}
                  >
                    <XCircle className="mr-1.5 h-3.5 w-3.5" />
                    Deactivate
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleToggleActive(true)}
                    disabled={actionLoading}
                  >
                    <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
                    Reactivate
                  </Button>
                )}
              </div>
            </div>

            {/* Portal link hint */}
            {portalUser.is_active && (
              <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900">
                <div className="flex items-start gap-2">
                  <ExternalLink className="h-4 w-4 text-blue-600 dark:text-blue-400 mt-0.5 shrink-0" />
                  <div className="text-xs text-blue-700 dark:text-blue-300">
                    <p className="font-medium">Portal URL</p>
                    <p className="mt-0.5 text-blue-600 dark:text-blue-400">{window.location.origin}/portal</p>
                    <p className="mt-1 text-blue-500 dark:text-blue-500">Client can log in using their email to view campaigns, proofs & invoices.</p>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2 text-muted-foreground">
        {icon}
        <span className="text-xs">{label}</span>
      </div>
      <div className="text-sm font-medium">{value}</div>
    </div>
  );
}

import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Loader2, Plus, TestTube, Trash2, Mail, Server } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { SettingsContentWrapper, SectionHeader } from "@/components/settings/zoho-style";

const SMTP_PRESETS: Record<string, { host: string; port: number; secure: boolean }> = {
  gmail: { host: "smtp.gmail.com", port: 587, secure: false },
  zoho: { host: "smtp.zoho.com", port: 465, secure: true },
  outlook: { host: "smtp-mail.outlook.com", port: 587, secure: false },
  godaddy: { host: "smtpout.secureserver.net", port: 465, secure: true },
  custom: { host: "", port: 587, secure: true },
};

interface ProviderConfig {
  id: string;
  provider_type: string;
  provider_name: string;
  is_active: boolean;
  is_default: boolean;
  from_name: string | null;
  from_email: string | null;
  reply_to_email: string | null;
  smtp_host: string | null;
  smtp_port: number | null;
  smtp_secure: boolean | null;
  smtp_username: string | null;
  daily_limit: number | null;
}

export default function EmailProviderSettings() {
  const { toast } = useToast();
  const [providers, setProviders] = useState<ProviderConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState<string | null>(null);

  // Form state
  const [formType, setFormType] = useState<"resend" | "smtp">("smtp");
  const [formPreset, setFormPreset] = useState("gmail");
  const [formName, setFormName] = useState("");
  const [fromName, setFromName] = useState("");
  const [fromEmail, setFromEmail] = useState("");
  const [replyTo, setReplyTo] = useState("");
  const [smtpHost, setSmtpHost] = useState("");
  const [smtpPort, setSmtpPort] = useState(587);
  const [smtpSecure, setSmtpSecure] = useState(false);
  const [smtpUsername, setSmtpUsername] = useState("");
  const [smtpPassword, setSmtpPassword] = useState("");
  const [resendKey, setResendKey] = useState("");
  const [dailyLimit, setDailyLimit] = useState(500);

  useEffect(() => { fetchProviders(); }, []);

  const fetchProviders = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("email_provider_configs")
      .select("id, provider_type, provider_name, is_active, is_default, from_name, from_email, reply_to_email, smtp_host, smtp_port, smtp_secure, smtp_username, daily_limit")
      .order("created_at", { ascending: false });
    if (!error && data) setProviders(data);
    setLoading(false);
  };

  const applyPreset = (preset: string) => {
    setFormPreset(preset);
    if (preset !== "custom") {
      const p = SMTP_PRESETS[preset];
      setSmtpHost(p.host);
      setSmtpPort(p.port);
      setSmtpSecure(p.secure);
      setFormName(preset.charAt(0).toUpperCase() + preset.slice(1) + " SMTP");
    }
  };

  const handleSave = async () => {
    setSaving(true);
    const insertData: Record<string, any> = {
      provider_name: formName || formPreset,
      from_name: fromName || null,
      from_email: fromEmail || null,
      reply_to_email: replyTo || null,
      daily_limit: dailyLimit,
      is_active: false,
      is_default: false,
    });
    setSaving(false);
    if (error) {
      toast({ variant: "destructive", title: "Error", description: error.message });
    } else {
      toast({ title: "Provider added" });
      setShowAdd(false);
      fetchProviders();
    }
  };

  const toggleActive = async (id: string, active: boolean) => {
    await supabase.from("email_provider_configs").update({ is_active: active }).eq("id", id);
    fetchProviders();
  };

  const setDefault = async (id: string) => {
    // Unset all defaults first
    await supabase.from("email_provider_configs").update({ is_default: false }).neq("id", "none");
    await supabase.from("email_provider_configs").update({ is_default: true, is_active: true }).eq("id", id);
    fetchProviders();
    toast({ title: "Default provider set" });
  };

  const deleteProvider = async (id: string) => {
    await supabase.from("email_provider_configs").delete().eq("id", id);
    fetchProviders();
    toast({ title: "Provider removed" });
  };

  const testProvider = async (id: string) => {
    setTesting(id);
    try {
      const { error } = await supabase.functions.invoke("test-email-provider", {
        body: { provider_config_id: id },
      });
      if (error) throw error;
      toast({ title: "Test email sent successfully" });
    } catch (e: any) {
      toast({ variant: "destructive", title: "Test failed", description: e.message });
    }
    setTesting(null);
  };

  return (
    <SettingsContentWrapper>
      <SectionHeader title="Email Providers" description="Configure email delivery providers. The system falls back to platform Resend if tenant SMTP fails." />

      <div className="flex justify-end mb-4">
        <Dialog open={showAdd} onOpenChange={setShowAdd}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-2" />Add Provider</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>Add Email Provider</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Provider Type</Label>
                <Select value={formType} onValueChange={(v) => setFormType(v as any)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="smtp">SMTP</SelectItem>
                    <SelectItem value="resend">Resend</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {formType === "smtp" && (
                <div>
                  <Label>SMTP Preset</Label>
                  <Select value={formPreset} onValueChange={applyPreset}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="gmail">Gmail</SelectItem>
                      <SelectItem value="zoho">Zoho Mail</SelectItem>
                      <SelectItem value="outlook">Outlook / Office 365</SelectItem>
                      <SelectItem value="godaddy">GoDaddy</SelectItem>
                      <SelectItem value="custom">Custom SMTP</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div><Label>From Name</Label><Input value={fromName} onChange={e => setFromName(e.target.value)} placeholder="Go-Ads 360" /></div>
                <div><Label>From Email</Label><Input value={fromEmail} onChange={e => setFromEmail(e.target.value)} placeholder="noreply@go-ads.in" /></div>
              </div>
              <div><Label>Reply-To Email</Label><Input value={replyTo} onChange={e => setReplyTo(e.target.value)} placeholder="support@company.com" /></div>

              {formType === "smtp" && (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div><Label>SMTP Host</Label><Input value={smtpHost} onChange={e => setSmtpHost(e.target.value)} /></div>
                    <div><Label>Port</Label><Input type="number" value={smtpPort} onChange={e => setSmtpPort(Number(e.target.value))} /></div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch checked={smtpSecure} onCheckedChange={setSmtpSecure} />
                    <Label>Use SSL/TLS</Label>
                  </div>
                  <div><Label>Username</Label><Input value={smtpUsername} onChange={e => setSmtpUsername(e.target.value)} /></div>
                  <div><Label>Password</Label><Input type="password" value={smtpPassword} onChange={e => setSmtpPassword(e.target.value)} placeholder="••••••••" /></div>
                </>
              )}

              {formType === "resend" && (
                <div><Label>Resend API Key</Label><Input type="password" value={resendKey} onChange={e => setResendKey(e.target.value)} placeholder="re_••••••••" /></div>
              )}

              <div><Label>Daily Send Limit</Label><Input type="number" value={dailyLimit} onChange={e => setDailyLimit(Number(e.target.value))} /></div>

              <Button onClick={handleSave} disabled={saving} className="w-full">
                {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}Save Provider
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
      ) : providers.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">
          <Server className="h-12 w-12 mx-auto mb-3 opacity-40" />
          <p>No email providers configured. Using platform default (Resend).</p>
        </CardContent></Card>
      ) : (
        <div className="grid gap-4">
          {providers.map(p => (
            <Card key={p.id}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {p.provider_type === "smtp" ? <Server className="h-5 w-5 text-muted-foreground" /> : <Mail className="h-5 w-5 text-muted-foreground" />}
                    <div>
                      <CardTitle className="text-base">{p.provider_name}</CardTitle>
                      <CardDescription>{p.provider_type.toUpperCase()} · {p.from_email || "No sender set"}{p.smtp_host ? ` · ${p.smtp_host}:${p.smtp_port}` : ""}</CardDescription>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {p.is_default && <Badge variant="default">Default</Badge>}
                    {p.is_active ? <Badge variant="secondary" className="bg-emerald-100 text-emerald-700">Active</Badge> : <Badge variant="outline">Inactive</Badge>}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2 flex-wrap">
                  <Switch checked={p.is_active} onCheckedChange={(v) => toggleActive(p.id, v)} />
                  <span className="text-sm text-muted-foreground mr-3">{p.is_active ? "Active" : "Inactive"}</span>
                  {!p.is_default && <Button variant="outline" size="sm" onClick={() => setDefault(p.id)}>Set Default</Button>}
                  <Button variant="outline" size="sm" onClick={() => testProvider(p.id)} disabled={testing === p.id}>
                    {testing === p.id ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <TestTube className="h-3 w-3 mr-1" />}Test
                  </Button>
                  <Button variant="ghost" size="sm" className="text-destructive" onClick={() => deleteProvider(p.id)}>
                    <Trash2 className="h-3 w-3 mr-1" />Remove
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </SettingsContentWrapper>
  );
}

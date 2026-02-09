import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
import { Bell, Mail, Send, RotateCcw, Save, Loader2, MessageSquare } from "lucide-react";

// ===== Types =====
type DigestSettings = {
  id: string;
  enabled: boolean;
  sender_name: string | null;
  recipients_to: string[];
  recipients_cc: string[];
  daily_time: string;
  timezone: string;
  windows_days: number[];
  daily_digest_enabled: boolean;
  per_campaign_enabled: boolean;
  per_invoice_enabled: boolean;
  campaign_end_window_days: number;
  invoice_buckets: string[];
  whatsapp_enabled: boolean;
  whatsapp_recipients: string[];
};

type TemplateRow = {
  id: string;
  template_key: string;
  name: string;
  enabled: boolean;
  subject_template: string;
  body_template: string;
  updated_at: string;
};

const DEFAULTS = {
  enabled: true,
  sender_name: "GO-ADS Alerts",
  recipients_to: ["info@matrix-networksolutions.com"],
  recipients_cc: [] as string[],
  daily_time: "09:00",
  timezone: "Asia/Kolkata",
  windows_days: [3, 7, 15],
  daily_digest_enabled: true,
  per_campaign_enabled: true,
  per_invoice_enabled: true,
  campaign_end_window_days: 7,
  invoice_buckets: ["DUE_TODAY", "OVERDUE"],
  whatsapp_enabled: false,
  whatsapp_recipients: [] as string[],
};

const WINDOW_CHOICES = [3, 7, 15, 30] as const;
const INVOICE_BUCKET_CHOICES = ["DUE_TODAY", "DUE_NEXT_7_DAYS", "OVERDUE"] as const;

const DEFAULT_TEMPLATES = [
  {
    template_key: "daily_digest",
    name: "Daily Digest",
    enabled: true,
    subject_template: "GO-ADS | Daily Digest – {{date}}",
    body_template: `<h1>GO-ADS | Daily Availability + Dues Digest</h1>\n<p>Date: {{date}}</p>\n{{digest_html}}\n<p><em>Automated alert from GO-ADS.</em></p>`,
  },
  {
    template_key: "campaign_ending",
    name: "Campaign Ending Soon",
    enabled: true,
    subject_template: "GO-ADS | Campaign Ending Soon – {{campaign_id}} (End: {{end_date}})",
    body_template: `<h2>Campaign Ending Soon</h2>\n<p>Campaign: {{campaign_name}} ({{campaign_id}})</p>\n<p>Client: {{client_name}}</p>\n<p>Start: {{start_date}} | End: {{end_date}}</p>\n<p>Total Assets: {{total_assets}}</p>\n{{assets_table_html}}\n<p><em>Automated alert from GO-ADS.</em></p>`,
  },
  {
    template_key: "invoice_alert",
    name: "Invoice Due / Overdue",
    enabled: true,
    subject_template: "GO-ADS | Invoice {{bucket_label}} – {{invoice_id}} | Outstanding: {{outstanding}}",
    body_template: `<h2>Invoice {{bucket_label}}</h2>\n<p>Invoice: {{invoice_id}}</p>\n<p>Client: {{client_name}} | Campaign: {{campaign_id}}</p>\n<p>Due: {{due_date}} | Total: {{total_amount}} | Paid: {{paid_amount}} | Outstanding: {{outstanding}}</p>\n{{assets_table_html}}\n<p><em>Automated alert from GO-ADS.</em></p>`,
  },
];

// ===== Email Chips Editor =====
function EmailChipsEditor({ label, value, onChange, placeholder }: {
  label: string;
  value: string[];
  onChange: (next: string[]) => void;
  placeholder?: string;
}) {
  const [input, setInput] = useState("");
  const isValid = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);

  const add = () => {
    const email = input.trim().toLowerCase();
    if (!email) return;
    if (!isValid(email)) { toast.error("Invalid email format"); return; }
    if (value.includes(email)) { toast.error("Email already added"); return; }
    onChange([...value, email]);
    setInput("");
  };

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="flex gap-2">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={placeholder}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); add(); } }}
        />
        <Button type="button" variant="outline" size="sm" onClick={add}>Add</Button>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {value.map((email) => (
          <Badge key={email} variant="secondary" className="gap-1 pr-1">
            {email}
            <button onClick={() => onChange(value.filter((e) => e !== email))} className="ml-1 hover:text-destructive text-xs">✕</button>
          </Badge>
        ))}
      </div>
    </div>
  );
}

// ===== WhatsApp Chips Editor =====
function PhoneChipsEditor({ label, value, onChange, placeholder }: {
  label: string;
  value: string[];
  onChange: (next: string[]) => void;
  placeholder?: string;
}) {
  const [input, setInput] = useState("");
  const isValid = (p: string) => /^\d{10,15}$/.test(p);

  const add = () => {
    const phone = input.trim().replace(/\D/g, "");
    if (!phone) return;
    if (!isValid(phone)) { toast.error("Invalid phone (10-15 digits, no +)"); return; }
    if (value.includes(phone)) { toast.error("Number already added"); return; }
    onChange([...value, phone]);
    setInput("");
  };

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="flex gap-2">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={placeholder}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); add(); } }}
        />
        <Button type="button" variant="outline" size="sm" onClick={add}>Add</Button>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {value.map((phone) => (
          <Badge key={phone} variant="secondary" className="gap-1 pr-1">
            {phone}
            <button onClick={() => onChange(value.filter((p) => p !== phone))} className="ml-1 hover:text-destructive text-xs">✕</button>
          </Badge>
        ))}
      </div>
    </div>
  );
}

// ===== Main Page =====
export default function AlertsSettings() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [settings, setSettings] = useState<DigestSettings | null>(null);
  const [templates, setTemplates] = useState<TemplateRow[]>([]);
  const [activeTemplateKey, setActiveTemplateKey] = useState("daily_digest");

  const activeTemplate = templates.find((t) => t.template_key === activeTemplateKey);

  const loadSettings = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("daily_digest_settings")
        .select("*")
        .limit(1)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setSettings({
          ...data,
          sender_name: (data as any).sender_name ?? DEFAULTS.sender_name,
          daily_digest_enabled: (data as any).daily_digest_enabled ?? true,
          per_campaign_enabled: (data as any).per_campaign_enabled ?? true,
          per_invoice_enabled: (data as any).per_invoice_enabled ?? true,
          campaign_end_window_days: (data as any).campaign_end_window_days ?? 7,
          invoice_buckets: (data as any).invoice_buckets ?? DEFAULTS.invoice_buckets,
        });
      }
    } catch (e: any) {
      toast.error(e.message ?? "Failed to load settings");
    }
  }, []);

  const loadTemplates = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("alert_email_templates")
        .select("*")
        .order("created_at");

      if (error) throw error;

      const existing = data ?? [];
      const existingKeys = new Set(existing.map((t: any) => t.template_key));
      const missing = DEFAULT_TEMPLATES.filter((t) => !existingKeys.has(t.template_key));

      if (missing.length > 0) {
        await supabase.from("alert_email_templates").insert(missing as any);
        const { data: reloaded } = await supabase.from("alert_email_templates").select("*").order("created_at");
        setTemplates((reloaded ?? []) as TemplateRow[]);
      } else {
        setTemplates(existing as TemplateRow[]);
      }
    } catch (e: any) {
      toast.error(e.message ?? "Failed to load templates");
    }
  }, []);

  useEffect(() => {
    Promise.all([loadSettings(), loadTemplates()]).finally(() => setLoading(false));
  }, [loadSettings, loadTemplates]);

  const handleSave = async () => {
    if (!settings) return;
    setSaving(true);
    try {
      const { id, ...rest } = settings;
      const { error } = await supabase
        .from("daily_digest_settings")
        .update(rest as any)
        .eq("id", id);
      if (error) throw error;
      toast.success("Alert settings saved");
    } catch (e: any) {
      toast.error(e.message ?? "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    if (!settings) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from("daily_digest_settings")
        .update(DEFAULTS as any)
        .eq("id", settings.id);
      if (error) throw error;
      setSettings({ ...settings, ...DEFAULTS });
      toast.success("Reset to defaults");
    } catch (e: any) {
      toast.error(e.message ?? "Reset failed");
    } finally {
      setSaving(false);
    }
  };

  const handleTestEmail = async () => {
    setTesting(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const jwt = sessionData?.session?.access_token;
      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-daily-alerts?mode=test`;

      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(jwt ? { Authorization: `Bearer ${jwt}` } : {}),
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        },
      });

      const text = await res.text();
      if (!res.ok) throw new Error(text || "Test email failed");
      toast.success("Test email sent successfully!");
    } catch (e: any) {
      toast.error(e.message ?? "Test email failed");
    } finally {
      setTesting(false);
    }
  };

  const updateTemplate = (patch: Partial<TemplateRow>) => {
    if (!activeTemplate) return;
    setTemplates((prev) =>
      prev.map((t) => (t.id === activeTemplate.id ? { ...t, ...patch } : t))
    );
  };

  const saveTemplate = async () => {
    if (!activeTemplate) return;
    try {
      const { error } = await supabase
        .from("alert_email_templates")
        .update({
          name: activeTemplate.name,
          enabled: activeTemplate.enabled,
          subject_template: activeTemplate.subject_template,
          body_template: activeTemplate.body_template,
        } as any)
        .eq("id", activeTemplate.id);
      if (error) throw error;
      toast.success("Template saved");
      await loadTemplates();
    } catch (e: any) {
      toast.error(e.message ?? "Failed to save template");
    }
  };

  const resetTemplate = async () => {
    const def = DEFAULT_TEMPLATES.find((t) => t.template_key === activeTemplateKey);
    if (!def || !activeTemplate) return;
    try {
      const { error } = await supabase
        .from("alert_email_templates")
        .update({
          name: def.name,
          enabled: def.enabled,
          subject_template: def.subject_template,
          body_template: def.body_template,
        } as any)
        .eq("id", activeTemplate.id);
      if (error) throw error;
      toast.success("Template reset to default");
      await loadTemplates();
    } catch (e: any) {
      toast.error(e.message ?? "Reset failed");
    }
  };

  const patch = (key: string, value: any) => {
    setSettings((s) => s ? { ...s, [key]: value } : s);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!settings) {
    return <div className="p-8 text-muted-foreground">No alert settings found. Please check your database configuration.</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Bell className="h-6 w-6 text-primary" />
            Email & WhatsApp Alerts
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Configure daily digest, campaign ending, and invoice alert notifications.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleTestEmail} disabled={testing}>
            {testing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
            Send Test Email
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
            Save
          </Button>
        </div>
      </div>

      <Tabs defaultValue="settings">
        <TabsList>
          <TabsTrigger value="settings">Settings</TabsTrigger>
          <TabsTrigger value="templates">Email Templates</TabsTrigger>
        </TabsList>

        {/* ===== SETTINGS TAB ===== */}
        <TabsContent value="settings" className="space-y-6">
          {/* Master & Delivery */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Delivery Configuration</CardTitle>
              <CardDescription>Control who receives alerts and when.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Master toggle */}
              <div className="flex items-center justify-between rounded-lg border p-4">
                <div>
                  <p className="font-medium">Enable Alerts</p>
                  <p className="text-sm text-muted-foreground">Master switch for all outgoing emails & WhatsApp.</p>
                </div>
                <Switch checked={settings.enabled} onCheckedChange={(v) => patch("enabled", v)} />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Sender Display Name</Label>
                  <Input
                    value={settings.sender_name ?? ""}
                    onChange={(e) => patch("sender_name", e.target.value)}
                    placeholder="GO-ADS Alerts"
                  />
                  <p className="text-xs text-muted-foreground">Display name only. Sender email is configured in secrets.</p>
                </div>
                <div className="space-y-2">
                  <Label>Timezone</Label>
                  <Input value={settings.timezone} onChange={(e) => patch("timezone", e.target.value)} placeholder="Asia/Kolkata" />
                </div>
                <div className="space-y-2">
                  <Label>Daily Time</Label>
                  <Input type="time" value={settings.daily_time?.slice(0, 5) ?? "09:00"} onChange={(e) => patch("daily_time", e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Campaign Ending Window (days)</Label>
                  <Input
                    type="number"
                    min={1}
                    value={settings.campaign_end_window_days}
                    onChange={(e) => patch("campaign_end_window_days", Number(e.target.value) || 7)}
                  />
                </div>
              </div>

              <Separator />

              {/* Email Recipients */}
              <EmailChipsEditor
                label="📧 Recipients (TO)"
                value={settings.recipients_to}
                onChange={(v) => patch("recipients_to", v)}
                placeholder="info@matrix-networksolutions.com"
              />
              <EmailChipsEditor
                label="📧 Recipients (CC)"
                value={settings.recipients_cc}
                onChange={(v) => patch("recipients_cc", v)}
                placeholder="Optional CC emails"
              />

              <Separator />

              {/* WhatsApp Recipients */}
              <div className="flex items-center justify-between rounded-lg border p-4">
                <div className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5 text-green-600" />
                  <div>
                    <p className="font-medium">WhatsApp Alerts</p>
                    <p className="text-sm text-muted-foreground">Send daily digest via WhatsApp.</p>
                  </div>
                </div>
                <Switch checked={settings.whatsapp_enabled} onCheckedChange={(v) => patch("whatsapp_enabled", v)} />
              </div>
              {settings.whatsapp_enabled && (
                <PhoneChipsEditor
                  label="📱 WhatsApp Recipients"
                  value={settings.whatsapp_recipients}
                  onChange={(v) => patch("whatsapp_recipients", v)}
                  placeholder="919666444888"
                />
              )}
            </CardContent>
          </Card>

          {/* Alert Toggles */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Alert Types</CardTitle>
              <CardDescription>Enable/disable individual alert categories.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between rounded-lg border p-4">
                <div>
                  <p className="font-medium">Daily Digest</p>
                  <p className="text-sm text-muted-foreground">Vacant assets + ending campaigns + dues summary.</p>
                </div>
                <Switch checked={settings.daily_digest_enabled} onCheckedChange={(v) => patch("daily_digest_enabled", v)} />
              </div>
              <div className="flex items-center justify-between rounded-lg border p-4">
                <div>
                  <p className="font-medium">Per-Campaign Ending Alerts</p>
                  <p className="text-sm text-muted-foreground">Individual email per campaign ending soon.</p>
                </div>
                <Switch checked={settings.per_campaign_enabled} onCheckedChange={(v) => patch("per_campaign_enabled", v)} />
              </div>
              <div className="flex items-center justify-between rounded-lg border p-4">
                <div>
                  <p className="font-medium">Per-Invoice Due/Overdue Alerts</p>
                  <p className="text-sm text-muted-foreground">Individual email per invoice due today or overdue.</p>
                </div>
                <Switch checked={settings.per_invoice_enabled} onCheckedChange={(v) => patch("per_invoice_enabled", v)} />
              </div>
            </CardContent>
          </Card>

          {/* Windows & Buckets */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Alert Windows</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-3">
                <Label>Asset Ending Windows (days)</Label>
                <div className="flex flex-wrap gap-3">
                  {WINDOW_CHOICES.map((d) => (
                    <label key={d} className="flex items-center gap-2 cursor-pointer">
                      <Checkbox
                        checked={settings.windows_days.includes(d)}
                        onCheckedChange={(v) => {
                          const set = new Set(settings.windows_days);
                          if (v) set.add(d); else set.delete(d);
                          patch("windows_days", Array.from(set).sort((a, b) => a - b));
                        }}
                      />
                      <span className="text-sm">{d} days</span>
                    </label>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">Used for "Assets ending in next X days" sections in digest.</p>
              </div>

              <Separator />

              <div className="space-y-3">
                <Label>Invoice Buckets for Alerts</Label>
                <div className="flex flex-wrap gap-3">
                  {INVOICE_BUCKET_CHOICES.map((b) => (
                    <label key={b} className="flex items-center gap-2 cursor-pointer">
                      <Checkbox
                        checked={settings.invoice_buckets.includes(b)}
                        onCheckedChange={(v) => {
                          const set = new Set(settings.invoice_buckets);
                          if (v) set.add(b); else set.delete(b);
                          patch("invoice_buckets", Array.from(set));
                        }}
                      />
                      <span className="text-sm">{b}</span>
                    </label>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={handleReset} disabled={saving}>
              <RotateCcw className="h-4 w-4 mr-2" /> Reset to defaults
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
              Save changes
            </Button>
          </div>
        </TabsContent>

        {/* ===== TEMPLATES TAB ===== */}
        <TabsContent value="templates" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Email Templates</CardTitle>
              <CardDescription>Customize subject lines and body HTML for each alert type.</CardDescription>
            </CardHeader>
            <CardContent>
              {/* Template Selector */}
              <div className="flex gap-2 mb-6">
                {(["daily_digest", "campaign_ending", "invoice_alert"] as const).map((k) => {
                  const t = templates.find((x) => x.template_key === k);
                  return (
                    <Button
                      key={k}
                      variant={activeTemplateKey === k ? "default" : "outline"}
                      onClick={() => setActiveTemplateKey(k)}
                      className="gap-2"
                      size="sm"
                    >
                      {t?.name ?? k}
                      <Badge variant={t?.enabled ? "default" : "secondary"} className="text-xs">
                        {t?.enabled ? "ON" : "OFF"}
                      </Badge>
                    </Button>
                  );
                })}
              </div>

              {!activeTemplate ? (
                <p className="text-muted-foreground">Template not found. Try reloading.</p>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Template Editor */}
                  <div className="lg:col-span-2 space-y-4">
                    <div className="flex items-center justify-between rounded-lg border p-4">
                      <div>
                        <p className="font-medium">Template Enabled</p>
                        <p className="text-sm text-muted-foreground">Turns this template on/off.</p>
                      </div>
                      <Switch checked={activeTemplate.enabled} onCheckedChange={(v) => updateTemplate({ enabled: v })} />
                    </div>

                    <div className="space-y-2">
                      <Label>Template Name</Label>
                      <Input value={activeTemplate.name} onChange={(e) => updateTemplate({ name: e.target.value })} />
                    </div>

                    <div className="space-y-2">
                      <Label>Subject Template</Label>
                      <Input value={activeTemplate.subject_template} onChange={(e) => updateTemplate({ subject_template: e.target.value })} />
                      <p className="text-xs text-muted-foreground">
                        Use placeholders like {"{{date}}"}, {"{{campaign_id}}"}, {"{{invoice_id}}"}.
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label>Body Template (HTML)</Label>
                      <Textarea
                        value={activeTemplate.body_template}
                        onChange={(e) => updateTemplate({ body_template: e.target.value })}
                        rows={14}
                        className="font-mono text-xs"
                      />
                      <p className="text-xs text-muted-foreground">
                        The Edge Function injects tables like <code className="bg-muted px-1 rounded">{"{{assets_table_html}}"}</code> or <code className="bg-muted px-1 rounded">{"{{digest_html}}"}</code>.
                      </p>
                    </div>

                    <div className="flex justify-end gap-2">
                      <Button variant="outline" onClick={resetTemplate}>
                        <RotateCcw className="h-4 w-4 mr-2" /> Reset to default
                      </Button>
                      <Button onClick={saveTemplate}>
                        <Save className="h-4 w-4 mr-2" /> Save template
                      </Button>
                    </div>
                  </div>

                  {/* Placeholder Guide */}
                  <div className="space-y-3">
                    <Label>Placeholder Guide</Label>
                    <Card>
                      <CardContent className="p-4 text-sm space-y-2">
                        {activeTemplateKey === "daily_digest" ? (
                          <>
                            <div><code className="bg-muted px-1 rounded text-xs">{"{{date}}"}</code> → 2026-02-09</div>
                            <div><code className="bg-muted px-1 rounded text-xs">{"{{digest_html}}"}</code> → full digest sections HTML</div>
                          </>
                        ) : activeTemplateKey === "campaign_ending" ? (
                          <>
                            <div><code className="bg-muted px-1 rounded text-xs">{"{{campaign_id}}"}</code>, <code className="bg-muted px-1 rounded text-xs">{"{{campaign_name}}"}</code></div>
                            <div><code className="bg-muted px-1 rounded text-xs">{"{{client_name}}"}</code></div>
                            <div><code className="bg-muted px-1 rounded text-xs">{"{{start_date}}"}</code>, <code className="bg-muted px-1 rounded text-xs">{"{{end_date}}"}</code></div>
                            <div><code className="bg-muted px-1 rounded text-xs">{"{{total_assets}}"}</code></div>
                            <div><code className="bg-muted px-1 rounded text-xs">{"{{assets_table_html}}"}</code> → asset list table</div>
                          </>
                        ) : (
                          <>
                            <div><code className="bg-muted px-1 rounded text-xs">{"{{invoice_id}}"}</code>, <code className="bg-muted px-1 rounded text-xs">{"{{client_name}}"}</code></div>
                            <div><code className="bg-muted px-1 rounded text-xs">{"{{campaign_id}}"}</code></div>
                            <div><code className="bg-muted px-1 rounded text-xs">{"{{invoice_date}}"}</code>, <code className="bg-muted px-1 rounded text-xs">{"{{due_date}}"}</code></div>
                            <div><code className="bg-muted px-1 rounded text-xs">{"{{total_amount}}"}</code>, <code className="bg-muted px-1 rounded text-xs">{"{{paid_amount}}"}</code></div>
                            <div><code className="bg-muted px-1 rounded text-xs">{"{{outstanding}}"}</code>, <code className="bg-muted px-1 rounded text-xs">{"{{bucket_label}}"}</code></div>
                            <div><code className="bg-muted px-1 rounded text-xs">{"{{assets_table_html}}"}</code></div>
                          </>
                        )}
                      </CardContent>
                    </Card>
                    <p className="text-xs text-muted-foreground">
                      Templates are stored in DB. Only admins can edit (RLS).
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

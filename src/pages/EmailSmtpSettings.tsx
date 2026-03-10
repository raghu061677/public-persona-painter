import { useState, useEffect } from "react";
import { useCompany } from "@/contexts/CompanyContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { SettingsCard, SectionHeader, InfoAlert, InputRow, SettingsContentWrapper } from "@/components/settings/zoho-style";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Save, Loader2, Send, CheckCircle2, XCircle, Server } from "lucide-react";
import { useSettingsReadOnly } from "@/components/rbac/SettingsPageWrapper";

const SMTP_PRESETS: Record<string, { host: string; port: number; secure: boolean }> = {
  gmail: { host: "smtp.gmail.com", port: 587, secure: true },
  zoho: { host: "smtp.zoho.com", port: 587, secure: true },
  outlook: { host: "smtp.office365.com", port: 587, secure: true },
  godaddy: { host: "smtp.secureserver.net", port: 465, secure: true },
  custom: { host: "", port: 587, secure: true },
};

export default function EmailSmtpSettings() {
  const { company } = useCompany();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [selectedPreset, setSelectedPreset] = useState("custom");
  const [existingId, setExistingId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    smtp_host: "",
    smtp_port: 587,
    smtp_user: "",
    smtp_password: "",
    smtp_secure: true,
    from_email: "",
    from_name: "",
    reply_to_email: "",
    is_active: true,
  });

  useEffect(() => {
    if (!company) return;
    setLoading(true);
    supabase
      .from("email_providers" as any)
      .select("*")
      .eq("company_id", company.id)
      .eq("provider_type", "smtp")
      .maybeSingle()
      .then(({ data, error }) => {
        if (data) {
          const d = data as any;
          setExistingId(d.id);
          setFormData({
            smtp_host: d.smtp_host || "",
            smtp_port: d.smtp_port || 587,
            smtp_user: d.smtp_user || "",
            smtp_password: d.smtp_password || "",
            smtp_secure: d.smtp_secure !== false,
            from_email: d.from_email || "",
            from_name: d.from_name || "",
            reply_to_email: d.reply_to_email || "",
            is_active: d.is_active !== false,
          });
          // Detect preset
          const preset = Object.entries(SMTP_PRESETS).find(
            ([, v]) => v.host === d.smtp_host
          );
          if (preset) setSelectedPreset(preset[0]);
        }
        setLoading(false);
      });
  }, [company]);

  const applyPreset = (preset: string) => {
    setSelectedPreset(preset);
    const config = SMTP_PRESETS[preset];
    if (config) {
      setFormData(prev => ({
        ...prev,
        smtp_host: config.host,
        smtp_port: config.port,
        smtp_secure: config.secure,
      }));
    }
  };

  const handleSave = async () => {
    if (!company) return;
    setSaving(true);
    try {
      const payload = {
        company_id: company.id,
        provider_type: "smtp",
        smtp_host: formData.smtp_host,
        smtp_port: formData.smtp_port,
        smtp_user: formData.smtp_user,
        smtp_password: formData.smtp_password,
        smtp_secure: formData.smtp_secure,
        from_email: formData.from_email,
        from_name: formData.from_name || company.name,
        reply_to_email: formData.reply_to_email,
        is_active: formData.is_active,
        is_default: true,
        updated_at: new Date().toISOString(),
      };

      if (existingId) {
        const { error } = await supabase
          .from("email_providers" as any)
          .update(payload as any)
          .eq("id", existingId);
        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from("email_providers" as any)
          .insert(payload as any)
          .select()
          .single();
        if (error) throw error;
        if (data) setExistingId((data as any).id);
      }

      toast({ title: "SMTP Settings Saved", description: "Your email provider configuration has been updated." });
    } catch (err: any) {
      toast({ title: "Save Failed", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleTestEmail = async () => {
    if (!company) return;
    setTesting(true);
    setTestResult(null);
    try {
      const { data, error } = await supabase.functions.invoke("send-tenant-email", {
        body: {
          to: formData.smtp_user || formData.from_email,
          subject: "Go-Ads 360° - SMTP Test Email",
          html: `<div style="font-family:sans-serif;padding:20px;"><h2>✅ SMTP Configuration Test</h2><p>This email confirms that your SMTP settings are working correctly.</p><p><strong>Company:</strong> ${company.name}</p><p><strong>Sent at:</strong> ${new Date().toLocaleString()}</p></div>`,
          test: true,
        },
      });
      if (error) throw error;
      setTestResult({ success: true, message: "Test email sent successfully! Check your inbox." });
    } catch (err: any) {
      setTestResult({ success: false, message: err.message || "Failed to send test email" });
    } finally {
      setTesting(false);
    }
  };

  if (loading) {
    return (
      <SettingsContentWrapper>
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </SettingsContentWrapper>
    );
  }

  return (
    <SettingsContentWrapper>
      <div>
        <h1 className="text-2xl font-semibold mb-1">SMTP Configuration</h1>
        <p className="text-sm text-muted-foreground">
          Configure your company's email delivery settings. If no SMTP is configured, emails will be sent via the platform default (Resend).
        </p>
      </div>

      <InfoAlert>
        <strong>How it works:</strong> When you configure SMTP, all outbound emails for your company (notifications, invoices, alerts) will be sent through your SMTP server. If SMTP is disabled or not configured, the platform's default email provider (Resend) will be used as a fallback.
      </InfoAlert>

      <SettingsCard>
        <SectionHeader title="SMTP Provider" description="Select a preset or configure a custom SMTP server" />

        <InputRow label="Provider Preset" description="Select a provider to auto-fill settings">
          <Select value={selectedPreset} onValueChange={applyPreset}>
            <SelectTrigger className="w-64">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="gmail">Gmail (smtp.gmail.com)</SelectItem>
              <SelectItem value="zoho">Zoho Mail (smtp.zoho.com)</SelectItem>
              <SelectItem value="outlook">Outlook / Office 365</SelectItem>
              <SelectItem value="godaddy">GoDaddy (secureserver.net)</SelectItem>
              <SelectItem value="custom">Custom SMTP Server</SelectItem>
            </SelectContent>
          </Select>
        </InputRow>

        <InputRow label="SMTP Host" description="Your email server address">
          <Input
            placeholder="smtp.example.com"
            value={formData.smtp_host}
            onChange={e => setFormData({ ...formData, smtp_host: e.target.value })}
          />
        </InputRow>

        <InputRow label="SMTP Port" description="Usually 587 (TLS) or 465 (SSL)">
          <Input
            type="number"
            value={formData.smtp_port}
            onChange={e => setFormData({ ...formData, smtp_port: parseInt(e.target.value) || 587 })}
            className="w-32"
          />
        </InputRow>

        <InputRow label="Username" description="SMTP authentication username">
          <Input
            value={formData.smtp_user}
            onChange={e => setFormData({ ...formData, smtp_user: e.target.value })}
            placeholder="user@domain.com"
          />
        </InputRow>

        <InputRow label="Password" description="SMTP authentication password or app password">
          <Input
            type="password"
            value={formData.smtp_password}
            onChange={e => setFormData({ ...formData, smtp_password: e.target.value })}
            placeholder="••••••••"
          />
        </InputRow>

        <InputRow label="Use TLS/SSL" description="Enable secure connection">
          <Switch
            checked={formData.smtp_secure}
            onCheckedChange={checked => setFormData({ ...formData, smtp_secure: checked })}
          />
        </InputRow>
      </SettingsCard>

      <SettingsCard>
        <SectionHeader title="Sender Identity" description="Configure the sender information for outgoing emails" />

        <InputRow label="From Email" description="Sender email address">
          <Input
            type="email"
            placeholder="notifications@yourcompany.com"
            value={formData.from_email}
            onChange={e => setFormData({ ...formData, from_email: e.target.value })}
          />
        </InputRow>

        <InputRow label="From Name" description="Sender display name">
          <Input
            placeholder={company?.name || "Go-Ads 360°"}
            value={formData.from_name}
            onChange={e => setFormData({ ...formData, from_name: e.target.value })}
          />
        </InputRow>

        <InputRow label="Reply-To Email" description="Where recipients can reply to">
          <Input
            type="email"
            placeholder="support@yourcompany.com"
            value={formData.reply_to_email}
            onChange={e => setFormData({ ...formData, reply_to_email: e.target.value })}
          />
        </InputRow>

        <InputRow label="Enable SMTP" description="Use this SMTP configuration for sending emails">
          <div className="flex items-center gap-3">
            <Switch
              checked={formData.is_active}
              onCheckedChange={checked => setFormData({ ...formData, is_active: checked })}
            />
            <Badge variant={formData.is_active ? "default" : "secondary"}>
              {formData.is_active ? "Active" : "Disabled (using Resend)"}
            </Badge>
          </div>
        </InputRow>
      </SettingsCard>

      <SettingsCard>
        <SectionHeader title="Test Email" description="Send a test email to verify your SMTP configuration" />

        <div className="flex items-center gap-4">
          <Button onClick={handleTestEmail} disabled={testing || !formData.smtp_host || !formData.from_email} variant="outline">
            {testing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
            {testing ? "Sending..." : "Send Test Email"}
          </Button>

          {testResult && (
            <div className={`flex items-center gap-2 text-sm ${testResult.success ? "text-emerald-600" : "text-destructive"}`}>
              {testResult.success ? <CheckCircle2 className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
              {testResult.message}
            </div>
          )}
        </div>
      </SettingsCard>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving}>
          {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          <Save className="mr-2 h-4 w-4" />
          {saving ? "Saving..." : "Save SMTP Settings"}
        </Button>
      </div>
    </SettingsContentWrapper>
  );
}

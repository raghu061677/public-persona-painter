import { useState, useEffect } from "react";
import { useCompany } from "@/contexts/CompanyContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { SettingsCard, SectionHeader, InfoAlert, InputRow, SettingsContentWrapper } from "@/components/settings/zoho-style";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Mail, Save, Eye, Loader2 } from "lucide-react";

const EMAIL_TEMPLATES = [
  { id: "client_invoice", name: "Client Invoice", description: "Sent when invoice is generated" },
  { id: "campaign_start", name: "Campaign Start", description: "Sent when campaign begins" },
  { id: "proof_uploaded", name: "Proof Uploaded", description: "Sent when operations team uploads proof" },
  { id: "payment_reminder", name: "Payment Reminder", description: "Sent for overdue invoices" },
  { id: "plan_approved", name: "Plan Approved", description: "Sent when plan is approved" },
];

export default function CompanyEmailNotifications() {
  const { company } = useCompany();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    smtp_host: "",
    smtp_port: 587,
    smtp_username: "",
    smtp_password: "",
    from_email: "",
    from_name: "",
    reply_to_email: "",
    use_tls: true,
    enabled_templates: EMAIL_TEMPLATES.map(t => t.id),
  });

  useEffect(() => {
    const loadSettings = async () => {
      if (!company) return;

      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('notification_settings' as any)
          .select('*')
          .eq('company_id', company.id)
          .maybeSingle();

        if (error) throw error;

        if (data) {
          setFormData({
            smtp_host: (data as any).smtp_host || "",
            smtp_port: (data as any).smtp_port || 587,
            smtp_username: (data as any).smtp_username || "",
            smtp_password: (data as any).smtp_password || "",
            from_email: (data as any).from_email || "",
            from_name: (data as any).from_name || "",
            reply_to_email: (data as any).reply_to_email || "",
            use_tls: (data as any).use_tls !== false,
            enabled_templates: (data as any).enabled_templates || EMAIL_TEMPLATES.map(t => t.id),
          });
        }
      } catch (error: any) {
        console.error("Error loading notification settings:", error);
        toast({
          title: "Failed to load settings",
          description: error.message,
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    loadSettings();
  }, [company, toast]);

  const handleSave = async () => {
    if (!company) return;

    setLoading(true);
    try {
      const { data: existing } = await supabase
        .from('notification_settings' as any)
        .select('id')
        .eq('company_id', company.id)
        .maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from('notification_settings' as any)
          .update({
            smtp_host: formData.smtp_host,
            smtp_port: formData.smtp_port,
            smtp_username: formData.smtp_username,
            smtp_password: formData.smtp_password,
            from_email: formData.from_email,
            from_name: formData.from_name,
            reply_to_email: formData.reply_to_email,
            use_tls: formData.use_tls,
            enabled_templates: formData.enabled_templates,
            updated_at: new Date().toISOString(),
          } as any)
          .eq('company_id', company.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('notification_settings' as any)
          .insert({
            company_id: company.id,
            smtp_host: formData.smtp_host,
            smtp_port: formData.smtp_port,
            smtp_username: formData.smtp_username,
            smtp_password: formData.smtp_password,
            from_email: formData.from_email,
            from_name: formData.from_name,
            reply_to_email: formData.reply_to_email,
            use_tls: formData.use_tls,
            enabled_templates: formData.enabled_templates,
          } as any);

        if (error) throw error;
      }

      toast({
        title: "Settings Saved",
        description: "Email notification settings have been updated.",
      });
    } catch (error: any) {
      console.error("Error saving notification settings:", error);
      toast({
        title: "Failed to save settings",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const toggleTemplate = (templateId: string) => {
    setFormData(prev => ({
      ...prev,
      enabled_templates: prev.enabled_templates.includes(templateId)
        ? prev.enabled_templates.filter(id => id !== templateId)
        : [...prev.enabled_templates, templateId]
    }));
  };

  if (loading && !formData.smtp_host) {
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
        <h1 className="text-2xl font-semibold mb-1">Email Notifications</h1>
        <p className="text-sm text-muted-foreground">
          Configure automated email notifications and templates
        </p>
      </div>

      <InfoAlert>
        <strong>Email Configuration:</strong> Customize email templates and notification triggers for various events in the system.
      </InfoAlert>

      <SettingsCard>
        <SectionHeader
          title="SMTP Configuration"
          description="Configure your email server settings"
        />

        <InputRow label="SMTP Host" description="Your email server address">
          <Input 
            placeholder="smtp.gmail.com" 
            value={formData.smtp_host}
            onChange={(e) => setFormData({ ...formData, smtp_host: e.target.value })}
          />
        </InputRow>

        <InputRow label="SMTP Port" description="Usually 587 for TLS">
          <Input 
            type="number" 
            value={formData.smtp_port}
            onChange={(e) => setFormData({ ...formData, smtp_port: parseInt(e.target.value) || 587 })}
            className="w-32" 
          />
        </InputRow>

        <InputRow label="SMTP Username" description="Username for authentication">
          <Input 
            value={formData.smtp_username}
            onChange={(e) => setFormData({ ...formData, smtp_username: e.target.value })}
            placeholder="username@domain.com" 
          />
        </InputRow>

        <InputRow label="SMTP Password" description="Password for authentication">
          <Input 
            type="password" 
            value={formData.smtp_password}
            onChange={(e) => setFormData({ ...formData, smtp_password: e.target.value })}
            placeholder="••••••••" 
          />
        </InputRow>

        <InputRow label="From Email" description="Email address for sending notifications">
          <Input 
            type="email" 
            placeholder="notifications@company.com" 
            value={formData.from_email}
            onChange={(e) => setFormData({ ...formData, from_email: e.target.value })}
          />
        </InputRow>

        <InputRow label="From Name" description="Sender name displayed to recipients">
          <Input 
            placeholder="Go-Ads Notifications" 
            value={formData.from_name}
            onChange={(e) => setFormData({ ...formData, from_name: e.target.value })}
          />
        </InputRow>

        <InputRow label="Use TLS/SSL" description="Enable secure email transmission">
          <Switch 
            checked={formData.use_tls}
            onCheckedChange={(checked) => setFormData({ ...formData, use_tls: checked })}
          />
        </InputRow>
      </SettingsCard>

      <SettingsCard>
        <SectionHeader
          title="Email Templates"
          description="Customize notification templates"
        />

        <div className="space-y-3">
          {EMAIL_TEMPLATES.map((template) => (
            <div
              key={template.id}
              className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
            >
              <div className="flex-1">
                <h3 className="font-medium mb-1">{template.name}</h3>
                <p className="text-sm text-muted-foreground">{template.description}</p>
              </div>
              <div className="flex items-center gap-2">
                <Switch 
                  checked={formData.enabled_templates.includes(template.id)}
                  onCheckedChange={() => toggleTemplate(template.id)}
                />
                <Button variant="ghost" size="sm">
                  <Eye className="h-4 w-4 mr-2" />
                  Edit
                </Button>
              </div>
            </div>
          ))}
        </div>
      </SettingsCard>

      <SettingsCard>
        <SectionHeader
          title="Reply-To Settings"
          description="Configure reply-to addresses"
        />

        <InputRow label="Reply-To Email" description="Where recipients can reply">
          <Input 
            type="email" 
            placeholder="support@company.com" 
            value={formData.reply_to_email}
            onChange={(e) => setFormData({ ...formData, reply_to_email: e.target.value })}
          />
        </InputRow>
      </SettingsCard>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={loading}>
          {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          <Save className="mr-2 h-4 w-4" />
          {loading ? "Saving..." : "Save Changes"}
        </Button>
      </div>
    </SettingsContentWrapper>
  );
}

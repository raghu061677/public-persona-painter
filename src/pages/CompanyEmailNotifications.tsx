import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { SettingsCard, SectionHeader, InfoAlert, InputRow } from "@/components/settings/zoho-style";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Mail, Save, Eye } from "lucide-react";

const EMAIL_TEMPLATES = [
  { id: "client_invoice", name: "Client Invoice", description: "Sent when invoice is generated" },
  { id: "campaign_start", name: "Campaign Start", description: "Sent when campaign begins" },
  { id: "proof_uploaded", name: "Proof Uploaded", description: "Sent when operations team uploads proof" },
  { id: "payment_reminder", name: "Payment Reminder", description: "Sent for overdue invoices" },
  { id: "plan_approved", name: "Plan Approved", description: "Sent when plan is approved" },
];

export default function CompanyEmailNotifications() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const handleSave = () => {
    setLoading(true);
    toast({
      title: "Settings Saved",
      description: "Email notification settings have been updated.",
    });
    setLoading(false);
  };

  return (
    <div className="space-y-6">
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
          <Input placeholder="smtp.gmail.com" />
        </InputRow>

        <InputRow label="SMTP Port" description="Usually 587 for TLS">
          <Input type="number" defaultValue="587" className="w-32" />
        </InputRow>

        <InputRow label="From Email" description="Email address for sending notifications">
          <Input type="email" placeholder="notifications@company.com" />
        </InputRow>

        <InputRow label="From Name" description="Sender name displayed to recipients">
          <Input placeholder="Go-Ads Notifications" />
        </InputRow>

        <InputRow label="Use TLS/SSL" description="Enable secure email transmission">
          <Switch defaultChecked />
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
                <Switch defaultChecked />
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
          <Input type="email" placeholder="support@company.com" />
        </InputRow>

        <InputRow label="CC Email" description="Send copies to this email">
          <Input type="email" placeholder="admin@company.com" />
        </InputRow>
      </SettingsCard>

      <SettingsCard>
        <SectionHeader
          title="Notification Preferences"
          description="Control when emails are sent"
        />

        <InputRow label="Send Welcome Email" description="When new users are added">
          <Switch defaultChecked />
        </InputRow>

        <InputRow label="Daily Summary" description="Send daily activity summary to admins">
          <Switch />
        </InputRow>

        <InputRow label="Weekly Reports" description="Send weekly performance reports">
          <Switch />
        </InputRow>
      </SettingsCard>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={loading}>
          <Save className="h-4 w-4 mr-2" />
          {loading ? "Saving..." : "Save Changes"}
        </Button>
      </div>
    </div>
  );
}

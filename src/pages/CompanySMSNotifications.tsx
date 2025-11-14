import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { SettingsCard, SectionHeader, InfoAlert, InputRow } from "@/components/settings/zoho-style";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { MessageSquare, Save } from "lucide-react";

const SMS_TEMPLATES = [
  { id: "otp", name: "OTP Verification", description: "For login verification" },
  { id: "payment_success", name: "Payment Success", description: "Payment confirmation" },
  { id: "campaign_alert", name: "Campaign Alert", description: "Critical campaign updates" },
  { id: "due_reminder", name: "Due Reminder", description: "Invoice due date reminders" },
];

export default function CompanySMSNotifications() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [enabled, setEnabled] = useState(false);

  const handleSave = () => {
    setLoading(true);
    toast({
      title: "Settings Saved",
      description: "SMS notification settings have been updated.",
    });
    setLoading(false);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold mb-1">SMS Notifications</h1>
        <p className="text-sm text-muted-foreground">
          Configure SMS notifications and templates
        </p>
      </div>

      <InfoAlert>
        <strong>SMS Gateway Required:</strong> Connect your SMS gateway provider to enable SMS notifications. Supported providers: Twilio, MSG91, TextLocal.
      </InfoAlert>

      <SettingsCard>
        <SectionHeader
          title="SMS Gateway Configuration"
          description="Connect your SMS service provider"
        />

        <InputRow label="Enable SMS Notifications" description="Send automated SMS to users and clients">
          <Switch checked={enabled} onCheckedChange={setEnabled} />
        </InputRow>

        {enabled && (
          <>
            <InputRow label="SMS Provider" description="Select your SMS gateway">
              <select className="w-full h-9 rounded-md border border-input bg-background px-3">
                <option value="twilio">Twilio</option>
                <option value="msg91">MSG91</option>
                <option value="textlocal">TextLocal</option>
                <option value="custom">Custom API</option>
              </select>
            </InputRow>

            <InputRow label="API Key" description="Your SMS provider API key">
              <Input type="password" placeholder="Enter API key" />
            </InputRow>

            <InputRow label="Sender ID" description="6-character alphanumeric sender ID">
              <Input placeholder="GOADS" maxLength={6} className="w-32" />
            </InputRow>

            <InputRow label="API Endpoint" description="Custom API endpoint (if applicable)">
              <Input placeholder="https://api.provider.com/send" />
            </InputRow>
          </>
        )}
      </SettingsCard>

      {enabled && (
        <>
          <SettingsCard>
            <SectionHeader
              title="SMS Templates"
              description="Manage SMS message templates"
            />

            <div className="space-y-3">
              {SMS_TEMPLATES.map((template) => (
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
                      Edit
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </SettingsCard>

          <SettingsCard>
            <SectionHeader
              title="SMS Preferences"
              description="Control when SMS notifications are sent"
            />

            <InputRow label="Character Limit" description="Maximum characters per SMS">
              <Input type="number" defaultValue="160" readOnly className="w-32" />
            </InputRow>

            <InputRow label="Send Time Restriction" description="Only send SMS between 9 AM - 9 PM">
              <Switch defaultChecked />
            </InputRow>

            <InputRow label="International SMS" description="Allow sending SMS to international numbers">
              <Switch />
            </InputRow>

            <InputRow label="Balance Alert" description="Notify when SMS credit is low">
              <Switch defaultChecked />
            </InputRow>
          </SettingsCard>
        </>
      )}

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={loading}>
          <Save className="h-4 w-4 mr-2" />
          {loading ? "Saving..." : "Save Changes"}
        </Button>
      </div>
    </div>
  );
}

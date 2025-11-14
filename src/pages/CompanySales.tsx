import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { SettingsCard, SectionHeader, InputRow } from "@/components/settings/zoho-style";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Save } from "lucide-react";

export default function CompanySales() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const handleSave = () => {
    setLoading(true);
    toast({
      title: "Settings Saved",
      description: "Sales settings have been updated successfully.",
    });
    setLoading(false);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold mb-1">Sales Settings</h1>
        <p className="text-sm text-muted-foreground">
          Configure sales process preferences and automation
        </p>
      </div>

      <SettingsCard>
        <SectionHeader
          title="Plan & Campaign Defaults"
          description="Set default values for plans and campaigns"
        />

        <InputRow label="Default Campaign Duration (Months)" description="Applied when creating new campaigns">
          <Input type="number" defaultValue="3" className="w-32" />
        </InputRow>

        <InputRow label="Default Discount (%)" description="Standard discount for clients">
          <Input type="number" defaultValue="0" step="0.1" className="w-32" />
        </InputRow>

        <InputRow label="Plan Validity (Days)" description="How long a plan quote is valid">
          <Input type="number" defaultValue="30" className="w-32" />
        </InputRow>

        <InputRow label="Require Client Approval" description="Plans must be approved before converting to campaign">
          <Switch defaultChecked />
        </InputRow>
      </SettingsCard>

      <SettingsCard>
        <SectionHeader
          title="Pricing Rules"
          description="Configure pricing and discount rules"
        />

        <InputRow label="Allow Below Base Rate" description="Let sales staff price below base rate">
          <Switch />
        </InputRow>

        <InputRow label="Show Card Rate to Clients" description="Display official card rate on plans">
          <Switch defaultChecked />
        </InputRow>

        <InputRow label="Maximum Discount Allowed (%)" description="Maximum discount sales can offer">
          <Input type="number" defaultValue="20" step="1" className="w-32" />
        </InputRow>

        <InputRow label="Auto-Calculate Printing/Mounting" description="Automatically add printing and mounting charges">
          <Switch defaultChecked />
        </InputRow>
      </SettingsCard>

      <SettingsCard>
        <SectionHeader
          title="Client Management"
          description="Configure client-related settings"
        />

        <InputRow label="Auto-Create Client Portal" description="Automatically create portal access for new clients">
          <Switch defaultChecked />
        </InputRow>

        <InputRow label="Require GST for All Clients" description="Make GST number mandatory">
          <Switch />
        </InputRow>

        <InputRow label="Client Code Format" description="Format for auto-generated client codes">
          <Input defaultValue="CLT-{YEAR}-{SEQ}" />
        </InputRow>
      </SettingsCard>

      <SettingsCard>
        <SectionHeader
          title="Notifications & Reminders"
          description="Configure sales team notifications"
        />

        <InputRow label="Plan Expiry Reminders" description="Notify sales when plan quotes are about to expire">
          <Switch defaultChecked />
        </InputRow>

        <InputRow label="Campaign Milestone Alerts" description="Alert sales on campaign start/end dates">
          <Switch defaultChecked />
        </InputRow>

        <InputRow label="Payment Follow-up Reminders" description="Remind sales to follow up on pending payments">
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

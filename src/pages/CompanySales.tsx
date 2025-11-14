import { useState, useEffect } from "react";
import { useCompany } from "@/contexts/CompanyContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { SettingsCard, SectionHeader, InputRow, SettingsContentWrapper } from "@/components/settings/zoho-style";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Save } from "lucide-react";

export default function CompanySales() {
  const { company } = useCompany();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    default_campaign_duration: 3,
    default_discount: 0,
    plan_validity_days: 30,
    require_client_approval: true,
    allow_below_base_rate: false,
    show_card_rate: true,
    max_discount: 20,
    auto_calculate_charges: true,
    auto_create_portal: true,
    require_gst: false,
    client_code_format: "CLT-{YEAR}-{SEQ}",
    plan_expiry_reminders: true,
    campaign_milestone_alerts: true,
    payment_followup_reminders: false,
  });

  useEffect(() => {
    const loadSettings = async () => {
      if (!company) return;

      try {
        const { data, error } = await supabase
          .from('organization_settings' as any)
          .select('*')
          .eq('company_id', company.id)
          .maybeSingle();

        if (error) throw error;

        if (data) {
          const settings = (data as any).sales_settings || {};
          setFormData({ ...formData, ...settings });
        }
      } catch (error: any) {
        console.error("Error loading sales settings:", error);
      }
    };

    loadSettings();
  }, [company]);

  const handleSave = async () => {
    if (!company) return;

    setLoading(true);
    try {
      const { data: existing } = await supabase
        .from('organization_settings' as any)
        .select('id')
        .eq('company_id', company.id)
        .maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from('organization_settings' as any)
          .update({
            sales_settings: formData,
            updated_at: new Date().toISOString(),
          } as any)
          .eq('company_id', company.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('organization_settings' as any)
          .insert({
            company_id: company.id,
            sales_settings: formData,
          } as any);

        if (error) throw error;
      }

      toast({
        title: "Settings Saved",
        description: "Sales settings have been updated successfully.",
      });
    } catch (error: any) {
      console.error("Error saving sales settings:", error);
      toast({
        title: "Failed to save settings",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <SettingsContentWrapper>
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
          <Input 
            type="number" 
            value={formData.default_campaign_duration} 
            onChange={(e) => setFormData({ ...formData, default_campaign_duration: parseInt(e.target.value) })}
            className="w-32" 
          />
        </InputRow>

        <InputRow label="Default Discount (%)" description="Standard discount for clients">
          <Input 
            type="number" 
            value={formData.default_discount} 
            onChange={(e) => setFormData({ ...formData, default_discount: parseFloat(e.target.value) })}
            step="0.1" 
            className="w-32" 
          />
        </InputRow>

        <InputRow label="Plan Validity (Days)" description="How long a plan quote is valid">
          <Input 
            type="number" 
            value={formData.plan_validity_days} 
            onChange={(e) => setFormData({ ...formData, plan_validity_days: parseInt(e.target.value) })}
            className="w-32" 
          />
        </InputRow>

        <InputRow label="Require Client Approval" description="Plans must be approved before converting to campaign">
          <Switch 
            checked={formData.require_client_approval}
            onCheckedChange={(checked) => setFormData({ ...formData, require_client_approval: checked })}
          />
        </InputRow>
      </SettingsCard>

      <SettingsCard>
        <SectionHeader
          title="Pricing Rules"
          description="Configure pricing and discount rules"
        />

        <InputRow label="Allow Below Base Rate" description="Let sales staff price below base rate">
          <Switch 
            checked={formData.allow_below_base_rate}
            onCheckedChange={(checked) => setFormData({ ...formData, allow_below_base_rate: checked })}
          />
        </InputRow>

        <InputRow label="Show Card Rate to Clients" description="Display official card rate on plans">
          <Switch 
            checked={formData.show_card_rate}
            onCheckedChange={(checked) => setFormData({ ...formData, show_card_rate: checked })}
          />
        </InputRow>

        <InputRow label="Maximum Discount Allowed (%)" description="Maximum discount sales can offer">
          <Input 
            type="number" 
            value={formData.max_discount} 
            onChange={(e) => setFormData({ ...formData, max_discount: parseInt(e.target.value) })}
            step="1" 
            className="w-32" 
          />
        </InputRow>

        <InputRow label="Auto-Calculate Printing/Mounting" description="Automatically add printing and mounting charges">
          <Switch 
            checked={formData.auto_calculate_charges}
            onCheckedChange={(checked) => setFormData({ ...formData, auto_calculate_charges: checked })}
          />
        </InputRow>
      </SettingsCard>

      <SettingsCard>
        <SectionHeader
          title="Client Management"
          description="Configure client-related settings"
        />

        <InputRow label="Auto-Create Client Portal" description="Automatically create portal access for new clients">
          <Switch 
            checked={formData.auto_create_portal}
            onCheckedChange={(checked) => setFormData({ ...formData, auto_create_portal: checked })}
          />
        </InputRow>

        <InputRow label="Require GST for All Clients" description="Make GST number mandatory">
          <Switch 
            checked={formData.require_gst}
            onCheckedChange={(checked) => setFormData({ ...formData, require_gst: checked })}
          />
        </InputRow>

        <InputRow label="Client Code Format" description="Format for auto-generated client codes">
          <Input 
            value={formData.client_code_format}
            onChange={(e) => setFormData({ ...formData, client_code_format: e.target.value })}
          />
        </InputRow>
      </SettingsCard>

      <SettingsCard>
        <SectionHeader
          title="Notifications & Reminders"
          description="Configure sales team notifications"
        />

        <InputRow label="Plan Expiry Reminders" description="Notify sales when plan quotes are about to expire">
          <Switch 
            checked={formData.plan_expiry_reminders}
            onCheckedChange={(checked) => setFormData({ ...formData, plan_expiry_reminders: checked })}
          />
        </InputRow>

        <InputRow label="Campaign Milestone Alerts" description="Alert sales on campaign start/end dates">
          <Switch 
            checked={formData.campaign_milestone_alerts}
            onCheckedChange={(checked) => setFormData({ ...formData, campaign_milestone_alerts: checked })}
          />
        </InputRow>

        <InputRow label="Payment Follow-up Reminders" description="Remind sales to follow up on pending payments">
          <Switch 
            checked={formData.payment_followup_reminders}
            onCheckedChange={(checked) => setFormData({ ...formData, payment_followup_reminders: checked })}
          />
        </InputRow>
      </SettingsCard>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={loading}>
          <Save className="h-4 w-4 mr-2" />
          {loading ? "Saving..." : "Save Changes"}
        </Button>
      </div>
    </SettingsContentWrapper>
  );
}

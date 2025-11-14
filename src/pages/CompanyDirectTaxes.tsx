import { useState, useEffect } from "react";
import { useCompany } from "@/contexts/CompanyContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { SettingsCard, SectionHeader, InfoAlert, InputRow, SettingsContentWrapper } from "@/components/settings/zoho-style";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calculator, Save, Loader2 } from "lucide-react";

export default function CompanyDirectTaxes() {
  const { company } = useCompany();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    tds_enabled: false,
    tds_default_rate: 10,
    tds_verify_pan: true,
    tcs_enabled: false,
    tcs_default_rate: 0.1,
    tcs_threshold: 50000,
  });

  useEffect(() => {
    const loadSettings = async () => {
      if (!company) return;

      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('tax_settings' as any)
          .select('*')
          .eq('company_id', company.id)
          .maybeSingle();

        if (error) throw error;

        if (data) {
          setFormData({
            tds_enabled: (data as any).tds_enabled || false,
            tds_default_rate: (data as any).tds_default_rate || 10,
            tds_verify_pan: (data as any).tds_verify_pan !== false,
            tcs_enabled: (data as any).tcs_enabled || false,
            tcs_default_rate: (data as any).tcs_default_rate || 0.1,
            tcs_threshold: (data as any).tcs_threshold || 50000,
          });
        }
      } catch (error: any) {
        console.error("Error loading direct tax settings:", error);
      } finally {
        setLoading(false);
      }
    };

    loadSettings();
  }, [company]);

  const handleSave = async () => {
    if (!company) return;

    setLoading(true);
    try {
      const { data: existing } = await supabase
        .from('tax_settings' as any)
        .select('id')
        .eq('company_id', company.id)
        .maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from('tax_settings' as any)
          .update({
            tds_enabled: formData.tds_enabled,
            tds_default_rate: formData.tds_default_rate,
            tds_verify_pan: formData.tds_verify_pan,
            tcs_enabled: formData.tcs_enabled,
            tcs_default_rate: formData.tcs_default_rate,
            tcs_threshold: formData.tcs_threshold,
            updated_at: new Date().toISOString(),
          } as any)
          .eq('company_id', company.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('tax_settings' as any)
          .insert({
            company_id: company.id,
            tds_enabled: formData.tds_enabled,
            tds_default_rate: formData.tds_default_rate,
            tds_verify_pan: formData.tds_verify_pan,
            tcs_enabled: formData.tcs_enabled,
            tcs_default_rate: formData.tcs_default_rate,
            tcs_threshold: formData.tcs_threshold,
          } as any);

        if (error) throw error;
      }

      toast({
        title: "Settings Saved",
        description: "Direct tax settings have been updated successfully.",
      });
    } catch (error: any) {
      console.error("Error saving direct tax settings:", error);
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
      <SectionHeader
        title="Direct Taxes"
        description="Configure TDS (Tax Deducted at Source) and TCS (Tax Collected at Source)"
      />

      <InfoAlert>
        <strong>Direct Tax Compliance:</strong> Ensure your organization is compliant with Indian income tax regulations by configuring TDS and TCS correctly.
      </InfoAlert>

      <SettingsCard>
        <SectionHeader
          title="TDS Configuration"
          description="Tax Deducted at Source settings for vendor payments"
        />

        <InputRow
          label="Enable TDS Deduction"
          description="Automatically calculate and deduct TDS on applicable transactions"
        >
          <Switch 
            checked={formData.tds_enabled} 
            onCheckedChange={(checked) => setFormData({ ...formData, tds_enabled: checked })} 
          />
        </InputRow>

        {formData.tds_enabled && (
          <>
            <InputRow label="Default TDS Rate (%)" description="Applied when no specific rate is configured">
              <Input type="number" placeholder="10" step="0.01" className="w-32" />
            </InputRow>

            <InputRow label="PAN Verification" description="Verify vendor PAN before processing payments">
              <Switch defaultChecked />
            </InputRow>

            <InputRow label="TDS Certificate Generation" description="Automatically generate Form 16A certificates">
              <Switch />
            </InputRow>
          </>
        )}
      </SettingsCard>

      <SettingsCard>
        <SectionHeader
          title="TCS Configuration"
          description="Tax Collected at Source settings for client invoices"
        />

        <InputRow
          label="Enable TCS Collection"
          description="Automatically calculate and collect TCS on applicable invoices"
        >
          <Switch 
            checked={formData.tcs_enabled} 
            onCheckedChange={(checked) => setFormData({ ...formData, tcs_enabled: checked })} 
          />
        </InputRow>

        {formData.tcs_enabled && (
          <>
            <InputRow label="Default TCS Rate (%)" description="Applied to invoices exceeding threshold">
              <Input type="number" placeholder="0.1" step="0.01" className="w-32" />
            </InputRow>

            <InputRow label="TCS Threshold Amount" description="Minimum invoice value for TCS application">
              <Input type="number" placeholder="5000000" className="w-40" />
            </InputRow>
          </>
        )}
      </SettingsCard>

      <SettingsCard>
        <SectionHeader
          title="Section Codes"
          description="Configure commonly used TDS section codes"
        />

        <div className="space-y-3">
          {[
            { code: "194C", description: "Payments to contractors", rate: "1%" },
            { code: "194J", description: "Professional or technical services", rate: "10%" },
            { code: "194I", description: "Rent payments", rate: "10%" },
          ].map((section) => (
            <div key={section.code} className="flex items-center justify-between p-3 border rounded-lg">
              <div>
                <p className="font-medium">Section {section.code}</p>
                <p className="text-sm text-muted-foreground">{section.description}</p>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-sm font-medium">{section.rate}</span>
                <Switch defaultChecked />
              </div>
            </div>
          ))}
        </div>
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

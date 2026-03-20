import { useState, useEffect } from "react";
import { useCompany } from "@/contexts/CompanyContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Loader2, Save } from "lucide-react";
import { SettingsCard, SettingsContentWrapper, SectionHeader, InputRow, InfoAlert } from "@/components/settings/zoho-style";
import { useSettingsReadOnly } from "@/components/rbac/SettingsPageWrapper";

export default function CompanyTaxes() {
  const { company, refreshCompany } = useCompany();
  const { toast } = useToast();
  const { isReadOnly } = useSettingsReadOnly();
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    gstin: "",
    pan: "",
    msme_registered: false,
    msme_number: "",
    enable_einvoicing: false,
    enable_eway_bill: false,
    tds_applicable: false,
    tds_percentage: 0,
    tds_enabled: false,
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
          const d = data as any;
          setFormData({
            gstin: d.gstin || "",
            pan: d.pan || "",
            msme_registered: d.msme_registered || false,
            msme_number: d.msme_number || "",
            enable_einvoicing: d.enable_einvoicing || false,
            enable_eway_bill: d.enable_eway_bill || false,
            tds_applicable: d.tds_applicable || false,
            tds_percentage: d.tds_percentage || 0,
            tds_enabled: d.tds_enabled || false,
            tds_verify_pan: d.tds_verify_pan !== false,
            tcs_enabled: d.tcs_enabled || false,
            tcs_default_rate: d.tcs_default_rate || 0.1,
            tcs_threshold: d.tcs_threshold || 50000,
          });
        }
      } catch (error: any) {
        console.error("Error loading tax settings:", error);
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
    if (isReadOnly) { toast({ title: 'View-only access', variant: 'destructive' }); return; }
    if (!company) return;

    setLoading(true);
    try {
      const payload = {
        gstin: formData.gstin,
        pan: formData.pan,
        msme_registered: formData.msme_registered,
        msme_number: formData.msme_number,
        enable_einvoicing: formData.enable_einvoicing,
        enable_eway_bill: formData.enable_eway_bill,
        tds_applicable: formData.tds_applicable,
        tds_percentage: formData.tds_percentage,
        tds_enabled: formData.tds_enabled,
        tds_verify_pan: formData.tds_verify_pan,
        tcs_enabled: formData.tcs_enabled,
        tcs_default_rate: formData.tcs_default_rate,
        tcs_threshold: formData.tcs_threshold,
        updated_at: new Date().toISOString(),
      };

      const { data: existing } = await supabase
        .from('tax_settings' as any)
        .select('id')
        .eq('company_id', company.id)
        .maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from('tax_settings' as any)
          .update(payload as any)
          .eq('company_id', company.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('tax_settings' as any)
          .insert({ company_id: company.id, ...payload } as any);
        if (error) throw error;
      }

      toast({
        title: "Tax settings updated",
        description: "Your tax and compliance settings have been saved successfully",
      });
    } catch (error: any) {
      console.error("Error updating taxes:", error);
      toast({
        title: "Failed to save settings",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading && !formData.gstin && !formData.pan) {
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
      <SectionHeader
        title="Taxes & Compliance"
        description="Manage your tax registration, GST, TDS, TCS and compliance settings"
      />

      {/* GST Information */}
      <SettingsCard
        title="GST Information"
        description="Goods and Services Tax registration details"
      >
        <InfoAlert variant="info">
          Your GSTIN will be used for all invoices and tax calculations. Make sure it's accurate.
        </InfoAlert>

        <InputRow label="GSTIN" description="15-digit GST Identification Number" required>
          <Input
            value={formData.gstin}
            onChange={(e) => setFormData({ ...formData, gstin: e.target.value })}
            placeholder="22AAAAA0000A1Z5"
            maxLength={15}
          />
        </InputRow>

        <InputRow label="PAN" description="10-character Permanent Account Number" required>
          <Input
            value={formData.pan}
            onChange={(e) => setFormData({ ...formData, pan: e.target.value.toUpperCase() })}
            placeholder="AAAAA0000A"
            maxLength={10}
          />
        </InputRow>
      </SettingsCard>

      {/* MSME Registration */}
      <SettingsCard
        title="MSME Registration"
        description="Micro, Small & Medium Enterprises registration details"
      >
        <InputRow label="MSME Registered" description="Are you registered under MSME?">
          <Switch
            checked={formData.msme_registered}
            onCheckedChange={(checked) => setFormData({ ...formData, msme_registered: checked })}
          />
        </InputRow>

        {formData.msme_registered && (
          <InputRow label="MSME Registration Number" description="Your UDYAM registration number">
            <Input
              value={formData.msme_number}
              onChange={(e) => setFormData({ ...formData, msme_number: e.target.value })}
              placeholder="UDYAM-XX-00-0000000"
            />
          </InputRow>
        )}
      </SettingsCard>

      {/* e-Invoicing & e-Way Bill */}
      <SettingsCard
        title="e-Invoicing & e-Way Bill"
        description="Enable electronic invoice and e-way bill generation"
      >
        <InputRow
          label="Enable e-Invoicing"
          description="Generate IRN and QR codes for invoices as per GST rules"
        >
          <Switch
            checked={formData.enable_einvoicing}
            onCheckedChange={(checked) => setFormData({ ...formData, enable_einvoicing: checked })}
          />
        </InputRow>

        <InputRow
          label="Enable e-Way Bill"
          description="Generate e-way bills for goods transportation"
        >
          <Switch
            checked={formData.enable_eway_bill}
            onCheckedChange={(checked) => setFormData({ ...formData, enable_eway_bill: checked })}
          />
        </InputRow>
      </SettingsCard>

      {/* TDS Configuration */}
      <SettingsCard
        title="TDS Configuration"
        description="Tax Deducted at Source settings for vendor payments"
      >
        <InputRow
          label="Enable TDS Deduction"
          description="Automatically calculate and deduct TDS on applicable transactions"
        >
          <Switch
            checked={formData.tds_enabled}
            onCheckedChange={(checked) => setFormData({ ...formData, tds_enabled: checked, tds_applicable: checked })}
          />
        </InputRow>

        {formData.tds_enabled && (
          <>
            <InputRow label="Default TDS Rate (%)" description="Standard TDS rate for transactions">
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  value={formData.tds_percentage}
                  onChange={(e) => setFormData({ ...formData, tds_percentage: parseFloat(e.target.value) || 0 })}
                  className="w-32"
                />
                <span className="text-muted-foreground">%</span>
              </div>
            </InputRow>

            <InputRow label="PAN Verification" description="Verify vendor PAN before processing payments">
              <Switch
                checked={formData.tds_verify_pan}
                onCheckedChange={(checked) => setFormData({ ...formData, tds_verify_pan: checked })}
              />
            </InputRow>
          </>
        )}
      </SettingsCard>

      {/* TCS Configuration */}
      <SettingsCard
        title="TCS Configuration"
        description="Tax Collected at Source settings for client invoices"
      >
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
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  value={formData.tcs_default_rate}
                  onChange={(e) => setFormData({ ...formData, tcs_default_rate: parseFloat(e.target.value) || 0 })}
                  className="w-32"
                />
                <span className="text-muted-foreground">%</span>
              </div>
            </InputRow>

            <InputRow label="TCS Threshold Amount (₹)" description="Minimum invoice value for TCS application">
              <Input
                type="number"
                value={formData.tcs_threshold}
                onChange={(e) => setFormData({ ...formData, tcs_threshold: parseFloat(e.target.value) || 0 })}
                className="w-40"
              />
            </InputRow>
          </>
        )}
      </SettingsCard>

      {/* Section Codes - informational */}
      <SettingsCard
        title="Common TDS Section Codes"
        description="Reference for commonly used TDS section codes"
      >
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
              <span className="text-sm font-medium text-muted-foreground">{section.rate}</span>
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

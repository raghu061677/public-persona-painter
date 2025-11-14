import { useState, useEffect } from "react";
import { useCompany } from "@/contexts/CompanyContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Calculator, Loader2 } from "lucide-react";
import { SettingsCard, SettingsContentWrapper, SectionHeader, InputRow, InfoAlert } from "@/components/settings/zoho-style";

export default function CompanyTaxes() {
  const { company, refreshCompany } = useCompany();
  const { toast } = useToast();
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
            gstin: (data as any).gstin || "",
            pan: (data as any).pan || "",
            msme_registered: (data as any).msme_registered || false,
            msme_number: (data as any).msme_number || "",
            enable_einvoicing: (data as any).enable_einvoicing || false,
            enable_eway_bill: (data as any).enable_eway_bill || false,
            tds_applicable: (data as any).tds_applicable || false,
            tds_percentage: (data as any).tds_percentage || 0,
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
    if (!company) return;

    setLoading(true);
    try {
      // Check if settings exist
      const { data: existing } = await supabase
        .from('tax_settings' as any)
        .select('id')
        .eq('company_id', company.id)
        .maybeSingle();

      if (existing) {
        // Update existing settings
        const { error } = await supabase
          .from('tax_settings' as any)
          .update({
            gstin: formData.gstin,
            pan: formData.pan,
            msme_registered: formData.msme_registered,
            msme_number: formData.msme_number,
            enable_einvoicing: formData.enable_einvoicing,
            enable_eway_bill: formData.enable_eway_bill,
            tds_applicable: formData.tds_applicable,
            tds_percentage: formData.tds_percentage,
            updated_at: new Date().toISOString(),
          } as any)
          .eq('company_id', company.id);

        if (error) throw error;
      } else {
        // Insert new settings
        const { error } = await supabase
          .from('tax_settings' as any)
          .insert({
            company_id: company.id,
            gstin: formData.gstin,
            pan: formData.pan,
            msme_registered: formData.msme_registered,
            msme_number: formData.msme_number,
            enable_einvoicing: formData.enable_einvoicing,
            enable_eway_bill: formData.enable_eway_bill,
            tds_applicable: formData.tds_applicable,
            tds_percentage: formData.tds_percentage,
          } as any);

        if (error) throw error;
      }

      toast({
        title: "Tax settings updated",
        description: "Your tax and compliance settings have been saved successfully",
      });
    } catch (error: any) {
      console.error("Error updating taxes:", error);
      toast({
        title: "Failed to update settings",
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
        description="Manage your tax registration numbers and compliance settings"
      />

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

      <SettingsCard
        title="Direct Taxes (TDS)"
        description="Tax Deducted at Source settings"
      >
        <InputRow 
          label="TDS Applicable" 
          description="Is TDS deduction applicable for your transactions?"
        >
          <Switch
            checked={formData.tds_applicable}
            onCheckedChange={(checked) => setFormData({ ...formData, tds_applicable: checked })}
          />
        </InputRow>

        {formData.tds_applicable && (
          <InputRow label="Default TDS Percentage" description="Standard TDS rate for transactions">
            <div className="flex items-center gap-2">
              <Input
                type="number"
                min="0"
                max="100"
                step="0.1"
                value={formData.tds_percentage}
                onChange={(e) => setFormData({ ...formData, tds_percentage: parseFloat(e.target.value) || 0 })}
                className="max-w-[120px]"
              />
              <span className="text-muted-foreground">%</span>
            </div>
          </InputRow>
        )}
      </SettingsCard>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={loading}>
          {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {loading ? "Saving..." : "Save Changes"}
        </Button>
      </div>
    </SettingsContentWrapper>
  );
}

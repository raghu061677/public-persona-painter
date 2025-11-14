import { useState, useEffect } from "react";
import { useCompany } from "@/contexts/CompanyContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { SettingsCard, SectionHeader, InfoAlert, InputRow, SettingsContentWrapper } from "@/components/settings/zoho-style";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { FileText, Save, CheckCircle2, AlertCircle } from "lucide-react";

export default function CompanyEInvoicing() {
  const { company } = useCompany();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    einvoicing_enabled: false,
    irp_connected: false,
    gsp_username: "",
    gsp_password: "",
    irp_portal: "nIC",
    min_invoice_amount: 0,
    auto_generate_irn: true,
    send_to_client: true,
    cancel_allowed_hours: 24,
  });

  useEffect(() => {
    const loadSettings = async () => {
      if (!company) return;

      try {
        const { data, error } = await supabase
          .from('tax_settings' as any)
          .select('*')
          .eq('company_id', company.id)
          .maybeSingle();

        if (error) throw error;

        if (data) {
          setFormData({
            einvoicing_enabled: (data as any).einvoicing_enabled || false,
            irp_connected: (data as any).irp_connected || false,
            gsp_username: (data as any).gsp_username || "",
            gsp_password: (data as any).gsp_password || "",
            irp_portal: (data as any).irp_portal || "nIC",
            min_invoice_amount: (data as any).min_invoice_amount || 0,
            auto_generate_irn: (data as any).auto_generate_irn !== false,
            send_to_client: (data as any).send_to_client !== false,
            cancel_allowed_hours: (data as any).cancel_allowed_hours || 24,
          });
        }
      } catch (error: any) {
        console.error("Error loading e-invoicing settings:", error);
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
            einvoicing_enabled: formData.einvoicing_enabled,
            irp_connected: formData.irp_connected,
            gsp_username: formData.gsp_username,
            gsp_password: formData.gsp_password,
            irp_portal: formData.irp_portal,
            min_invoice_amount: formData.min_invoice_amount,
            auto_generate_irn: formData.auto_generate_irn,
            send_to_client: formData.send_to_client,
            cancel_allowed_hours: formData.cancel_allowed_hours,
            updated_at: new Date().toISOString(),
          } as any)
          .eq('company_id', company.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('tax_settings' as any)
          .insert({
            company_id: company.id,
            einvoicing_enabled: formData.einvoicing_enabled,
            irp_connected: formData.irp_connected,
            gsp_username: formData.gsp_username,
            gsp_password: formData.gsp_password,
            irp_portal: formData.irp_portal,
            min_invoice_amount: formData.min_invoice_amount,
            auto_generate_irn: formData.auto_generate_irn,
            send_to_client: formData.send_to_client,
            cancel_allowed_hours: formData.cancel_allowed_hours,
          } as any);

        if (error) throw error;
      }

      toast({
        title: "Settings Saved",
        description: "E-invoicing configuration has been updated.",
      });
    } catch (error: any) {
      console.error("Error saving e-invoicing settings:", error);
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
        title="E-Invoicing"
        description="Configure GST e-invoicing integration with IRP portal"
      />

      <InfoAlert>
        <strong>E-Invoicing Mandate:</strong> E-invoicing is mandatory for businesses with turnover above ₹5 crores. Generate IRN and QR codes automatically for compliance.
      </InfoAlert>

      <SettingsCard>
        <SectionHeader
          title="E-Invoice Configuration"
          description="Connect to GST Invoice Registration Portal (IRP)"
        />

        <InputRow
          label="Enable E-Invoicing"
          description="Automatically generate IRN for all applicable invoices"
        >
          <Switch 
            checked={formData.einvoicing_enabled} 
            onCheckedChange={(checked) => setFormData({ ...formData, einvoicing_enabled: checked })} 
          />
        </InputRow>

        {formData.einvoicing_enabled && (
          <>
            <div className="p-4 border rounded-lg bg-muted/50 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">IRP Connection Status</span>
                {formData.irp_connected ? (
                  <Badge className="bg-green-500">
                    <CheckCircle2 className="h-3 w-3 mr-1" />
                    Connected
                  </Badge>
                ) : (
                  <Badge variant="destructive">
                    <AlertCircle className="h-3 w-3 mr-1" />
                    Not Connected
                  </Badge>
                )}
              </div>
              {!formData.irp_connected && (
                <Button variant="outline" size="sm" className="w-full">
                  Connect to IRP Portal
                </Button>
              )}
            </div>

            <InputRow label="GSP Username" description="Your GST Suvidha Provider username">
              <Input 
                value={formData.gsp_username}
                onChange={(e) => setFormData({ ...formData, gsp_username: e.target.value })}
                placeholder="Enter GSP username" 
              />
            </InputRow>

            <InputRow label="GSP Password" description="Your GST Suvidha Provider password">
              <Input 
                type="password"
                value={formData.gsp_password}
                onChange={(e) => setFormData({ ...formData, gsp_password: e.target.value })}
                placeholder="Enter GSP password" 
              />
            </InputRow>

            <InputRow label="IRP Portal" description="Select your Invoice Registration Portal">
              <select 
                className="w-full h-9 rounded-md border border-input bg-background px-3"
                value={formData.irp_portal}
                onChange={(e) => setFormData({ ...formData, irp_portal: e.target.value })}
              >
                <option value="nIC">NIC e-Invoice Portal</option>
                <option value="cleartax">ClearTax IRP</option>
                <option value="iris">IRIS IRP</option>
              </select>
            </InputRow>
          </>
        )}
      </SettingsCard>

      {formData.einvoicing_enabled && (
        <>
          <SettingsCard>
            <SectionHeader
              title="Invoice Thresholds"
              description="Configure when e-invoicing is required"
            />

            <InputRow label="Minimum Invoice Amount" description="Generate e-invoice only for invoices above this amount">
              <Input 
                type="number" 
                value={formData.min_invoice_amount}
                onChange={(e) => setFormData({ ...formData, min_invoice_amount: parseFloat(e.target.value) })}
                placeholder="0" 
                className="w-40" 
              />
            </InputRow>

            <InputRow label="B2C Threshold" description="E-invoice threshold for B2C transactions">
              <Input type="number" placeholder="500000" className="w-40" />
            </InputRow>
          </SettingsCard>

          <SettingsCard>
            <SectionHeader
              title="Additional Settings"
              description="Customize e-invoicing behavior"
            />

            <InputRow label="Auto-generate IRN" description="Automatically generate IRN when invoice is finalized">
              <Switch defaultChecked />
            </InputRow>

            <InputRow label="QR Code on Invoice" description="Include QR code on printed invoices">
              <Switch defaultChecked />
            </InputRow>

            <InputRow label="Email IRN Details" description="Send IRN and QR code to client via email">
              <Switch />
            </InputRow>

            <InputRow label="Cancel on Deletion" description="Automatically cancel IRN when invoice is deleted">
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
    </SettingsContentWrapper>
  );
}

import { useState, useEffect } from "react";
import { useCompany } from "@/contexts/CompanyContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { SettingsCard, SectionHeader, InfoAlert, InputRow, SettingsContentWrapper } from "@/components/settings/zoho-style";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { FileSignature, Save, Upload, Download } from "lucide-react";

export default function CompanyDigitalSignature() {
  const { company } = useCompany();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    signature_enabled: false,
    signature_url: "",
    signatory_name: "",
    signatory_designation: "",
    add_to_invoices: true,
    add_to_quotations: true,
    add_to_workorders: false,
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
          const settings = (data as any).signature_settings || {};
          setFormData({ ...formData, ...settings });
        }
      } catch (error: any) {
        console.error("Error loading signature settings:", error);
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
            signature_settings: formData,
            updated_at: new Date().toISOString(),
          } as any)
          .eq('company_id', company.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('organization_settings' as any)
          .insert({
            company_id: company.id,
            signature_settings: formData,
          } as any);

        if (error) throw error;
      }

      toast({
        title: "Settings Saved",
        description: "Digital signature settings have been updated.",
      });
    } catch (error: any) {
      console.error("Error saving signature settings:", error);
      toast({
        title: "Failed to save settings",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = () => {
    setFormData({ ...formData, signature_url: "uploaded" });
    toast({
      title: "Signature Uploaded",
      description: "Your digital signature has been uploaded successfully.",
    });
  };

  return (
    <SettingsContentWrapper>
      <SectionHeader
        title="Digital Signature"
        description="Add digital signatures to your invoices and documents"
      />

      <InfoAlert>
        <strong>Professional Touch:</strong> Digital signatures add authenticity and professionalism to your business documents.
      </InfoAlert>

      <SettingsCard>
        <SectionHeader
          title="Signature Configuration"
          description="Upload and manage your digital signature"
        />

        <InputRow label="Enable Digital Signature" description="Add signature to generated documents">
          <Switch 
            checked={formData.signature_enabled} 
            onCheckedChange={(checked) => setFormData({ ...formData, signature_enabled: checked })} 
          />
        </InputRow>

        {formData.signature_enabled && (
          <>
            <div className="space-y-4">
              <div className="border rounded-lg p-6 bg-muted/50">
                <div className="flex flex-col items-center justify-center space-y-4">
                  {formData.signature_url ? (
                    <>
                      <div className="w-full h-32 bg-white rounded border-2 border-dashed flex items-center justify-center">
                        <p className="text-sm text-muted-foreground">Signature Preview</p>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm">
                          <Upload className="h-4 w-4 mr-2" />
                          Replace
                        </Button>
                        <Button variant="outline" size="sm">
                          <Download className="h-4 w-4 mr-2" />
                          Download
                        </Button>
                      </div>
                    </>
                  ) : (
                    <>
                      <Upload className="h-12 w-12 text-muted-foreground" />
                      <div className="text-center">
                        <p className="text-sm font-medium mb-1">Upload Signature Image</p>
                        <p className="text-xs text-muted-foreground mb-3">
                          PNG or JPG, transparent background recommended
                        </p>
                        <Button size="sm">
                          Choose File
                        </Button>
                      </div>
                    </>
                  )}
                </div>
              </div>

              <InputRow label="Authorized Signatory Name" description="Name to display under signature">
                <Input 
                  value={formData.signatory_name}
                  onChange={(e) => setFormData({ ...formData, signatory_name: e.target.value })}
                  placeholder="e.g., Managing Director" 
                />
              </InputRow>

              <InputRow label="Designation" description="Title of the authorized person">
                <Input 
                  value={formData.signatory_designation}
                  onChange={(e) => setFormData({ ...formData, signatory_designation: e.target.value })}
                  placeholder="e.g., CEO / Director" 
                />
              </InputRow>
            </div>
          </>
        )}
      </SettingsCard>

      {formData.signature_enabled && (
        <>
          <SettingsCard>
            <SectionHeader
              title="Signature Placement"
              description="Configure where signature appears on documents"
            />

            <InputRow label="Add to Invoices" description="Show signature on all invoices">
              <Switch defaultChecked />
            </InputRow>

            <InputRow label="Add to Estimates" description="Show signature on quotations">
              <Switch defaultChecked />
            </InputRow>

            <InputRow label="Add to Work Orders" description="Show signature on work orders">
              <Switch />
            </InputRow>

            <InputRow label="Add to Agreements" description="Show signature on client agreements">
              <Switch />
            </InputRow>
          </SettingsCard>

          <SettingsCard>
            <SectionHeader
              title="Signature Format"
              description="Customize signature appearance"
            />

            <InputRow label="Position" description="Signature placement on document">
              <select className="w-full h-9 rounded-md border border-input bg-background px-3">
                <option value="bottom-right">Bottom Right</option>
                <option value="bottom-left">Bottom Left</option>
                <option value="bottom-center">Bottom Center</option>
              </select>
            </InputRow>

            <InputRow label="Size" description="Signature size on document">
              <select className="w-full h-9 rounded-md border border-input bg-background px-3">
                <option value="small">Small</option>
                <option value="medium">Medium</option>
                <option value="large">Large</option>
              </select>
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

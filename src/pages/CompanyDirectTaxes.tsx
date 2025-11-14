import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { SettingsCard, SectionHeader, InfoAlert, InputRow } from "@/components/settings/zoho-style";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calculator, Save } from "lucide-react";

export default function CompanyDirectTaxes() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [tdsEnabled, setTdsEnabled] = useState(false);
  const [tcsEnabled, setTcsEnabled] = useState(false);

  const handleSave = () => {
    setLoading(true);
    toast({
      title: "Settings Saved",
      description: "Direct tax settings have been updated successfully.",
    });
    setLoading(false);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold mb-1">Direct Taxes</h1>
        <p className="text-sm text-muted-foreground">
          Configure TDS (Tax Deducted at Source) and TCS (Tax Collected at Source)
        </p>
      </div>

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
          <Switch checked={tdsEnabled} onCheckedChange={setTdsEnabled} />
        </InputRow>

        {tdsEnabled && (
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
          <Switch checked={tcsEnabled} onCheckedChange={setTcsEnabled} />
        </InputRow>

        {tcsEnabled && (
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
    </div>
  );
}

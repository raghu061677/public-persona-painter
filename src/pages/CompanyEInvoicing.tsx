import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { SettingsCard, SectionHeader, InfoAlert, InputRow } from "@/components/settings/zoho-style";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { FileText, Save, CheckCircle2, AlertCircle } from "lucide-react";

export default function CompanyEInvoicing() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const [connected, setConnected] = useState(false);

  const handleSave = () => {
    setLoading(true);
    toast({
      title: "Settings Saved",
      description: "E-invoicing configuration has been updated.",
    });
    setLoading(false);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold mb-1">E-Invoicing</h1>
        <p className="text-sm text-muted-foreground">
          Configure GST e-invoicing integration with IRP portal
        </p>
      </div>

      <InfoAlert variant={enabled ? "info" : "warning"}>
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
          <Switch checked={enabled} onCheckedChange={setEnabled} />
        </InputRow>

        {enabled && (
          <>
            <div className="p-4 border rounded-lg bg-muted/50 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">IRP Connection Status</span>
                {connected ? (
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
              {!connected && (
                <Button variant="outline" size="sm" className="w-full">
                  Connect to IRP Portal
                </Button>
              )}
            </div>

            <InputRow label="GSP Username" description="Your GST Suvidha Provider username">
              <Input placeholder="Enter GSP username" />
            </InputRow>

            <InputRow label="GSP Password" description="Your GST Suvidha Provider password">
              <Input type="password" placeholder="Enter GSP password" />
            </InputRow>

            <InputRow label="IRP Portal" description="Select your Invoice Registration Portal">
              <select className="w-full h-9 rounded-md border border-input bg-background px-3">
                <option value="nIC">NIC e-Invoice Portal</option>
                <option value="cleartax">ClearTax IRP</option>
                <option value="iris">IRIS IRP</option>
              </select>
            </InputRow>
          </>
        )}
      </SettingsCard>

      {enabled && (
        <>
          <SettingsCard>
            <SectionHeader
              title="Invoice Thresholds"
              description="Configure when e-invoicing is required"
            />

            <InputRow label="Minimum Invoice Amount" description="Generate e-invoice only for invoices above this amount">
              <Input type="number" placeholder="0" className="w-40" />
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
    </div>
  );
}

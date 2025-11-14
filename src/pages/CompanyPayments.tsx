import { useState, useEffect } from "react";
import { useCompany } from "@/contexts/CompanyContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { SettingsCard, SectionHeader, InfoAlert, InputRow, SettingsContentWrapper } from "@/components/settings/zoho-style";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { CreditCard, Save, CheckCircle2, XCircle, Loader2 } from "lucide-react";

const PAYMENT_GATEWAYS = [
  { id: "razorpay", name: "Razorpay", status: "not_connected", logo: "💳" },
  { id: "stripe", name: "Stripe", status: "not_connected", logo: "💎" },
  { id: "paytm", name: "Paytm", status: "not_connected", logo: "📱" },
  { id: "phonepe", name: "PhonePe", status: "not_connected", logo: "📲" },
];

export default function CompanyPayments() {
  const { company } = useCompany();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    online_payments_enabled: false,
    payment_gateways: {},
  });

  useEffect(() => {
    const loadSettings = async () => {
      if (!company) return;

      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('organization_settings' as any)
          .select('*')
          .eq('company_id', company.id)
          .maybeSingle();

        if (error) throw error;

        if (data) {
          setFormData({
            online_payments_enabled: (data as any).online_payments_enabled || false,
            payment_gateways: (data as any).payment_gateways || {},
          });
        }
      } catch (error: any) {
        console.error("Error loading payment settings:", error);
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
        .from('organization_settings' as any)
        .select('id')
        .eq('company_id', company.id)
        .maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from('organization_settings' as any)
          .update({
            online_payments_enabled: formData.online_payments_enabled,
            payment_gateways: formData.payment_gateways,
            updated_at: new Date().toISOString(),
          } as any)
          .eq('company_id', company.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('organization_settings' as any)
          .insert({
            company_id: company.id,
            online_payments_enabled: formData.online_payments_enabled,
            payment_gateways: formData.payment_gateways,
          } as any);

        if (error) throw error;
      }

      toast({
        title: "Settings Saved",
        description: "Online payment settings have been updated.",
      });
    } catch (error: any) {
      console.error("Error saving payment settings:", error);
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
        title="Online Payments"
        description="Configure payment gateways for client invoices"
      />

      <InfoAlert>
        <strong>Get Paid Faster:</strong> Enable online payments to receive payments directly through your invoices. Clients can pay using cards, UPI, and net banking.
      </InfoAlert>

      <SettingsCard>
        <SectionHeader
          title="Payment Gateway Configuration"
          description="Connect payment providers to accept online payments"
        />

        <InputRow label="Enable Online Payments" description="Allow clients to pay invoices online">
          <Switch checked={enabled} onCheckedChange={setEnabled} />
        </InputRow>

        {enabled && (
          <div className="space-y-3 mt-4">
            {PAYMENT_GATEWAYS.map((gateway) => (
              <div
                key={gateway.id}
                className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{gateway.logo}</span>
                  <div>
                    <h3 className="font-medium">{gateway.name}</h3>
                    <div className="flex items-center gap-2 mt-1">
                      {gateway.status === "connected" ? (
                        <Badge className="bg-green-500">
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                          Connected
                        </Badge>
                      ) : (
                        <Badge variant="secondary">
                          <XCircle className="h-3 w-3 mr-1" />
                          Not Connected
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
                <Button variant="outline" size="sm">
                  {gateway.status === "connected" ? "Configure" : "Connect"}
                </Button>
              </div>
            ))}
          </div>
        )}
      </SettingsCard>

      {enabled && (
        <>
          <SettingsCard>
            <SectionHeader
              title="Payment Options"
              description="Configure available payment methods"
            />

            <InputRow label="Credit/Debit Cards" description="Accept card payments">
              <Switch defaultChecked />
            </InputRow>

            <InputRow label="UPI" description="Accept UPI payments (GPay, PhonePe, etc.)">
              <Switch defaultChecked />
            </InputRow>

            <InputRow label="Net Banking" description="Accept direct bank transfers">
              <Switch defaultChecked />
            </InputRow>

            <InputRow label="Wallets" description="Accept digital wallet payments">
              <Switch />
            </InputRow>

            <InputRow label="EMI Options" description="Allow customers to pay in installments">
              <Switch />
            </InputRow>
          </SettingsCard>

          <SettingsCard>
            <SectionHeader
              title="Payment Settings"
              description="Configure payment behavior"
            />

            <InputRow label="Auto-capture Payments" description="Automatically capture successful payments">
              <Switch defaultChecked />
            </InputRow>

            <InputRow label="Send Payment Link" description="Include payment link in invoice emails">
              <Switch defaultChecked />
            </InputRow>

            <InputRow label="Payment Confirmation Email" description="Send email when payment is received">
              <Switch defaultChecked />
            </InputRow>

            <InputRow label="Partial Payments" description="Allow clients to pay invoices in parts">
              <Switch />
            </InputRow>
          </SettingsCard>

          <SettingsCard>
            <SectionHeader
              title="Transaction Fees"
              description="Configure how payment gateway charges are handled"
            />

            <InputRow label="Gateway Charges" description="Who bears the transaction fee">
              <select className="w-full h-9 rounded-md border border-input bg-background px-3">
                <option value="company">Company absorbs fee</option>
                <option value="client">Client pays fee</option>
                <option value="split">Split 50-50</option>
              </select>
            </InputRow>

            <InputRow label="Convenience Fee (%)" description="Additional fee to charge clients">
              <Input type="number" placeholder="0" step="0.1" className="w-32" />
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

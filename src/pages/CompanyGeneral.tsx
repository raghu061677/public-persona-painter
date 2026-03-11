import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { SettingsCard, SectionHeader, InfoAlert, InputRow } from "@/components/settings/zoho-style";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Settings, Save, Calendar, Globe } from "lucide-react";
import { useSettingsReadOnly } from "@/components/rbac/SettingsPageWrapper";
import { PaymentTermsInput } from "@/components/shared/PaymentTermsInput";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/contexts/CompanyContext";

export default function CompanyGeneral() {
  const { toast } = useToast();
  const { isReadOnly } = useSettingsReadOnly();
  const { company } = useCompany();
  const [loading, setLoading] = useState(false);
  const [defaultPaymentTerms, setDefaultPaymentTerms] = useState("Net 30 Days");

  useEffect(() => {
    if (company?.id) {
      supabase
        .from('organization_settings')
        .select('default_payment_terms')
        .eq('company_id', company.id)
        .maybeSingle()
        .then(({ data }) => {
          if (data?.default_payment_terms) {
            setDefaultPaymentTerms(data.default_payment_terms);
          }
        });
    }
  }, [company?.id]);

  const handleSave = async () => {
    if (isReadOnly) { toast({ title: 'View-only access', variant: 'destructive' }); return; }
    if (!company?.id) return;
    setLoading(true);
    try {
      // Upsert organization_settings for this company
      const { data: existing } = await supabase
        .from('organization_settings' as any)
        .select('id')
        .eq('company_id', company.id)
        .maybeSingle();

      if (existing) {
        await supabase
          .from('organization_settings' as any)
          .update({ default_payment_terms: defaultPaymentTerms })
          .eq('company_id', company.id);
      } else {
        await supabase
          .from('organization_settings' as any)
          .insert({ company_id: company.id, default_payment_terms: defaultPaymentTerms });
      }

      toast({
        title: "Settings Saved",
        description: "General settings have been updated successfully.",
      });
    } catch (error) {
      toast({ title: "Error", description: "Failed to save settings", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold mb-1">General Settings</h1>
        <p className="text-sm text-muted-foreground">
          Configure basic application preferences and defaults
        </p>
      </div>

      <SettingsCard>
        <SectionHeader
          title="Financial Year"
          description="Set your organization's financial year period"
        />

        <InputRow label="Financial Year Start" description="First month of your financial year">
          <Select defaultValue="april">
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="january">January</SelectItem>
              <SelectItem value="april">April</SelectItem>
              <SelectItem value="july">July</SelectItem>
              <SelectItem value="october">October</SelectItem>
            </SelectContent>
          </Select>
        </InputRow>

        <InputRow label="Current FY" description="Your current financial year">
          <Input value="2024-2025" readOnly className="w-40" />
        </InputRow>
      </SettingsCard>

      <SettingsCard>
        <SectionHeader
          title="Regional Settings"
          description="Configure language, timezone, and date formats"
        />

        <InputRow label="Language" description="Default language for the application">
          <Select defaultValue="en">
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="en">English</SelectItem>
              <SelectItem value="hi">हिन्दी (Hindi)</SelectItem>
              <SelectItem value="te">తెలుగు (Telugu)</SelectItem>
            </SelectContent>
          </Select>
        </InputRow>

        <InputRow label="Timezone" description="Your organization's timezone">
          <Select defaultValue="asia_kolkata">
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="asia_kolkata">Asia/Kolkata (IST)</SelectItem>
              <SelectItem value="utc">UTC</SelectItem>
              <SelectItem value="america_new_york">America/New York</SelectItem>
            </SelectContent>
          </Select>
        </InputRow>

        <InputRow label="Date Format" description="How dates are displayed">
          <Select defaultValue="dd_mm_yyyy">
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="dd_mm_yyyy">DD/MM/YYYY</SelectItem>
              <SelectItem value="mm_dd_yyyy">MM/DD/YYYY</SelectItem>
              <SelectItem value="yyyy_mm_dd">YYYY-MM-DD</SelectItem>
            </SelectContent>
          </Select>
        </InputRow>

        <InputRow label="Time Format" description="12-hour or 24-hour format">
          <Select defaultValue="12">
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="12">12 Hour</SelectItem>
              <SelectItem value="24">24 Hour</SelectItem>
            </SelectContent>
          </Select>
        </InputRow>
      </SettingsCard>

      <SettingsCard>
        <SectionHeader
          title="Application Defaults"
          description="Set default values for various operations"
        />

        <InputRow label="Default Payment Terms" description="Used only when client and plan terms are blank.">
          <div className="w-64">
            <PaymentTermsInput
              value={defaultPaymentTerms}
              onChange={setDefaultPaymentTerms}
              label=""
              disabled={isReadOnly}
            />
          </div>
        </InputRow>

        <InputRow label="Default GST Rate (%)" description="Applied when creating new plans">
          <Input type="number" defaultValue="18" step="0.01" className="w-32" />
        </InputRow>

        <InputRow label="Default Campaign Duration" description="In months">
          <Input type="number" defaultValue="3" className="w-32" />
        </InputRow>

        <InputRow label="Auto-save Drafts" description="Automatically save form changes">
          <Switch defaultChecked />
        </InputRow>

        <InputRow label="Enable Tooltips" description="Show helpful tooltips throughout the app">
          <Switch defaultChecked />
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

import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Code2, Save } from "lucide-react";
import { useCompany } from "@/contexts/CompanyContext";

interface CodeSettings {
  asset_code_prefix?: string;
  plan_code_prefix?: string;
  campaign_code_prefix?: string;
  client_code_prefix?: string;
  invoice_code_prefix?: string;
  estimation_code_prefix?: string;
  expense_code_prefix?: string;
  use_custom_asset_codes: boolean;
  use_custom_plan_codes: boolean;
  use_custom_campaign_codes: boolean;
  use_custom_client_codes: boolean;
  use_custom_invoice_codes: boolean;
  use_custom_estimation_codes: boolean;
  use_custom_expense_codes: boolean;
}

export default function CompanyCodeSettings() {
  const { company } = useCompany();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<CodeSettings>({
    use_custom_asset_codes: false,
    use_custom_plan_codes: false,
    use_custom_campaign_codes: false,
    use_custom_client_codes: false,
    use_custom_invoice_codes: false,
    use_custom_estimation_codes: false,
    use_custom_expense_codes: false,
  });

  useEffect(() => {
    if (company?.id) {
      loadSettings();
    }
  }, [company]);

  const loadSettings = async () => {
    if (!company?.id) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('company_code_settings')
        .select('*')
        .eq('company_id', company.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (data) {
        setSettings({
          asset_code_prefix: data.asset_code_prefix || '',
          plan_code_prefix: data.plan_code_prefix || '',
          campaign_code_prefix: data.campaign_code_prefix || '',
          client_code_prefix: data.client_code_prefix || '',
          invoice_code_prefix: data.invoice_code_prefix || '',
          estimation_code_prefix: data.estimation_code_prefix || '',
          expense_code_prefix: data.expense_code_prefix || '',
          use_custom_asset_codes: data.use_custom_asset_codes || false,
          use_custom_plan_codes: data.use_custom_plan_codes || false,
          use_custom_campaign_codes: data.use_custom_campaign_codes || false,
          use_custom_client_codes: data.use_custom_client_codes || false,
          use_custom_invoice_codes: data.use_custom_invoice_codes || false,
          use_custom_estimation_codes: data.use_custom_estimation_codes || false,
          use_custom_expense_codes: data.use_custom_expense_codes || false,
        });
      }
    } catch (error: any) {
      console.error('Error loading settings:', error);
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!company?.id) return;

    try {
      setSaving(true);

      const { error } = await supabase
        .from('company_code_settings')
        .upsert({
          company_id: company.id,
          ...settings,
        });

      if (error) throw error;

      toast({
        title: "Settings Saved",
        description: "Your code prefix settings have been updated successfully",
      });
    } catch (error: any) {
      console.error('Error saving settings:', error);
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const codeFormats = {
    asset: "CITYCODE-MEDIATYPE-####",
    plan: "PLAN-YYYYMM-####",
    campaign: "CMP-YYYYMM-####",
    client: "CLT-STATE-####",
    invoice: "INV-YYYYMM-####",
    estimation: "EST-YYYYMM-####",
    expense: "EXP-YYYYMM-####",
  };

  if (loading) {
    return <div className="flex items-center justify-center p-8">Loading...</div>;
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Code2 className="h-8 w-8" />
          Code Prefix Settings
        </h1>
        <p className="text-muted-foreground mt-2">
          Customize code prefixes for your organization while maintaining Go-Ads default formats
        </p>
      </div>

      <div className="space-y-4">
        {/* Media Assets */}
        <Card>
          <CardHeader>
            <CardTitle>Media Assets</CardTitle>
            <CardDescription>
              Default format: {codeFormats.asset} (e.g., HYD-BQS-0001)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="use_custom_asset_codes"
                checked={settings.use_custom_asset_codes}
                onCheckedChange={(checked) =>
                  setSettings({ ...settings, use_custom_asset_codes: !!checked })
                }
              />
              <Label htmlFor="use_custom_asset_codes">Use custom prefix</Label>
            </div>
            {settings.use_custom_asset_codes && (
              <div>
                <Label htmlFor="asset_code_prefix">Custom Prefix</Label>
                <Input
                  id="asset_code_prefix"
                  placeholder="e.g., MNS"
                  value={settings.asset_code_prefix || ''}
                  onChange={(e) =>
                    setSettings({ ...settings, asset_code_prefix: e.target.value.toUpperCase() })
                  }
                  maxLength={5}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Result: {settings.asset_code_prefix}-HYD-BQS-0001
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Plans */}
        <Card>
          <CardHeader>
            <CardTitle>Plans</CardTitle>
            <CardDescription>
              Default format: {codeFormats.plan} (e.g., PLAN-202501-001)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="use_custom_plan_codes"
                checked={settings.use_custom_plan_codes}
                onCheckedChange={(checked) =>
                  setSettings({ ...settings, use_custom_plan_codes: !!checked })
                }
              />
              <Label htmlFor="use_custom_plan_codes">Use custom prefix</Label>
            </div>
            {settings.use_custom_plan_codes && (
              <div>
                <Label htmlFor="plan_code_prefix">Custom Prefix</Label>
                <Input
                  id="plan_code_prefix"
                  placeholder="e.g., MC"
                  value={settings.plan_code_prefix || ''}
                  onChange={(e) =>
                    setSettings({ ...settings, plan_code_prefix: e.target.value.toUpperCase() })
                  }
                  maxLength={5}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Result: {settings.plan_code_prefix}-PLAN-202501-001
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Campaigns */}
        <Card>
          <CardHeader>
            <CardTitle>Campaigns</CardTitle>
            <CardDescription>
              Default format: {codeFormats.campaign} (e.g., CMP-202501-001)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="use_custom_campaign_codes"
                checked={settings.use_custom_campaign_codes}
                onCheckedChange={(checked) =>
                  setSettings({ ...settings, use_custom_campaign_codes: !!checked })
                }
              />
              <Label htmlFor="use_custom_campaign_codes">Use custom prefix</Label>
            </div>
            {settings.use_custom_campaign_codes && (
              <div>
                <Label htmlFor="campaign_code_prefix">Custom Prefix</Label>
                <Input
                  id="campaign_code_prefix"
                  placeholder="e.g., MC"
                  value={settings.campaign_code_prefix || ''}
                  onChange={(e) =>
                    setSettings({ ...settings, campaign_code_prefix: e.target.value.toUpperCase() })
                  }
                  maxLength={5}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Result: {settings.campaign_code_prefix}-CMP-202501-001
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Similar cards for Invoices, Estimations, and Expenses */}
        {/* ... (following the same pattern as above) */}
      </div>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving}>
          <Save className="mr-2 h-4 w-4" />
          {saving ? "Saving..." : "Save Settings"}
        </Button>
      </div>
    </div>
  );
}
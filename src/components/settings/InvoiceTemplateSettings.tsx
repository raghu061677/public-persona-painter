import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { FileText, Save } from "lucide-react";

export function InvoiceTemplateSettings() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [settings, setSettings] = useState<any>({
    invoice_prefix: "INV",
    invoice_footer: "",
    payment_terms: "Payment due within 30 days",
    bank_details: "",
  });

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    const { data } = await supabase
      .from("invoice_template_settings" as any)
      .select("*")
      .single() as any;

    if (data) {
      setSettings(data);
    }
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from("invoice_template_settings" as any)
        .upsert(settings) as any;

      if (error) throw error;

      toast({
        title: "Settings saved",
        description: "Invoice template settings have been updated.",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <Label htmlFor="invoicePrefix">Invoice ID Prefix</Label>
        <Input
          id="invoicePrefix"
          value={settings.invoice_prefix}
          onChange={(e) => setSettings({ ...settings, invoice_prefix: e.target.value })}
          placeholder="INV"
          className="mt-2"
        />
        <p className="text-xs text-muted-foreground mt-1">
          E.g., "INV" will generate invoices like INV-2025-001
        </p>
      </div>

      <div>
        <Label htmlFor="paymentTerms">Payment Terms</Label>
        <Input
          id="paymentTerms"
          value={settings.payment_terms}
          onChange={(e) => setSettings({ ...settings, payment_terms: e.target.value })}
          placeholder="Payment due within 30 days"
          className="mt-2"
        />
      </div>

      <div>
        <Label htmlFor="bankDetails">Bank Details</Label>
        <Textarea
          id="bankDetails"
          value={settings.bank_details}
          onChange={(e) => setSettings({ ...settings, bank_details: e.target.value })}
          placeholder="Enter bank account details for payments"
          className="mt-2"
          rows={4}
        />
      </div>

      <div>
        <Label htmlFor="invoiceFooter">Invoice Footer</Label>
        <Textarea
          id="invoiceFooter"
          value={settings.invoice_footer}
          onChange={(e) => setSettings({ ...settings, invoice_footer: e.target.value })}
          placeholder="Enter footer text to appear on all invoices"
          className="mt-2"
          rows={3}
        />
      </div>

      <Button onClick={handleSave} disabled={loading}>
        <Save className="mr-2 h-4 w-4" />
        {loading ? "Saving..." : "Save Settings"}
      </Button>
    </div>
  );
}

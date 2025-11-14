import { useState, useEffect } from "react";
import { useCompany } from "@/contexts/CompanyContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { FileText, Upload } from "lucide-react";
import { SettingsCard, SettingsContentWrapper, SectionHeader, InputRow, TwoColumnRow, InfoAlert } from "@/components/settings/zoho-style";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function CompanyPDFTemplates() {
  const { company, refreshCompany } = useCompany();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const [invoiceTemplate, setInvoiceTemplate] = useState({
    header_text: "",
    footer_text: "",
    show_logo: true,
    show_company_address: true,
    show_gstin: true,
    terms_conditions: "",
    payment_instructions: "",
    font_size: "medium",
    color_scheme: "blue",
  });

  const [quotationTemplate, setQuotationTemplate] = useState({
    header_text: "",
    footer_text: "",
    show_logo: true,
    validity_days: 30,
    terms_conditions: "",
    font_size: "medium",
    color_scheme: "blue",
  });

  const [proofTemplate, setProofTemplate] = useState({
    show_logo: true,
    show_timestamp: true,
    show_gps_coordinates: true,
    watermark_text: "",
    layout: "grid",
    photos_per_page: 4,
  });

  useEffect(() => {
    if (company) {
      const metadata = (company as any).metadata || {};
      const templates = metadata.pdf_templates || {};
      
      if (templates.invoice) setInvoiceTemplate({ ...invoiceTemplate, ...templates.invoice });
      if (templates.quotation) setQuotationTemplate({ ...quotationTemplate, ...templates.quotation });
      if (templates.proof) setProofTemplate({ ...proofTemplate, ...templates.proof });
    }
  }, [company]);

  const handleSave = async () => {
    if (!company) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('companies' as any)
        .update({
          metadata: {
            ...((company as any).metadata || {}),
            pdf_templates: {
              invoice: invoiceTemplate,
              quotation: quotationTemplate,
              proof: proofTemplate,
            }
          }
        })
        .eq('id', company.id);

      if (error) throw error;

      await refreshCompany();

      toast({
        title: "PDF templates updated",
        description: "Your PDF template settings have been saved successfully",
      });
    } catch (error: any) {
      console.error("Error updating templates:", error);
      toast({
        title: "Failed to update settings",
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
        title="PDF Templates"
        description="Customize PDF layouts for invoices, quotations, and proof documents"
      />

      <InfoAlert variant="info">
        These settings control how your PDF documents are generated and formatted.
      </InfoAlert>

      <Tabs defaultValue="invoice" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="invoice">Invoice Template</TabsTrigger>
          <TabsTrigger value="quotation">Quotation Template</TabsTrigger>
          <TabsTrigger value="proof">Proof Template</TabsTrigger>
        </TabsList>

        <TabsContent value="invoice" className="space-y-6 mt-6">
          <SettingsCard
            title="Invoice Header & Footer"
            description="Customize invoice header and footer content"
          >
            <InputRow label="Header Text" description="Text displayed at the top of invoice">
              <Input
                value={invoiceTemplate.header_text}
                onChange={(e) => setInvoiceTemplate({ ...invoiceTemplate, header_text: e.target.value })}
                placeholder="TAX INVOICE"
              />
            </InputRow>

            <InputRow label="Footer Text" description="Text displayed at the bottom">
              <Textarea
                value={invoiceTemplate.footer_text}
                onChange={(e) => setInvoiceTemplate({ ...invoiceTemplate, footer_text: e.target.value })}
                placeholder="Thank you for your business"
                rows={2}
              />
            </InputRow>
          </SettingsCard>

          <SettingsCard
            title="Invoice Display Options"
            description="Control what information appears on invoices"
          >
            <InputRow label="Show Company Logo" description="Display logo in invoice header">
              <Switch
                checked={invoiceTemplate.show_logo}
                onCheckedChange={(checked) => setInvoiceTemplate({ ...invoiceTemplate, show_logo: checked })}
              />
            </InputRow>

            <InputRow label="Show Company Address" description="Display full company address">
              <Switch
                checked={invoiceTemplate.show_company_address}
                onCheckedChange={(checked) => setInvoiceTemplate({ ...invoiceTemplate, show_company_address: checked })}
              />
            </InputRow>

            <InputRow label="Show GSTIN" description="Display GST registration number">
              <Switch
                checked={invoiceTemplate.show_gstin}
                onCheckedChange={(checked) => setInvoiceTemplate({ ...invoiceTemplate, show_gstin: checked })}
              />
            </InputRow>
          </SettingsCard>

          <SettingsCard
            title="Terms & Payment"
            description="Default terms and payment instructions"
          >
            <InputRow label="Terms & Conditions" description="Default terms for all invoices">
              <Textarea
                value={invoiceTemplate.terms_conditions}
                onChange={(e) => setInvoiceTemplate({ ...invoiceTemplate, terms_conditions: e.target.value })}
                placeholder="1. Payment due within 30 days&#10;2. Late payment charges apply..."
                rows={4}
              />
            </InputRow>

            <InputRow label="Payment Instructions" description="Bank details and payment methods">
              <Textarea
                value={invoiceTemplate.payment_instructions}
                onChange={(e) => setInvoiceTemplate({ ...invoiceTemplate, payment_instructions: e.target.value })}
                placeholder="Bank Name: HDFC Bank&#10;Account No: 1234567890&#10;IFSC: HDFC0001234"
                rows={4}
              />
            </InputRow>
          </SettingsCard>

          <SettingsCard
            title="Styling"
            description="Invoice appearance and formatting"
          >
            <TwoColumnRow
              leftColumn={
                <div>
                  <Label>Font Size</Label>
                  <Select
                    value={invoiceTemplate.font_size}
                    onValueChange={(value) => setInvoiceTemplate({ ...invoiceTemplate, font_size: value })}
                  >
                    <SelectTrigger className="mt-2">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="small">Small</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="large">Large</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              }
              rightColumn={
                <div>
                  <Label>Color Scheme</Label>
                  <Select
                    value={invoiceTemplate.color_scheme}
                    onValueChange={(value) => setInvoiceTemplate({ ...invoiceTemplate, color_scheme: value })}
                  >
                    <SelectTrigger className="mt-2">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="blue">Blue</SelectItem>
                      <SelectItem value="green">Green</SelectItem>
                      <SelectItem value="purple">Purple</SelectItem>
                      <SelectItem value="gray">Gray</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              }
            />
          </SettingsCard>
        </TabsContent>

        <TabsContent value="quotation" className="space-y-6 mt-6">
          <SettingsCard
            title="Quotation Header & Footer"
            description="Customize quotation header and footer content"
          >
            <InputRow label="Header Text" description="Text displayed at the top">
              <Input
                value={quotationTemplate.header_text}
                onChange={(e) => setQuotationTemplate({ ...quotationTemplate, header_text: e.target.value })}
                placeholder="QUOTATION / ESTIMATE"
              />
            </InputRow>

            <InputRow label="Footer Text" description="Text displayed at the bottom">
              <Textarea
                value={quotationTemplate.footer_text}
                onChange={(e) => setQuotationTemplate({ ...quotationTemplate, footer_text: e.target.value })}
                placeholder="We look forward to working with you"
                rows={2}
              />
            </InputRow>
          </SettingsCard>

          <SettingsCard
            title="Quotation Settings"
            description="Configure quotation-specific options"
          >
            <InputRow label="Show Company Logo" description="Display logo in quotation header">
              <Switch
                checked={quotationTemplate.show_logo}
                onCheckedChange={(checked) => setQuotationTemplate({ ...quotationTemplate, show_logo: checked })}
              />
            </InputRow>

            <InputRow label="Validity Period" description="Number of days quotation remains valid">
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  min="1"
                  max="90"
                  value={quotationTemplate.validity_days}
                  onChange={(e) => setQuotationTemplate({ ...quotationTemplate, validity_days: parseInt(e.target.value) || 30 })}
                  className="max-w-[120px]"
                />
                <span className="text-muted-foreground">days</span>
              </div>
            </InputRow>

            <InputRow label="Terms & Conditions" description="Default terms for quotations">
              <Textarea
                value={quotationTemplate.terms_conditions}
                onChange={(e) => setQuotationTemplate({ ...quotationTemplate, terms_conditions: e.target.value })}
                placeholder="1. Prices are subject to change&#10;2. Advance payment required..."
                rows={4}
              />
            </InputRow>
          </SettingsCard>
        </TabsContent>

        <TabsContent value="proof" className="space-y-6 mt-6">
          <SettingsCard
            title="Proof Document Layout"
            description="Configure how proof of performance PDFs are generated"
          >
            <InputRow label="Show Company Logo" description="Display logo on proof documents">
              <Switch
                checked={proofTemplate.show_logo}
                onCheckedChange={(checked) => setProofTemplate({ ...proofTemplate, show_logo: checked })}
              />
            </InputRow>

            <InputRow label="Show Timestamp" description="Display date/time on each photo">
              <Switch
                checked={proofTemplate.show_timestamp}
                onCheckedChange={(checked) => setProofTemplate({ ...proofTemplate, show_timestamp: checked })}
              />
            </InputRow>

            <InputRow label="Show GPS Coordinates" description="Display location coordinates">
              <Switch
                checked={proofTemplate.show_gps_coordinates}
                onCheckedChange={(checked) => setProofTemplate({ ...proofTemplate, show_gps_coordinates: checked })}
              />
            </InputRow>

            <InputRow label="Watermark Text" description="Text to overlay on proof photos">
              <Input
                value={proofTemplate.watermark_text}
                onChange={(e) => setProofTemplate({ ...proofTemplate, watermark_text: e.target.value })}
                placeholder="CONFIDENTIAL - Go-Ads 360°"
              />
            </InputRow>
          </SettingsCard>

          <SettingsCard
            title="Layout Options"
            description="Control photo arrangement in proof documents"
          >
            <InputRow label="Layout Style" description="How photos are arranged on the page">
              <Select
                value={proofTemplate.layout}
                onValueChange={(value) => setProofTemplate({ ...proofTemplate, layout: value })}
              >
                <SelectTrigger className="max-w-[200px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="grid">Grid Layout</SelectItem>
                  <SelectItem value="list">List Layout</SelectItem>
                  <SelectItem value="full">Full Page Photos</SelectItem>
                </SelectContent>
              </Select>
            </InputRow>

            <InputRow label="Photos Per Page" description="Number of photos on each page">
              <Select
                value={proofTemplate.photos_per_page.toString()}
                onValueChange={(value) => setProofTemplate({ ...proofTemplate, photos_per_page: parseInt(value) })}
              >
                <SelectTrigger className="max-w-[200px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1 Photo</SelectItem>
                  <SelectItem value="2">2 Photos</SelectItem>
                  <SelectItem value="4">4 Photos</SelectItem>
                  <SelectItem value="6">6 Photos</SelectItem>
                </SelectContent>
              </Select>
            </InputRow>
          </SettingsCard>
        </TabsContent>
      </Tabs>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={loading}>
          {loading ? "Saving..." : "Save Changes"}
        </Button>
      </div>
    </SettingsContentWrapper>
  );
}

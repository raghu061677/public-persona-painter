import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useCompany } from "@/contexts/CompanyContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Save, Plus, Trash2, FileText } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Separator } from "@/components/ui/separator";

interface LineItem {
  key: string;
  display_name: string;
  area: string;
  location: string;
  direction: string;
  dimension_width: number;
  dimension_height: number;
  total_sqft: number;
  illumination_type: string;
  negotiated_rate: number;
  discount: number;
  printing_charge: number;
  mounting_charge: number;
}

const emptyItem = (): LineItem => ({
  key: crypto.randomUUID(),
  display_name: "",
  area: "",
  location: "",
  direction: "",
  dimension_width: 0,
  dimension_height: 0,
  total_sqft: 0,
  illumination_type: "Non-Lit",
  negotiated_rate: 0,
  discount: 0,
  printing_charge: 0,
  mounting_charge: 0,
});

const ProformaCreate = () => {
  const navigate = useNavigate();
  const { company } = useCompany();
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    proforma_number: "",
    proforma_date: new Date().toISOString().split("T")[0],
    client_name: "",
    client_gstin: "",
    client_address: "",
    client_state: "",
    plan_name: "",
    campaign_start_date: "",
    campaign_end_date: "",
    additional_notes: "",
  });

  const [items, setItems] = useState<LineItem[]>([emptyItem()]);

  const updateForm = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const updateItem = (index: number, field: string, value: string | number) => {
    setItems((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      // Auto-calc sqft
      if (field === "dimension_width" || field === "dimension_height") {
        const w = field === "dimension_width" ? Number(value) : updated[index].dimension_width;
        const h = field === "dimension_height" ? Number(value) : updated[index].dimension_height;
        updated[index].total_sqft = Math.round(w * h * 100) / 100;
      }
      return updated;
    });
  };

  const addItem = () => setItems((prev) => [...prev, emptyItem()]);
  const removeItem = (index: number) => {
    if (items.length <= 1) return;
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const calcLineTotal = (item: LineItem) => {
    const base = item.total_sqft * item.negotiated_rate;
    return base - item.discount + item.printing_charge + item.mounting_charge;
  };

  const subtotal = items.reduce((s, it) => s + it.total_sqft * it.negotiated_rate, 0);
  const printingTotal = items.reduce((s, it) => s + it.printing_charge, 0);
  const mountingTotal = items.reduce((s, it) => s + it.mounting_charge, 0);
  const discountTotal = items.reduce((s, it) => s + it.discount, 0);
  const taxableAmount = subtotal + printingTotal + mountingTotal - discountTotal;
  const cgst = Math.round(taxableAmount * 0.09 * 100) / 100;
  const sgst = Math.round(taxableAmount * 0.09 * 100) / 100;
  const grandTotal = Math.round((taxableAmount + cgst + sgst) * 100) / 100;

  const handleSave = async () => {
    if (!form.client_name.trim()) {
      toast({ variant: "destructive", title: "Validation", description: "Client name is required." });
      return;
    }
    if (!form.proforma_number.trim()) {
      toast({ variant: "destructive", title: "Validation", description: "Proforma number is required." });
      return;
    }

    setSaving(true);
    try {
      const { data: proformaData, error: proformaError } = await supabase
        .from("proforma_invoices" as any)
        .insert({
          proforma_number: form.proforma_number,
          proforma_date: form.proforma_date,
          client_name: form.client_name,
          client_gstin: form.client_gstin || null,
          client_address: form.client_address || null,
          client_state: form.client_state || null,
          plan_name: form.plan_name || null,
          campaign_start_date: form.campaign_start_date || null,
          campaign_end_date: form.campaign_end_date || null,
          additional_notes: form.additional_notes || null,
          subtotal: Math.round(subtotal * 100) / 100,
          printing_total: Math.round(printingTotal * 100) / 100,
          mounting_total: Math.round(mountingTotal * 100) / 100,
          discount_total: Math.round(discountTotal * 100) / 100,
          taxable_amount: Math.round(taxableAmount * 100) / 100,
          cgst_amount: cgst,
          sgst_amount: sgst,
          total_tax: Math.round((cgst + sgst) * 100) / 100,
          grand_total: grandTotal,
          status: "draft",
        } as any)
        .select("id")
        .single();

      if (proformaError) throw proformaError;
      const proformaId = (proformaData as any).id;

      // Insert line items
      const lineItems = items.map((it) => ({
        proforma_invoice_id: proformaId,
        asset_id: "",
        display_name: it.display_name,
        area: it.area,
        location: it.location,
        direction: it.direction,
        dimension_width: it.dimension_width,
        dimension_height: it.dimension_height,
        total_sqft: it.total_sqft,
        illumination_type: it.illumination_type,
        negotiated_rate: it.negotiated_rate,
        discount: it.discount,
        printing_charge: it.printing_charge,
        mounting_charge: it.mounting_charge,
        line_total: Math.round(calcLineTotal(it) * 100) / 100,
      }));

      const { error: itemsError } = await supabase
        .from("proforma_invoice_items" as any)
        .insert(lineItems as any);

      if (itemsError) throw itemsError;

      toast({ title: "Success", description: "Proforma invoice created successfully." });
      navigate(`/admin/proformas/${proformaId}`);
    } catch (error: any) {
      console.error("Error creating proforma:", error);
      toast({ variant: "destructive", title: "Error", description: error.message || "Failed to create proforma invoice." });
    } finally {
      setSaving(false);
    }
  };

  const fmt = (n: number) => `₹${n.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/admin/proformas")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <FileText className="h-6 w-6 text-primary" />
              New Proforma Invoice
            </h1>
            <p className="text-sm text-muted-foreground">Create a new proforma invoice</p>
          </div>
        </div>
        <Button onClick={handleSave} disabled={saving}>
          <Save className="h-4 w-4 mr-2" />
          {saving ? "Saving..." : "Save Proforma"}
        </Button>
      </div>

      {/* Header Details */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Invoice Details</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label>Proforma Number *</Label>
              <Input value={form.proforma_number} onChange={(e) => updateForm("proforma_number", e.target.value)} placeholder="e.g. PI/2026-27/001" />
            </div>
            <div className="space-y-1.5">
              <Label>Date</Label>
              <Input type="date" value={form.proforma_date} onChange={(e) => updateForm("proforma_date", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Plan Name</Label>
              <Input value={form.plan_name} onChange={(e) => updateForm("plan_name", e.target.value)} placeholder="Campaign/Plan name" />
            </div>
            <div className="space-y-1.5">
              <Label>Client Name *</Label>
              <Input value={form.client_name} onChange={(e) => updateForm("client_name", e.target.value)} placeholder="Client / Company name" />
            </div>
            <div className="space-y-1.5">
              <Label>Client GSTIN</Label>
              <Input value={form.client_gstin} onChange={(e) => updateForm("client_gstin", e.target.value)} placeholder="22AAAAA0000A1Z5" />
            </div>
            <div className="space-y-1.5">
              <Label>Client State</Label>
              <Input value={form.client_state} onChange={(e) => updateForm("client_state", e.target.value)} placeholder="e.g. Telangana" />
            </div>
            <div className="space-y-1.5 md:col-span-2 lg:col-span-3">
              <Label>Client Address</Label>
              <Input value={form.client_address} onChange={(e) => updateForm("client_address", e.target.value)} placeholder="Billing address" />
            </div>
            <div className="space-y-1.5">
              <Label>Campaign Start</Label>
              <Input type="date" value={form.campaign_start_date} onChange={(e) => updateForm("campaign_start_date", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Campaign End</Label>
              <Input type="date" value={form.campaign_end_date} onChange={(e) => updateForm("campaign_end_date", e.target.value)} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Line Items */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg">Line Items</CardTitle>
          <Button variant="outline" size="sm" onClick={addItem}>
            <Plus className="h-4 w-4 mr-1" /> Add Item
          </Button>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-muted-foreground">
                  <th className="text-left py-2 px-1">#</th>
                  <th className="text-left py-2 px-1">Display Name</th>
                  <th className="text-left py-2 px-1">Area</th>
                  <th className="text-left py-2 px-1">Location</th>
                  <th className="text-center py-2 px-1">W×H</th>
                  <th className="text-right py-2 px-1">Sqft</th>
                  <th className="text-right py-2 px-1">Rate</th>
                  <th className="text-right py-2 px-1">Discount</th>
                  <th className="text-right py-2 px-1">Print</th>
                  <th className="text-right py-2 px-1">Mount</th>
                  <th className="text-right py-2 px-1">Total</th>
                  <th className="py-2 px-1"></th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, idx) => (
                  <tr key={item.key} className="border-b">
                    <td className="py-2 px-1 text-muted-foreground">{idx + 1}</td>
                    <td className="py-2 px-1">
                      <Input className="h-8 min-w-[120px]" value={item.display_name} onChange={(e) => updateItem(idx, "display_name", e.target.value)} placeholder="Name" />
                    </td>
                    <td className="py-2 px-1">
                      <Input className="h-8 min-w-[80px]" value={item.area} onChange={(e) => updateItem(idx, "area", e.target.value)} placeholder="Area" />
                    </td>
                    <td className="py-2 px-1">
                      <Input className="h-8 min-w-[100px]" value={item.location} onChange={(e) => updateItem(idx, "location", e.target.value)} placeholder="Location" />
                    </td>
                    <td className="py-2 px-1">
                      <div className="flex gap-1 items-center">
                        <Input className="h-8 w-14 text-center" type="number" value={item.dimension_width || ""} onChange={(e) => updateItem(idx, "dimension_width", Number(e.target.value))} />
                        <span className="text-muted-foreground">×</span>
                        <Input className="h-8 w-14 text-center" type="number" value={item.dimension_height || ""} onChange={(e) => updateItem(idx, "dimension_height", Number(e.target.value))} />
                      </div>
                    </td>
                    <td className="py-2 px-1 text-right font-mono">{item.total_sqft}</td>
                    <td className="py-2 px-1">
                      <Input className="h-8 w-20 text-right" type="number" value={item.negotiated_rate || ""} onChange={(e) => updateItem(idx, "negotiated_rate", Number(e.target.value))} />
                    </td>
                    <td className="py-2 px-1">
                      <Input className="h-8 w-20 text-right" type="number" value={item.discount || ""} onChange={(e) => updateItem(idx, "discount", Number(e.target.value))} />
                    </td>
                    <td className="py-2 px-1">
                      <Input className="h-8 w-20 text-right" type="number" value={item.printing_charge || ""} onChange={(e) => updateItem(idx, "printing_charge", Number(e.target.value))} />
                    </td>
                    <td className="py-2 px-1">
                      <Input className="h-8 w-20 text-right" type="number" value={item.mounting_charge || ""} onChange={(e) => updateItem(idx, "mounting_charge", Number(e.target.value))} />
                    </td>
                    <td className="py-2 px-1 text-right font-mono font-medium">{fmt(calcLineTotal(item))}</td>
                    <td className="py-2 px-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => removeItem(idx)} disabled={items.length <= 1}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Summary + Notes */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea rows={4} value={form.additional_notes} onChange={(e) => updateForm("additional_notes", e.target.value)} placeholder="Additional notes or terms..." />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span className="font-mono">{fmt(subtotal)}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Printing</span><span className="font-mono">{fmt(printingTotal)}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Mounting</span><span className="font-mono">{fmt(mountingTotal)}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Discount</span><span className="font-mono text-destructive">-{fmt(discountTotal)}</span></div>
            <Separator />
            <div className="flex justify-between"><span className="text-muted-foreground">Taxable Amount</span><span className="font-mono">{fmt(taxableAmount)}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">CGST (9%)</span><span className="font-mono">{fmt(cgst)}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">SGST (9%)</span><span className="font-mono">{fmt(sgst)}</span></div>
            <Separator />
            <div className="flex justify-between text-lg font-bold"><span>Grand Total</span><span className="font-mono">{fmt(grandTotal)}</span></div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ProformaCreate;

import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Save } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface InvoiceMetadataEditorProps {
  invoiceId: string;
  notes: string;
  poNumber: string;
  poDate: string;
  dueDate: string;
  onUpdate: () => void;
}

export function InvoiceMetadataEditor({
  invoiceId,
  notes,
  poNumber,
  poDate,
  dueDate,
  onUpdate,
}: InvoiceMetadataEditorProps) {
  const [form, setForm] = useState({
    notes,
    client_po_number: poNumber,
    client_po_date: poDate,
    due_date: dueDate,
  });
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from("invoices")
        .update({
          notes: form.notes || null,
          client_po_number: form.client_po_number || null,
          client_po_date: form.client_po_date || null,
          due_date: form.due_date || null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", invoiceId);

      if (error) throw error;

      toast({ title: "Saved", description: "Invoice details updated." });
      onUpdate();
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || "Failed to save",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Invoice Details (Editable)</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid md:grid-cols-3 gap-4">
          <div>
            <Label htmlFor="dueDate">Due Date</Label>
            <Input
              id="dueDate"
              type="date"
              value={form.due_date?.split("T")[0] || ""}
              onChange={(e) => setForm({ ...form, due_date: e.target.value })}
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="poNumber">Client PO Number</Label>
            <Input
              id="poNumber"
              value={form.client_po_number}
              onChange={(e) => setForm({ ...form, client_po_number: e.target.value })}
              placeholder="e.g. PO-2026-001"
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="poDate">PO Date</Label>
            <Input
              id="poDate"
              type="date"
              value={form.client_po_date?.split("T")[0] || ""}
              onChange={(e) => setForm({ ...form, client_po_date: e.target.value })}
              className="mt-1"
            />
          </div>
        </div>
        <div>
          <Label htmlFor="notes">Notes</Label>
          <Textarea
            id="notes"
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
            placeholder="Internal notes or special instructions"
            className="mt-1"
            rows={3}
          />
        </div>
        <Button onClick={handleSave} disabled={saving} size="sm">
          <Save className="mr-2 h-4 w-4" />
          {saving ? "Saving..." : "Save Details"}
        </Button>
      </CardContent>
    </Card>
  );
}

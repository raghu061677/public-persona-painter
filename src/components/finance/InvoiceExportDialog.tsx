import { useState, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { DateRangeFilter } from "@/components/common/date-range-filter";
import { DateRange } from "react-day-picker";
import { supabase } from "@/integrations/supabase/client";
import { formatINR, getDaysOverdue } from "@/utils/finance";
import { toast } from "sonner";
import ExcelJS from "exceljs";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { Loader2 } from "lucide-react";

export interface InvoiceForExport {
  id: string;
  invoice_date: string;
  due_date: string;
  total_amount: number;
  balance_due: number;
  status: string;
}

interface ColumnDef {
  key: string;
  label: string;
  defaultOn: boolean;
}

const COLUMNS: ColumnDef[] = [
  { key: "id", label: "Invoice ID", defaultOn: true },
  { key: "invoice_date", label: "Date", defaultOn: true },
  { key: "due_date", label: "Due Date", defaultOn: true },
  { key: "total_amount", label: "Amount", defaultOn: true },
  { key: "paid_amount", label: "Paid", defaultOn: true },
  { key: "balance_due", label: "Balance", defaultOn: true },
  { key: "status", label: "Status", defaultOn: true },
  { key: "aging", label: "Aging (days)", defaultOn: true },
];

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  invoices: InvoiceForExport[];
  clientName: string;
}

export function InvoiceExportDialog({ open, onOpenChange, invoices, clientName }: Props) {
  const [format, setFormat] = useState<"excel" | "pdf" | "csv">("excel");
  const [range, setRange] = useState<DateRange | undefined>();
  const [includeLineItems, setIncludeLineItems] = useState(false);
  const [selected, setSelected] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(COLUMNS.map(c => [c.key, c.defaultOn]))
  );
  const [busy, setBusy] = useState(false);

  const filtered = useMemo(() => {
    if (!range?.from && !range?.to) return invoices;
    const from = range?.from ? new Date(range.from).setHours(0, 0, 0, 0) : -Infinity;
    const to = range?.to ? new Date(range.to).setHours(23, 59, 59, 999) : Infinity;
    return invoices.filter(inv => {
      const t = new Date(inv.invoice_date).getTime();
      return t >= from && t <= to;
    });
  }, [invoices, range]);

  const activeCols = COLUMNS.filter(c => selected[c.key]);

  const buildRow = (inv: InvoiceForExport) => {
    const days = getDaysOverdue(inv.due_date);
    const isOverdue = inv.status !== "Paid" && days > 0;
    const paid = (inv.total_amount || 0) - (inv.balance_due || 0);
    const map: Record<string, any> = {
      id: inv.id,
      invoice_date: new Date(inv.invoice_date).toLocaleDateString("en-IN"),
      due_date: new Date(inv.due_date).toLocaleDateString("en-IN"),
      total_amount: Number(inv.total_amount || 0),
      paid_amount: Number(paid),
      balance_due: Number(inv.balance_due || 0),
      status: inv.status,
      aging: isOverdue ? days : 0,
    };
    return map;
  };

  const fetchLineItems = async (ids: string[]) => {
    if (ids.length === 0) return new Map<string, any[]>();
    const { data, error } = await supabase
      .from("invoice_line_items")
      .select("invoice_id, description, qty, rate, amount, hsn_sac_code")
      .in("invoice_id", ids);
    if (error) {
      console.error(error);
      return new Map<string, any[]>();
    }
    const map = new Map<string, any[]>();
    (data || []).forEach((li: any) => {
      const arr = map.get(li.invoice_id) || [];
      arr.push(li);
      map.set(li.invoice_id, arr);
    });
    return map;
  };

  const handleExport = async () => {
    if (filtered.length === 0) {
      toast.error("No invoices in selected date range");
      return;
    }
    if (activeCols.length === 0) {
      toast.error("Select at least one column");
      return;
    }
    setBusy(true);
    try {
      const fileBase = `${clientName.replace(/\s+/g, "_")}_Invoices`;
      const lineItemsMap = includeLineItems
        ? await fetchLineItems(filtered.map(f => f.id))
        : new Map<string, any[]>();

      if (format === "csv") {
        const headers = activeCols.map(c => c.label);
        if (includeLineItems) headers.push("Item Description", "Qty", "Unit Price", "Line Amount");
        const rows: string[] = [headers.join(",")];
        filtered.forEach(inv => {
          const r = buildRow(inv);
          const baseRow = activeCols.map(c => csvVal(r[c.key]));
          if (includeLineItems) {
            const items = lineItemsMap.get(inv.id) || [];
            if (items.length === 0) {
              rows.push([...baseRow, "", "", "", ""].join(","));
            } else {
              items.forEach((li: any) => {
                rows.push([
                  ...baseRow,
                  csvVal(li.description || ""),
                  csvVal(li.qty ?? ""),
                  csvVal(li.rate ?? ""),
                  csvVal(li.amount ?? ""),
                ].join(","));
              });
            }
          } else {
            rows.push(baseRow.join(","));
          }
        });
        downloadBlob(
          new Blob(["\uFEFF" + rows.join("\n")], { type: "text/csv;charset=utf-8;" }),
          `${fileBase}.csv`
        );
        toast.success("Invoices exported to CSV");
      } else if (format === "excel") {
        const wb = new ExcelJS.Workbook();
        const ws = wb.addWorksheet("Invoices");
        ws.addRow([`${clientName} — Invoices`]).font = { bold: true, size: 14 };
        if (range?.from || range?.to) {
          ws.addRow([`Period: ${range?.from?.toLocaleDateString("en-IN") || "—"} to ${range?.to?.toLocaleDateString("en-IN") || "—"}`]);
        }
        ws.addRow([`Generated: ${new Date().toLocaleDateString("en-IN")}`]);
        ws.addRow([]);
        const headers = activeCols.map(c => c.label);
        if (includeLineItems) headers.push("Item Description", "Qty", "Unit Price", "Line Amount");
        const headerRow = ws.addRow(headers);
        headerRow.font = { bold: true };
        headerRow.eachCell(c => {
          c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE2E8F0" } };
        });
        filtered.forEach(inv => {
          const r = buildRow(inv);
          const baseRow = activeCols.map(c => r[c.key]);
          if (includeLineItems) {
            const items = lineItemsMap.get(inv.id) || [];
            if (items.length === 0) {
              ws.addRow([...baseRow, "", "", "", ""]);
            } else {
              items.forEach((li: any, idx: number) => {
                ws.addRow([
                  ...(idx === 0 ? baseRow : baseRow.map(() => "")),
                  li.description || "",
                  li.qty ?? "",
                  Number(li.rate ?? 0),
                  Number(li.amount ?? 0),
                ]);
              });
            }
          } else {
            ws.addRow(baseRow);
          }
        });
        ws.columns.forEach(col => { col.width = 18; });
        const buf = await wb.xlsx.writeBuffer();
        downloadBlob(
          new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }),
          `${fileBase}.xlsx`
        );
        toast.success("Invoices exported to Excel");
      } else {
        const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
        doc.setFontSize(14);
        doc.text(`${clientName} — Invoices`, 14, 16);
        doc.setFontSize(9);
        doc.setTextColor(100);
        let y = 22;
        if (range?.from || range?.to) {
          doc.text(`Period: ${range?.from?.toLocaleDateString("en-IN") || "—"} to ${range?.to?.toLocaleDateString("en-IN") || "—"}`, 14, y);
          y += 5;
        }
        doc.text(`Generated: ${new Date().toLocaleDateString("en-IN")}`, 14, y);

        const head = [activeCols.map(c => c.label).concat(includeLineItems ? ["Item", "Qty", "Unit", "Amount"] : [])];
        const body: any[] = [];
        filtered.forEach(inv => {
          const r = buildRow(inv);
          const baseRow = activeCols.map(c => {
            if (["total_amount", "paid_amount", "balance_due"].includes(c.key)) return formatINR(r[c.key]);
            return r[c.key];
          });
          if (includeLineItems) {
            const items = lineItemsMap.get(inv.id) || [];
            if (items.length === 0) {
              body.push([...baseRow, "", "", "", ""]);
            } else {
              items.forEach((li: any, idx: number) => {
                body.push([
                  ...(idx === 0 ? baseRow : baseRow.map(() => "")),
                  li.description || "",
                  String(li.qty ?? ""),
                  formatINR(Number(li.rate ?? 0)),
                  formatINR(Number(li.amount ?? 0)),
                ]);
              });
            }
          } else {
            body.push(baseRow);
          }
        });
        autoTable(doc, {
          startY: y + 6,
          head,
          body,
          theme: "striped",
          styles: { fontSize: 8, cellPadding: 1.5 },
          headStyles: { fillColor: [30, 64, 175] },
        });
        doc.save(`${fileBase}.pdf`);
        toast.success("Invoices exported to PDF");
      }
      onOpenChange(false);
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || "Export failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Export Invoices</DialogTitle>
          <DialogDescription>
            Choose format, columns, date range, and whether to include line items.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          <div>
            <Label className="text-sm font-medium">Format</Label>
            <RadioGroup value={format} onValueChange={(v: any) => setFormat(v)} className="flex gap-4 mt-2">
              <div className="flex items-center gap-2">
                <RadioGroupItem value="excel" id="fmt-excel" />
                <Label htmlFor="fmt-excel" className="font-normal cursor-pointer">Excel</Label>
              </div>
              <div className="flex items-center gap-2">
                <RadioGroupItem value="pdf" id="fmt-pdf" />
                <Label htmlFor="fmt-pdf" className="font-normal cursor-pointer">PDF</Label>
              </div>
              <div className="flex items-center gap-2">
                <RadioGroupItem value="csv" id="fmt-csv" />
                <Label htmlFor="fmt-csv" className="font-normal cursor-pointer">CSV</Label>
              </div>
            </RadioGroup>
          </div>

          <DateRangeFilter
            label="Date Range (by Invoice Date)"
            value={range}
            onChange={setRange}
            placeholder="All dates"
          />

          <div>
            <Label className="text-sm font-medium">Columns</Label>
            <div className="grid grid-cols-2 gap-2 mt-2">
              {COLUMNS.map(c => (
                <div key={c.key} className="flex items-center gap-2">
                  <Checkbox
                    id={`col-${c.key}`}
                    checked={!!selected[c.key]}
                    onCheckedChange={(v) => setSelected(s => ({ ...s, [c.key]: !!v }))}
                  />
                  <Label htmlFor={`col-${c.key}`} className="font-normal cursor-pointer text-sm">{c.label}</Label>
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Checkbox
              id="include-line-items"
              checked={includeLineItems}
              onCheckedChange={(v) => setIncludeLineItems(!!v)}
            />
            <Label htmlFor="include-line-items" className="font-normal cursor-pointer text-sm">
              Include invoice line items (products / services & quantities)
            </Label>
          </div>

          <p className="text-xs text-muted-foreground">
            {filtered.length} of {invoices.length} invoices will be exported.
          </p>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>Cancel</Button>
          <Button onClick={handleExport} disabled={busy}>
            {busy && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Download
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function csvVal(v: any): string {
  if (v == null) return "";
  const s = String(v);
  if (s.includes(",") || s.includes('"') || s.includes("\n")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
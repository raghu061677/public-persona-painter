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
  companyId?: string;
}

export function InvoiceExportDialog({ open, onOpenChange, invoices, clientName, companyId }: Props) {
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

  const totals = useMemo(() => {
    const totalInvoiced = filtered.reduce((s, i) => s + Number(i.total_amount || 0), 0);
    const totalOutstanding = filtered.reduce((s, i) => s + Number(i.balance_due || 0), 0);
    const totalPaid = totalInvoiced - totalOutstanding;
    return { totalInvoiced, totalPaid, totalOutstanding };
  }, [filtered]);

  const fetchCompanyBranding = async () => {
    if (!companyId) return null;
    const { data } = await supabase
      .from("companies")
      .select("name, logo_url, theme_color, gstin")
      .eq("id", companyId)
      .maybeSingle();
    return data as { name?: string; logo_url?: string | null; theme_color?: string | null; gstin?: string | null } | null;
  };

  const loadImageAsDataUrl = async (url: string): Promise<{ data: string; w: number; h: number } | null> => {
    try {
      const res = await fetch(url);
      if (!res.ok) return null;
      const blob = await res.blob();
      const dataUrl: string = await new Promise((resolve, reject) => {
        const r = new FileReader();
        r.onloadend = () => resolve(r.result as string);
        r.onerror = reject;
        r.readAsDataURL(blob);
      });
      const dims: { w: number; h: number } = await new Promise((resolve) => {
        const img = new Image();
        img.onload = () => resolve({ w: img.naturalWidth, h: img.naturalHeight });
        img.onerror = () => resolve({ w: 0, h: 0 });
        img.src = dataUrl;
      });
      return { data: dataUrl, w: dims.w, h: dims.h };
    } catch {
      return null;
    }
  };

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
      const branding = await fetchCompanyBranding();
      const logo = branding?.logo_url ? await loadImageAsDataUrl(branding.logo_url) : null;
      const periodLabel = (range?.from || range?.to)
        ? `${range?.from?.toLocaleDateString("en-IN") || "—"} to ${range?.to?.toLocaleDateString("en-IN") || "—"}`
        : "All dates";

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
        const colCount = activeCols.length + (includeLineItems ? 4 : 0);

        // Embed logo (if any)
        if (logo?.data) {
          try {
            const ext = logo.data.startsWith("data:image/png") ? "png" : "jpeg";
            const imgId = wb.addImage({ base64: logo.data, extension: ext as any });
            ws.addImage(imgId, { tl: { col: 0, row: 0 }, ext: { width: 120, height: 60 } });
          } catch {}
          ws.getRow(1).height = 50;
        }

        const titleRow = ws.addRow([`${branding?.name || ""}`]);
        titleRow.font = { bold: true, size: 12, color: { argb: "FF1E40AF" } };
        const subTitle = ws.addRow([`${clientName} — Invoices & Payments`]);
        subTitle.font = { bold: true, size: 14 };
        ws.addRow([`Period: ${periodLabel}`]).font = { color: { argb: "FF64748B" } };
        ws.addRow([`Generated: ${new Date().toLocaleDateString("en-IN")}`]).font = { color: { argb: "FF64748B" } };
        ws.addRow([]);

        // Summary block
        const sumHeader = ws.addRow(["Summary"]);
        sumHeader.font = { bold: true, size: 11 };
        const summaryRows = [
          ["Total Invoices", filtered.length],
          ["Total Invoiced (₹)", Number(totals.totalInvoiced.toFixed(2))],
          ["Total Paid (₹)", Number(totals.totalPaid.toFixed(2))],
          ["Total Outstanding (₹)", Number(totals.totalOutstanding.toFixed(2))],
        ];
        summaryRows.forEach(([label, val]) => {
          const r = ws.addRow([label, val]);
          r.getCell(1).font = { bold: true };
          if (typeof val === "number" && String(label).includes("₹")) {
            r.getCell(2).numFmt = '#,##0.00';
            if (String(label).includes("Outstanding")) {
              r.getCell(2).font = { bold: true, color: { argb: "FFDC2626" } };
            } else if (String(label).includes("Paid")) {
              r.getCell(2).font = { bold: true, color: { argb: "FF059669" } };
            }
          }
        });
        ws.addRow([]);

        const headers = activeCols.map(c => c.label);
        if (includeLineItems) headers.push("Item Description", "Qty", "Unit Price", "Line Amount");
        const headerRow = ws.addRow(headers);
        headerRow.font = { bold: true, color: { argb: "FFFFFFFF" } };
        headerRow.eachCell(c => {
          c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1E40AF" } };
          c.alignment = { vertical: "middle", horizontal: "center" };
          c.border = { bottom: { style: "thin", color: { argb: "FF1E40AF" } } };
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

        // Totals row
        const totalRowVals: any[] = activeCols.map((c) => {
          if (c.key === "total_amount") return Number(totals.totalInvoiced.toFixed(2));
          if (c.key === "paid_amount") return Number(totals.totalPaid.toFixed(2));
          if (c.key === "balance_due") return Number(totals.totalOutstanding.toFixed(2));
          if (c.key === "id") return "TOTAL";
          return "";
        });
        const totalRow = ws.addRow(totalRowVals);
        totalRow.font = { bold: true };
        totalRow.eachCell((c) => {
          c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF1F5F9" } };
          c.border = { top: { style: "thin", color: { argb: "FF1E40AF" } } };
        });

        // Number formatting for amount columns
        activeCols.forEach((c, idx) => {
          if (["total_amount", "paid_amount", "balance_due"].includes(c.key)) {
            ws.getColumn(idx + 1).numFmt = '#,##0.00';
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
        const pageWidth = doc.internal.pageSize.getWidth();
        const margin = 14;
        let cursorY = 14;

        // Logo (left)
        if (logo?.data && logo.w && logo.h) {
          const maxH = 18;
          const maxW = 40;
          const ratio = logo.w / logo.h;
          let h = maxH;
          let w = h * ratio;
          if (w > maxW) { w = maxW; h = w / ratio; }
          try {
            const ext = logo.data.startsWith("data:image/png") ? "PNG" : "JPEG";
            doc.addImage(logo.data, ext, margin, cursorY - 4, w, h);
          } catch {}
        }

        // Company name (right aligned)
        if (branding?.name) {
          doc.setFontSize(12);
          doc.setTextColor(30, 64, 175);
          doc.setFont(undefined, "bold");
          doc.text(branding.name, pageWidth - margin, cursorY, { align: "right" });
          doc.setFont(undefined, "normal");
        }
        cursorY += 6;
        if (branding?.gstin) {
          doc.setFontSize(8);
          doc.setTextColor(100);
          doc.text(`GSTIN: ${branding.gstin}`, pageWidth - margin, cursorY, { align: "right" });
        }

        // Title
        cursorY = 28;
        doc.setFontSize(15);
        doc.setTextColor(15, 23, 42);
        doc.setFont(undefined, "bold");
        doc.text(`${clientName}`, margin, cursorY);
        doc.setFont(undefined, "normal");
        doc.setFontSize(10);
        doc.setTextColor(100);
        cursorY += 5;
        doc.text(`Invoices & Payments — Complete payment history and outstanding dues`, margin, cursorY);
        cursorY += 5;
        doc.setFontSize(9);
        doc.text(`Period: ${periodLabel}    |    Generated: ${new Date().toLocaleDateString("en-IN")}`, margin, cursorY);

        // Summary cards
        cursorY += 6;
        const cardW = (pageWidth - margin * 2 - 12) / 4;
        const cardH = 18;
        const cards = [
          { label: "Total Invoices", value: String(filtered.length), color: [30, 64, 175] as [number, number, number] },
          { label: "Total Invoiced", value: formatINR(totals.totalInvoiced), color: [30, 64, 175] as [number, number, number] },
          { label: "Total Paid", value: formatINR(totals.totalPaid), color: [5, 150, 105] as [number, number, number] },
          { label: "Outstanding", value: formatINR(totals.totalOutstanding), color: [220, 38, 38] as [number, number, number] },
        ];
        cards.forEach((c, i) => {
          const x = margin + i * (cardW + 4);
          doc.setFillColor(248, 250, 252);
          doc.setDrawColor(226, 232, 240);
          doc.roundedRect(x, cursorY, cardW, cardH, 2, 2, "FD");
          // colored left bar
          doc.setFillColor(c.color[0], c.color[1], c.color[2]);
          doc.rect(x, cursorY, 1.5, cardH, "F");
          doc.setFontSize(8);
          doc.setTextColor(100);
          doc.text(c.label, x + 4, cursorY + 6);
          doc.setFontSize(12);
          doc.setTextColor(c.color[0], c.color[1], c.color[2]);
          doc.setFont(undefined, "bold");
          doc.text(c.value, x + 4, cursorY + 13);
          doc.setFont(undefined, "normal");
        });
        cursorY += cardH + 4;

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

        // Totals row in table footer
        const footRow = activeCols.map((c) => {
          if (c.key === "id") return "TOTAL";
          if (c.key === "total_amount") return formatINR(totals.totalInvoiced);
          if (c.key === "paid_amount") return formatINR(totals.totalPaid);
          if (c.key === "balance_due") return formatINR(totals.totalOutstanding);
          return "";
        });
        if (includeLineItems) footRow.push("", "", "", "");

        autoTable(doc, {
          startY: cursorY,
          head,
          body,
          foot: [footRow],
          theme: "striped",
          styles: { fontSize: 8, cellPadding: 2, valign: "middle" },
          headStyles: { fillColor: [30, 64, 175], textColor: 255, halign: "left", fontStyle: "bold" },
          footStyles: { fillColor: [241, 245, 249], textColor: [15, 23, 42], fontStyle: "bold" },
          alternateRowStyles: { fillColor: [249, 250, 251] },
          margin: { left: margin, right: margin },
          didDrawPage: (data) => {
            const ph = doc.internal.pageSize.getHeight();
            doc.setFontSize(7);
            doc.setTextColor(150);
            doc.text(
              `${branding?.name || ""}  •  Generated ${new Date().toLocaleString("en-IN")}`,
              margin,
              ph - 6
            );
            doc.text(
              `Page ${data.pageNumber}`,
              pageWidth - margin,
              ph - 6,
              { align: "right" }
            );
          },
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
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
import { Loader2, Eye, Download, ArrowLeft } from "lucide-react";
import { ensurePdfUnicodeFont } from "@/lib/pdf/fontLoader";

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

type PreviewState = {
  kind: "pdf" | "html";
  url?: string;
  html?: string;
  blob: Blob;
  filename: string;
} | null;

export function InvoiceExportDialog({ open, onOpenChange, invoices, clientName, companyId }: Props) {
  const [format, setFormat] = useState<"excel" | "pdf" | "csv">("pdf");
  const [range, setRange] = useState<DateRange | undefined>();
  const [includeLineItems, setIncludeLineItems] = useState(false);
  const [selected, setSelected] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(COLUMNS.map(c => [c.key, c.defaultOn]))
  );
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState<PreviewState>(null);

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
    return {
      id: inv.id,
      invoice_date: new Date(inv.invoice_date).toLocaleDateString("en-IN"),
      due_date: new Date(inv.due_date).toLocaleDateString("en-IN"),
      total_amount: Number(inv.total_amount || 0),
      paid_amount: Number(paid),
      balance_due: Number(inv.balance_due || 0),
      status: inv.status,
      aging: isOverdue ? days : 0,
    } as Record<string, any>;
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

  const buildExport = async (): Promise<{ blob: Blob; filename: string; html?: string } | null> => {
    if (filtered.length === 0) {
      toast.error("No invoices in selected date range");
      return null;
    }
    if (activeCols.length === 0) {
      toast.error("Select at least one column");
      return null;
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
        const blob = new Blob(["\uFEFF" + rows.join("\n")], { type: "text/csv;charset=utf-8;" });
        const html = renderHtmlPreview(branding?.name, clientName, periodLabel, totals, filtered, activeCols, lineItemsMap, includeLineItems);
        return { blob, filename: `${fileBase}.csv`, html };
      }

      if (format === "excel") {
        const wb = new ExcelJS.Workbook();
        const ws = wb.addWorksheet("Invoices");

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

        const sumHeader = ws.addRow(["Summary"]);
        sumHeader.font = { bold: true, size: 11 };
        const summaryRows: [string, number][] = [
          ["Total Invoices", filtered.length],
          ["Total Invoiced (INR)", Number(totals.totalInvoiced.toFixed(2))],
          ["Total Paid (INR)", Number(totals.totalPaid.toFixed(2))],
          ["Total Outstanding (INR)", Number(totals.totalOutstanding.toFixed(2))],
        ];
        summaryRows.forEach(([label, val]) => {
          const r = ws.addRow([label, val]);
          r.getCell(1).font = { bold: true };
          if (typeof val === "number" && label.includes("INR")) {
            r.getCell(2).numFmt = '#,##0.00';
            if (label.includes("Outstanding")) r.getCell(2).font = { bold: true, color: { argb: "FFDC2626" } };
            else if (label.includes("Paid")) r.getCell(2).font = { bold: true, color: { argb: "FF059669" } };
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

        activeCols.forEach((c, idx) => {
          if (["total_amount", "paid_amount", "balance_due"].includes(c.key)) {
            ws.getColumn(idx + 1).numFmt = '#,##0.00';
          }
        });

        ws.columns.forEach(col => { col.width = 18; });
        const buf = await wb.xlsx.writeBuffer();
        const blob = new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
        const html = renderHtmlPreview(branding?.name, clientName, periodLabel, totals, filtered, activeCols, lineItemsMap, includeLineItems);
        return { blob, filename: `${fileBase}.xlsx`, html };
      }

      // ===== PDF (Zoho-style) =====
      const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
      await ensurePdfUnicodeFont(doc);
      doc.setFont("NotoSans", "normal");
      const pageWidth = doc.internal.pageSize.getWidth();
      const margin = 14;

      // Header band
      const bandH = 26;
      doc.setFillColor(30, 64, 175);
      doc.rect(0, 0, pageWidth, bandH, "F");
      doc.setFillColor(16, 185, 129);
      doc.rect(0, bandH, pageWidth, 1.2, "F");

      if (logo?.data && logo.w && logo.h) {
        const maxH = 16, maxW = 38;
        const ratio = logo.w / logo.h;
        let h = maxH, w = h * ratio;
        if (w > maxW) { w = maxW; h = w / ratio; }
        try {
          const ext = logo.data.startsWith("data:image/png") ? "PNG" : "JPEG";
          doc.addImage(logo.data, ext, margin, (bandH - h) / 2, w, h);
        } catch {}
      }

      doc.setTextColor(255, 255, 255);
      doc.setFont("NotoSans", "bold");
      doc.setFontSize(14);
      doc.text(branding?.name || "", pageWidth - margin, 11, { align: "right" });
      doc.setFont("NotoSans", "normal");
      doc.setFontSize(8);
      if (branding?.gstin) doc.text(`GSTIN: ${branding.gstin}`, pageWidth - margin, 16.5, { align: "right" });
      doc.text(`Generated: ${new Date().toLocaleDateString("en-IN")}`, pageWidth - margin, 21, { align: "right" });

      let cursorY = bandH + 8;
      doc.setTextColor(15, 23, 42);
      doc.setFont("NotoSans", "bold");
      doc.setFontSize(16);
      doc.text("Statement of Accounts", margin, cursorY);
      cursorY += 5.5;
      doc.setFont("NotoSans", "normal");
      doc.setFontSize(10);
      doc.setTextColor(71, 85, 105);
      doc.text(`${clientName}`, margin, cursorY);
      cursorY += 4.5;
      doc.setFontSize(8.5);
      doc.setTextColor(100, 116, 139);
      doc.text(`Invoices & Payments  •  Period: ${periodLabel}`, margin, cursorY);

      // Summary cards
      cursorY += 6;
      const cardW = (pageWidth - margin * 2 - 12) / 4;
      const cardH = 20;
      const cards = [
        { label: "TOTAL INVOICES", value: String(filtered.length), color: [30, 64, 175] as [number, number, number] },
        { label: "TOTAL INVOICED", value: formatINR(totals.totalInvoiced), color: [30, 64, 175] as [number, number, number] },
        { label: "TOTAL PAID", value: formatINR(totals.totalPaid), color: [5, 150, 105] as [number, number, number] },
        { label: "OUTSTANDING", value: formatINR(totals.totalOutstanding), color: [220, 38, 38] as [number, number, number] },
      ];
      cards.forEach((c, i) => {
        const x = margin + i * (cardW + 4);
        doc.setFillColor(255, 255, 255);
        doc.setDrawColor(226, 232, 240);
        doc.roundedRect(x, cursorY, cardW, cardH, 2.5, 2.5, "FD");
        doc.setFillColor(c.color[0], c.color[1], c.color[2]);
        doc.roundedRect(x, cursorY, cardW, 2.2, 1, 1, "F");
        doc.setFont("NotoSans", "normal");
        doc.setFontSize(7);
        doc.setTextColor(100, 116, 139);
        doc.text(c.label, x + 4, cursorY + 8);
        doc.setFontSize(13);
        doc.setTextColor(c.color[0], c.color[1], c.color[2]);
        doc.setFont("NotoSans", "bold");
        doc.text(c.value, x + 4, cursorY + 16);
        doc.setFont("NotoSans", "normal");
      });
      cursorY += cardH + 6;

      const head = [activeCols.map(c => c.label).concat(includeLineItems ? ["Item", "Qty", "Unit", "Amount"] : [])];
      const body: any[] = [];
      filtered.forEach(inv => {
        const r = buildRow(inv);
        const baseRow = activeCols.map(c => {
          if (["total_amount", "paid_amount", "balance_due"].includes(c.key)) return formatINR(r[c.key]);
          if (c.key === "aging") return r[c.key] > 0 ? `${r[c.key]}d` : "—";
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
        theme: "plain",
        styles: { fontSize: 8.5, cellPadding: 3, valign: "middle", font: "NotoSans", textColor: [30, 41, 59], lineColor: [226, 232, 240], lineWidth: 0.1 },
        headStyles: { fillColor: [30, 64, 175], textColor: 255, halign: "left", fontStyle: "bold", font: "NotoSans", cellPadding: 3.5, fontSize: 8.5 },
        footStyles: { fillColor: [241, 245, 249], textColor: [15, 23, 42], fontStyle: "bold", font: "NotoSans" },
        alternateRowStyles: { fillColor: [249, 250, 251] },
        columnStyles: amountColumnStyles(activeCols, includeLineItems),
        margin: { left: margin, right: margin },
        didDrawPage: (data) => {
          const ph = doc.internal.pageSize.getHeight();
          doc.setDrawColor(226, 232, 240);
          doc.line(margin, ph - 10, pageWidth - margin, ph - 10);
          doc.setFontSize(7);
          doc.setTextColor(100, 116, 139);
          doc.setFont("NotoSans", "normal");
          doc.text(
            `${branding?.name || ""}  •  Generated ${new Date().toLocaleString("en-IN")}`,
            margin,
            ph - 6
          );
          doc.text(`Page ${data.pageNumber}`, pageWidth - margin, ph - 6, { align: "right" });
        },
      });
      const blob = doc.output("blob");
      return { blob, filename: `${fileBase}.pdf` };
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || "Export failed");
      return null;
    } finally {
      setBusy(false);
    }
  };

  const handleExport = async () => {
    const built = await buildExport();
    if (!built) return;
    downloadBlob(built.blob, built.filename);
    toast.success(`Invoices exported to ${format.toUpperCase()}`);
    onOpenChange(false);
  };

  const handlePreview = async () => {
    const built = await buildExport();
    if (!built) return;
    if (format === "pdf") {
      const url = URL.createObjectURL(built.blob);
      setPreview({ kind: "pdf", url, blob: built.blob, filename: built.filename });
    } else {
      setPreview({ kind: "html", html: built.html || "", blob: built.blob, filename: built.filename });
    }
  };

  const closePreview = () => {
    if (preview?.url) URL.revokeObjectURL(preview.url);
    setPreview(null);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) closePreview(); onOpenChange(v); }}>
      <DialogContent className={preview ? "max-w-5xl h-[90vh] flex flex-col" : "max-w-lg"}>
        <DialogHeader>
          <DialogTitle>{preview ? "Preview Export" : "Export Invoices"}</DialogTitle>
          <DialogDescription>
            {preview
              ? `Review the ${format.toUpperCase()} layout before downloading.`
              : "Choose format, columns, date range, and whether to include line items."}
          </DialogDescription>
        </DialogHeader>

        {preview ? (
          <div className="flex-1 min-h-0 border rounded-md overflow-hidden bg-muted/30">
            {preview.kind === "pdf" && preview.url ? (
              <iframe src={preview.url} title="PDF Preview" className="w-full h-full" />
            ) : (
              <div className="w-full h-full overflow-auto p-4 bg-white">
                <div dangerouslySetInnerHTML={{ __html: preview.html || "" }} />
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-5">
            <div>
              <Label className="text-sm font-medium">Format</Label>
              <RadioGroup value={format} onValueChange={(v: any) => setFormat(v)} className="flex gap-4 mt-2">
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="pdf" id="fmt-pdf" />
                  <Label htmlFor="fmt-pdf" className="font-normal cursor-pointer">PDF</Label>
                </div>
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="excel" id="fmt-excel" />
                  <Label htmlFor="fmt-excel" className="font-normal cursor-pointer">Excel</Label>
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
        )}

        <DialogFooter>
          {preview ? (
            <>
              <Button variant="outline" onClick={closePreview} disabled={busy}>
                <ArrowLeft className="h-4 w-4 mr-2" /> Back
              </Button>
              <Button onClick={() => { downloadBlob(preview.blob, preview.filename); toast.success(`Downloaded ${preview.filename}`); closePreview(); onOpenChange(false); }}>
                <Download className="h-4 w-4 mr-2" /> Download
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>Cancel</Button>
              <Button variant="outline" onClick={handlePreview} disabled={busy}>
                {busy ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Eye className="h-4 w-4 mr-2" />}
                Preview
              </Button>
              <Button onClick={handleExport} disabled={busy}>
                {busy ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Download className="h-4 w-4 mr-2" />}
                Download
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function amountColumnStyles(activeCols: ColumnDef[], includeLineItems: boolean) {
  const styles: Record<number, any> = {};
  activeCols.forEach((c, i) => {
    if (["total_amount", "paid_amount", "balance_due"].includes(c.key)) {
      styles[i] = { halign: "right", font: "NotoSans" };
    }
    if (c.key === "aging" || c.key === "status") styles[i] = { halign: "center" };
  });
  if (includeLineItems) {
    const base = activeCols.length;
    styles[base + 1] = { halign: "center" };
    styles[base + 2] = { halign: "right", font: "NotoSans" };
    styles[base + 3] = { halign: "right", font: "NotoSans" };
  }
  return styles;
}

function renderHtmlPreview(
  companyName: string | undefined,
  clientName: string,
  periodLabel: string,
  totals: { totalInvoiced: number; totalPaid: number; totalOutstanding: number },
  filtered: InvoiceForExport[],
  activeCols: ColumnDef[],
  lineItemsMap: Map<string, any[]>,
  includeLineItems: boolean
): string {
  const fmt = (n: number) => formatINR(n);
  const headers = activeCols.map(c => `<th style="background:#1e40af;color:#fff;padding:8px;text-align:left;font-size:12px;">${c.label}</th>`).join("");
  const liHeaders = includeLineItems ? `<th style="background:#1e40af;color:#fff;padding:8px;font-size:12px;">Item</th><th style="background:#1e40af;color:#fff;padding:8px;font-size:12px;">Qty</th><th style="background:#1e40af;color:#fff;padding:8px;font-size:12px;text-align:right;">Unit</th><th style="background:#1e40af;color:#fff;padding:8px;font-size:12px;text-align:right;">Amount</th>` : "";
  const rowsHtml = filtered.map((inv, idx) => {
    const days = getDaysOverdue(inv.due_date);
    const isOverdue = inv.status !== "Paid" && days > 0;
    const paid = (inv.total_amount || 0) - (inv.balance_due || 0);
    const cells = activeCols.map(c => {
      let v: any = "";
      if (c.key === "id") v = inv.id;
      else if (c.key === "invoice_date") v = new Date(inv.invoice_date).toLocaleDateString("en-IN");
      else if (c.key === "due_date") v = new Date(inv.due_date).toLocaleDateString("en-IN");
      else if (c.key === "total_amount") v = fmt(Number(inv.total_amount || 0));
      else if (c.key === "paid_amount") v = fmt(paid);
      else if (c.key === "balance_due") v = fmt(Number(inv.balance_due || 0));
      else if (c.key === "status") v = inv.status;
      else if (c.key === "aging") v = isOverdue ? `${days}d` : "—";
      const align = ["total_amount", "paid_amount", "balance_due"].includes(c.key) ? "right" : (["status", "aging"].includes(c.key) ? "center" : "left");
      return `<td style="padding:8px;text-align:${align};border-bottom:1px solid #e2e8f0;font-size:12px;">${v}</td>`;
    }).join("");
    const bg = idx % 2 === 0 ? "#ffffff" : "#f9fafb";
    return `<tr style="background:${bg};">${cells}</tr>`;
  }).join("");
  const totalRow = `<tr style="background:#f1f5f9;font-weight:bold;">${activeCols.map(c => {
    let v = "";
    if (c.key === "id") v = "TOTAL";
    else if (c.key === "total_amount") v = fmt(totals.totalInvoiced);
    else if (c.key === "paid_amount") v = fmt(totals.totalPaid);
    else if (c.key === "balance_due") v = fmt(totals.totalOutstanding);
    const align = ["total_amount", "paid_amount", "balance_due"].includes(c.key) ? "right" : "left";
    return `<td style="padding:10px 8px;text-align:${align};font-size:12px;border-top:2px solid #1e40af;">${v}</td>`;
  }).join("")}</tr>`;

  return `
  <div style="font-family:Inter,system-ui,sans-serif;color:#0f172a;max-width:1100px;margin:0 auto;">
    <div style="background:#1e40af;color:#fff;padding:16px 20px;border-radius:6px 6px 0 0;display:flex;justify-content:space-between;align-items:center;">
      <div style="font-size:18px;font-weight:700;">${companyName || ""}</div>
      <div style="font-size:11px;opacity:0.9;">Generated: ${new Date().toLocaleDateString("en-IN")}</div>
    </div>
    <div style="background:#10b981;height:3px;"></div>
    <div style="padding:18px 20px;background:#fff;">
      <div style="font-size:20px;font-weight:700;">Statement of Accounts</div>
      <div style="color:#475569;margin-top:4px;">${clientName}</div>
      <div style="color:#64748b;font-size:12px;margin-top:2px;">Invoices & Payments • Period: ${periodLabel}</div>
      <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin:16px 0;">
        ${[
          { l: "TOTAL INVOICES", v: String(filtered.length), c: "#1e40af" },
          { l: "TOTAL INVOICED", v: fmt(totals.totalInvoiced), c: "#1e40af" },
          { l: "TOTAL PAID", v: fmt(totals.totalPaid), c: "#059669" },
          { l: "OUTSTANDING", v: fmt(totals.totalOutstanding), c: "#dc2626" },
        ].map(c => `
          <div style="border:1px solid #e2e8f0;border-radius:6px;overflow:hidden;background:#fff;">
            <div style="background:${c.c};height:3px;"></div>
            <div style="padding:10px 12px;">
              <div style="font-size:10px;color:#64748b;letter-spacing:0.5px;">${c.l}</div>
              <div style="font-size:16px;font-weight:700;color:${c.c};margin-top:4px;">${c.v}</div>
            </div>
          </div>
        `).join("")}
      </div>
      <table style="width:100%;border-collapse:collapse;border:1px solid #e2e8f0;">
        <thead><tr>${headers}${liHeaders}</tr></thead>
        <tbody>${rowsHtml}${totalRow}</tbody>
      </table>
    </div>
  </div>`;
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

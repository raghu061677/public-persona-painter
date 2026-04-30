import { useState, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { DateRangeFilter } from "@/components/common/date-range-filter";
import { DateRange } from "react-day-picker";
import { supabase } from "@/integrations/supabase/client";
import { LedgerEntry, LedgerSummary, OutstandingRow } from "@/hooks/useClientLedger";
import { exportClientLedgerExcel } from "@/utils/exports/clientLedgerExcel";
import { exportClientLedgerPdf } from "@/utils/exports/clientLedgerPdf";
import { formatDate } from "@/utils/plans";
import { formatINR } from "@/utils/finance";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

interface ColumnDef { key: string; label: string; defaultOn: boolean; }

const COLUMNS: ColumnDef[] = [
  { key: "date", label: "Date", defaultOn: true },
  { key: "type", label: "Type", defaultOn: true },
  { key: "refNo", label: "Ref No", defaultOn: true },
  { key: "description", label: "Description", defaultOn: true },
  { key: "debit", label: "Debit", defaultOn: true },
  { key: "credit", label: "Credit", defaultOn: true },
  { key: "runningBalance", label: "Balance", defaultOn: true },
  { key: "status", label: "Status", defaultOn: true },
];

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  entries: LedgerEntry[];
  summary: LedgerSummary;
  outstanding: OutstandingRow[];
  clientId: string;
  clientName: string;
}

export function LedgerExportDialog({ open, onOpenChange, entries, summary, outstanding, clientId, clientName }: Props) {
  const [format, setFormat] = useState<"excel" | "pdf" | "csv">("excel");
  const [range, setRange] = useState<DateRange | undefined>();
  const [includeLineItems, setIncludeLineItems] = useState(false);
  const [selected, setSelected] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(COLUMNS.map(c => [c.key, c.defaultOn]))
  );
  const [busy, setBusy] = useState(false);

  const filteredEntries = useMemo(() => {
    if (!range?.from && !range?.to) return entries;
    const from = range?.from ? new Date(range.from).setHours(0, 0, 0, 0) : -Infinity;
    const to = range?.to ? new Date(range.to).setHours(23, 59, 59, 999) : Infinity;
    return entries.filter(e => {
      const t = new Date(e.date).getTime();
      return t >= from && t <= to;
    });
  }, [entries, range]);

  const filteredOutstanding = useMemo(() => {
    if (!range?.from && !range?.to) return outstanding;
    const from = range?.from ? new Date(range.from).setHours(0, 0, 0, 0) : -Infinity;
    const to = range?.to ? new Date(range.to).setHours(23, 59, 59, 999) : Infinity;
    return outstanding.filter(o => {
      const t = new Date(o.invoiceDate).getTime();
      return t >= from && t <= to;
    });
  }, [outstanding, range]);

  const filteredSummary = useMemo<LedgerSummary>(() => {
    if (!range?.from && !range?.to) return summary;
    const totalInvoiced = filteredEntries.filter(e => e.type === "invoice").reduce((s, e) => s + e.debit, 0);
    const totalReceived = filteredEntries.filter(e => e.type === "payment").reduce((s, e) => s + e.credit, 0);
    const totalTds = filteredEntries.filter(e => e.type === "tds").reduce((s, e) => s + e.credit, 0);
    const totalCredits = filteredEntries.filter(e => e.type === "credit_note").reduce((s, e) => s + e.credit, 0);
    return {
      totalInvoiced,
      totalReceived,
      totalTds,
      totalCredits,
      netOutstanding: totalInvoiced - totalReceived - totalTds - totalCredits,
    };
  }, [filteredEntries, summary, range]);

  const activeCols = COLUMNS.filter(c => selected[c.key]);

  const fetchLineItems = async () => {
    const invoiceRefs = filteredEntries.filter(e => e.type === "invoice").map(e => e.refNo);
    if (invoiceRefs.length === 0) return new Map<string, any[]>();
    const { data, error } = await supabase
      .from("invoice_line_items")
      .select("invoice_id, description, qty, rate, amount")
      .in("invoice_id", invoiceRefs);
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
    if (filteredEntries.length === 0) {
      toast.error("No ledger entries in selected date range");
      return;
    }
    if (activeCols.length === 0) {
      toast.error("Select at least one column");
      return;
    }
    setBusy(true);
    try {
      if (format === "csv") {
        const lineItemsMap = includeLineItems ? await fetchLineItems() : new Map();
        const headers = activeCols.map(c => c.label);
        if (includeLineItems) headers.push("Item Description", "Qty", "Rate", "Amount");
        const rows: string[] = [headers.join(",")];
        const typeLabel = (t: string) =>
          t === "invoice" ? "Invoice" : t === "payment" ? "Payment" : t === "tds" ? "TDS" : "Credit Note";
        filteredEntries.forEach(e => {
          const r: Record<string, any> = {
            date: formatDate(e.date),
            type: typeLabel(e.type),
            refNo: e.refNo,
            description: e.description,
            debit: e.debit || "",
            credit: e.credit || "",
            runningBalance: e.runningBalance,
            status: e.status,
          };
          const baseRow = activeCols.map(c => csvVal(r[c.key]));
          if (includeLineItems && e.type === "invoice") {
            const items = lineItemsMap.get(e.refNo) || [];
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
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${clientName.replace(/\s+/g, "_")}_Ledger.csv`;
        a.click();
        URL.revokeObjectURL(url);
        toast.success("Ledger exported to CSV");
      } else if (format === "excel") {
        // Filter entries to active columns is handled inside the existing export util.
        // For simplicity we pass filtered data through; the existing util produces
        // standard columns. We'll respect column selection by using a custom path here.
        await exportLedgerExcelCustom(filteredEntries, filteredSummary, filteredOutstanding, clientName, activeCols, includeLineItems ? await fetchLineItems() : null, range);
        toast.success("Ledger exported to Excel");
      } else {
        await exportLedgerPdfCustom(filteredEntries, filteredSummary, filteredOutstanding, clientName, activeCols, includeLineItems ? await fetchLineItems() : null, range);
        toast.success("Ledger exported to PDF");
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
          <DialogTitle>Export Ledger</DialogTitle>
          <DialogDescription>
            Choose format, columns, date range, and whether to include invoice line items.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          <div>
            <Label className="text-sm font-medium">Format</Label>
            <RadioGroup value={format} onValueChange={(v: any) => setFormat(v)} className="flex gap-4 mt-2">
              <div className="flex items-center gap-2">
                <RadioGroupItem value="excel" id="lfmt-excel" />
                <Label htmlFor="lfmt-excel" className="font-normal cursor-pointer">Excel</Label>
              </div>
              <div className="flex items-center gap-2">
                <RadioGroupItem value="pdf" id="lfmt-pdf" />
                <Label htmlFor="lfmt-pdf" className="font-normal cursor-pointer">PDF</Label>
              </div>
              <div className="flex items-center gap-2">
                <RadioGroupItem value="csv" id="lfmt-csv" />
                <Label htmlFor="lfmt-csv" className="font-normal cursor-pointer">CSV</Label>
              </div>
            </RadioGroup>
          </div>

          <DateRangeFilter
            label="Date Range (by Entry Date)"
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
                    id={`lcol-${c.key}`}
                    checked={!!selected[c.key]}
                    onCheckedChange={(v) => setSelected(s => ({ ...s, [c.key]: !!v }))}
                  />
                  <Label htmlFor={`lcol-${c.key}`} className="font-normal cursor-pointer text-sm">{c.label}</Label>
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Checkbox
              id="ledger-include-line-items"
              checked={includeLineItems}
              onCheckedChange={(v) => setIncludeLineItems(!!v)}
            />
            <Label htmlFor="ledger-include-line-items" className="font-normal cursor-pointer text-sm">
              Include invoice line items (products / services & quantities)
            </Label>
          </div>

          <p className="text-xs text-muted-foreground">
            {filteredEntries.length} of {entries.length} ledger entries will be exported.
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

async function exportLedgerExcelCustom(
  entries: LedgerEntry[],
  summary: LedgerSummary,
  outstanding: OutstandingRow[],
  clientName: string,
  activeCols: ColumnDef[],
  lineItemsMap: Map<string, any[]> | null,
  range?: DateRange,
) {
  const ExcelJS = (await import("exceljs")).default;
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Client Ledger");
  ws.addRow([`${clientName} — Receivable Ledger`]).font = { bold: true, size: 14 };
  if (range?.from || range?.to) {
    ws.addRow([`Period: ${range?.from?.toLocaleDateString("en-IN") || "—"} to ${range?.to?.toLocaleDateString("en-IN") || "—"}`]);
  }
  ws.addRow([`Generated: ${new Date().toLocaleDateString("en-IN")}`]);
  ws.addRow([]);
  ws.addRow(["Summary"]).font = { bold: true, size: 12 };
  ws.addRow(["Total Invoiced", summary.totalInvoiced]);
  ws.addRow(["Total Received", summary.totalReceived]);
  ws.addRow(["Total TDS", summary.totalTds]);
  ws.addRow(["Total Credits", summary.totalCredits]);
  ws.addRow(["Net Outstanding", summary.netOutstanding]).font = { bold: true };
  ws.addRow([]);

  const headers = activeCols.map(c => c.label);
  if (lineItemsMap) headers.push("Item Description", "Qty", "Rate", "Amount");
  const headerRow = ws.addRow(headers);
  headerRow.font = { bold: true };
  headerRow.eachCell(c => {
    c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE2E8F0" } };
  });

  const typeLabel = (t: string) =>
    t === "invoice" ? "Invoice" : t === "payment" ? "Payment" : t === "tds" ? "TDS" : "Credit Note";

  for (const e of entries) {
    const r: Record<string, any> = {
      date: formatDate(e.date),
      type: typeLabel(e.type),
      refNo: e.refNo,
      description: e.description,
      debit: e.debit || "",
      credit: e.credit || "",
      runningBalance: e.runningBalance,
      status: e.status,
    };
    const baseRow = activeCols.map(c => r[c.key]);
    if (lineItemsMap && e.type === "invoice") {
      const items = lineItemsMap.get(e.refNo) || [];
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
  }
  ws.columns.forEach(col => { col.width = 18; });

  if (outstanding.length > 0) {
    const os = wb.addWorksheet("Outstanding");
    os.addRow([`${clientName} — Outstanding Invoices`]).font = { bold: true, size: 14 };
    os.addRow([]);
    const oh = os.addRow(["Invoice No", "Invoice Date", "Due Date", "Total", "Paid", "Credits", "Balance Due", "Overdue Days", "Status"]);
    oh.font = { bold: true };
    for (const o of outstanding) {
      os.addRow([o.invoiceNo, formatDate(o.invoiceDate), formatDate(o.dueDate), o.totalAmount, o.paidAmount, o.creditAmount, o.balanceDue, o.overdueDays, o.status]);
    }
    os.columns.forEach(col => { col.width = 16; });
  }

  const buf = await wb.xlsx.writeBuffer();
  const blob = new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${clientName.replace(/\s+/g, "_")}_Ledger.xlsx`;
  a.click();
  URL.revokeObjectURL(url);
}

async function exportLedgerPdfCustom(
  entries: LedgerEntry[],
  summary: LedgerSummary,
  outstanding: OutstandingRow[],
  clientName: string,
  activeCols: ColumnDef[],
  lineItemsMap: Map<string, any[]> | null,
  range?: DateRange,
) {
  const jsPDF = (await import("jspdf")).default;
  const autoTable = (await import("jspdf-autotable")).default;
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  doc.setFontSize(16);
  doc.text(`${clientName} — Receivable Ledger`, 14, 16);
  doc.setFontSize(9);
  doc.setTextColor(100);
  let y = 22;
  if (range?.from || range?.to) {
    doc.text(`Period: ${range?.from?.toLocaleDateString("en-IN") || "—"} to ${range?.to?.toLocaleDateString("en-IN") || "—"}`, 14, y);
    y += 5;
  }
  doc.text(`Generated: ${new Date().toLocaleDateString("en-IN")}`, 14, y);
  y += 6;
  doc.setTextColor(0);

  autoTable(doc, {
    startY: y,
    head: [["Metric", "Amount"]],
    body: [
      ["Total Invoiced", formatINR(summary.totalInvoiced)],
      ["Total Received", formatINR(summary.totalReceived)],
      ["Total TDS", formatINR(summary.totalTds)],
      ["Total Credits", formatINR(summary.totalCredits)],
      ["Net Outstanding", formatINR(summary.netOutstanding)],
    ],
    theme: "grid",
    styles: { fontSize: 9, cellPadding: 2 },
    headStyles: { fillColor: [30, 64, 175] },
    columnStyles: { 1: { halign: "right", fontStyle: "bold" } },
    tableWidth: 80,
  });

  const ledgerStartY = (doc as any).lastAutoTable?.finalY + 6 || y + 40;
  const typeLabel = (t: string) =>
    t === "invoice" ? "Invoice" : t === "payment" ? "Payment" : t === "tds" ? "TDS" : "Credit Note";

  const head = [activeCols.map(c => c.label).concat(lineItemsMap ? ["Item", "Qty", "Rate", "Amount"] : [])];
  const body: any[] = [];
  entries.forEach(e => {
    const r: Record<string, any> = {
      date: formatDate(e.date),
      type: typeLabel(e.type),
      refNo: e.refNo,
      description: e.description,
      debit: e.debit > 0 ? formatINR(e.debit) : "",
      credit: e.credit > 0 ? formatINR(e.credit) : "",
      runningBalance: formatINR(e.runningBalance),
      status: e.status,
    };
    const baseRow = activeCols.map(c => r[c.key]);
    if (lineItemsMap && e.type === "invoice") {
      const items = lineItemsMap.get(e.refNo) || [];
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
    startY: ledgerStartY,
    head,
    body,
    theme: "striped",
    styles: { fontSize: 8, cellPadding: 1.5 },
    headStyles: { fillColor: [30, 64, 175] },
  });

  if (outstanding.length > 0) {
    doc.addPage();
    doc.setFontSize(14);
    doc.text(`${clientName} — Outstanding Invoices`, 14, 16);
    autoTable(doc, {
      startY: 22,
      head: [["Invoice No", "Date", "Due Date", "Total", "Paid", "Credits", "Balance", "Overdue", "Status"]],
      body: outstanding.map(o => [
        o.invoiceNo,
        formatDate(o.invoiceDate),
        formatDate(o.dueDate),
        formatINR(o.totalAmount),
        formatINR(o.paidAmount),
        o.creditAmount > 0 ? formatINR(o.creditAmount) : "—",
        formatINR(o.balanceDue),
        o.overdueDays > 0 ? `${o.overdueDays}d` : "—",
        o.status,
      ]),
      theme: "striped",
      styles: { fontSize: 8, cellPadding: 1.5 },
      headStyles: { fillColor: [30, 64, 175] },
    });
  }

  doc.save(`${clientName.replace(/\s+/g, "_")}_Ledger.pdf`);
}
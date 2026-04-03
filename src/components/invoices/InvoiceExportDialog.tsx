import { useState, useEffect, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { FileSpreadsheet, FileText, AlertTriangle, Info } from "lucide-react";
import {
  ALL_INVOICE_COLUMNS,
  DEFAULT_INVOICE_EXPORT_KEYS,
  loadSavedColumnKeys,
  saveColumnKeys,
  exportInvoiceExcel,
} from "@/utils/exports/excel/exportInvoiceExcel";
import { exportInvoicePdf, type InvoicePdfBranding } from "@/utils/exports/pdf/exportInvoicePdf";
import {
  normalizeInvoices,
  checkReconciliation,
  EXPORT_TYPE_LABELS,
  type ExportType,
  type DateBasis,
} from "@/utils/exports/invoiceExportMapper";
import { toast } from "@/hooks/use-toast";

interface InvoiceExportDialogProps {
  open: boolean;
  onClose: () => void;
  invoices: any[];
  companyName?: string;
  branding?: InvoicePdfBranding;
  initialMode?: "excel" | "pdf";
}

const DEFAULT_GROUP = "Default Columns";
const OPTIONAL_GROUP = "Optional Columns";

const DATE_BASIS_OPTIONS: { value: DateBasis; label: string }[] = [
  { value: "invoice_date", label: "Invoice Date" },
  { value: "billing_period", label: "Billing Period" },
  { value: "due_date", label: "Due Date" },
];

const fmtINR = (n: number) =>
  `₹${n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export function InvoiceExportDialog({
  open,
  onClose,
  invoices,
  companyName,
  branding,
  initialMode = "excel",
}: InvoiceExportDialogProps) {
  const [selected, setSelected] = useState<string[]>(() => loadSavedColumnKeys("detailed"));
  const [exporting, setExporting] = useState(false);
  const [exportType, setExportType] = useState<ExportType>("detailed");
  const [dateBasis, setDateBasis] = useState<DateBasis>("invoice_date");

  // Reload column selection when dialog opens or export type changes
  useEffect(() => {
    if (open) setSelected(loadSavedColumnKeys(exportType));
  }, [open, exportType]);

  // Normalized preview data
  const normalized = useMemo(() => {
    if (!open) return [];
    return normalizeInvoices(invoices, companyName);
  }, [open, invoices, companyName]);

  const reconciliation = useMemo(() => checkReconciliation(normalized), [normalized]);

  // Preview totals
  const previewTotals = useMemo(() => {
    const taxable = normalized.reduce((s, r) => s + r.taxable_value, 0);
    const gst = normalized.reduce((s, r) => s + r.igst + r.cgst + r.sgst, 0);
    const grand = normalized.reduce((s, r) => s + r.total_value, 0);
    const balance = normalized.reduce((s, r) => s + r.balance_due, 0);
    return { taxable, gst, grand, balance };
  }, [normalized]);

  const isSummaryMode = exportType !== "detailed";
  const showDateBasis = exportType === "monthwise" || exportType === "quarterwise";

  const toggle = (key: string) => {
    setSelected((prev) => prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]);
  };
  const selectAll = () => setSelected(ALL_INVOICE_COLUMNS.map((c) => c.key));
  const clearAll = () => setSelected([]);
  const resetDefaults = () => setSelected(DEFAULT_INVOICE_EXPORT_KEYS);

  const doExport = async (format: "excel" | "pdf") => {
    if (!isSummaryMode && selected.length === 0) {
      toast({ title: "No Columns", description: "Select at least one column to export." });
      return;
    }
    saveColumnKeys(selected, exportType);
    setExporting(true);
    try {
      if (format === "excel") {
        await exportInvoiceExcel(invoices, selected, companyName, exportType, dateBasis);
        toast({ title: "Export Complete", description: "Excel file downloaded." });
      } else {
        const pdfBranding: InvoicePdfBranding = branding || { companyName: companyName || "Company" };
        await exportInvoicePdf(invoices, selected, pdfBranding, exportType, dateBasis);
        toast({ title: "Export Complete", description: "PDF report downloaded." });
      }
      onClose();
    } catch (err) {
      console.error("Export error:", err);
      toast({ title: "Export Failed", variant: "destructive" });
    } finally {
      setExporting(false);
    }
  };

  const defaultCols = ALL_INVOICE_COLUMNS.filter((c) => DEFAULT_INVOICE_EXPORT_KEYS.includes(c.key));
  const optionalCols = ALL_INVOICE_COLUMNS.filter((c) => !DEFAULT_INVOICE_EXPORT_KEYS.includes(c.key));

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-xl w-[95vw] sm:w-auto max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Export Invoices</DialogTitle>
        </DialogHeader>

        {/* Export Type Selector */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Export Type</label>
            <Select value={exportType} onValueChange={(v) => setExportType(v as ExportType)}>
              <SelectTrigger className="h-9 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(EXPORT_TYPE_LABELS).map(([key, label]) => (
                  <SelectItem key={key} value={key}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {showDateBasis && (
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Date Basis</label>
              <Select value={dateBasis} onValueChange={(v) => setDateBasis(v as DateBasis)}>
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DATE_BASIS_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        <Separator />

        {/* Summary Preview */}
        <div className="rounded-lg border bg-muted/30 p-3 space-y-1.5">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
            <Info className="h-3.5 w-3.5" />
            Export Preview
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
            <div>
              <span className="text-muted-foreground">Records:</span>{" "}
              <span className="font-semibold">{normalized.length}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Taxable:</span>{" "}
              <span className="font-semibold">{fmtINR(previewTotals.taxable)}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Grand Total:</span>{" "}
              <span className="font-semibold">{fmtINR(previewTotals.grand)}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Balance Due:</span>{" "}
              <span className="font-semibold">{fmtINR(previewTotals.balance)}</span>
            </div>
          </div>

          {reconciliation.hasWarning && (
            <div className="flex items-center gap-1.5 text-xs text-amber-600 mt-1">
              <AlertTriangle className="h-3.5 w-3.5" />
              {reconciliation.mismatchCount} row(s) have financial mismatch — please review source data.
            </div>
          )}
        </div>

        {/* Column Selection (for detailed mode only) */}
        {!isSummaryMode && (
          <>
            <div className="flex flex-wrap gap-2 mb-1">
              <Button variant="outline" size="sm" onClick={selectAll}>Select All</Button>
              <Button variant="outline" size="sm" onClick={clearAll}>Clear All</Button>
              <Button variant="outline" size="sm" onClick={resetDefaults}>Reset Defaults</Button>
              <Badge variant="secondary" className="ml-auto self-center">
                {selected.length} / {ALL_INVOICE_COLUMNS.length} columns
              </Badge>
            </div>

            <ScrollArea className="max-h-[280px] pr-2">
              <div className="mb-3">
                <h4 className="text-xs font-semibold text-muted-foreground mb-1.5">{DEFAULT_GROUP}</h4>
                <div className="grid grid-cols-2 gap-1">
                  {defaultCols.map((col) => (
                    <label key={col.key} className="flex items-center gap-2 text-sm cursor-pointer hover:bg-muted/50 rounded px-2 py-0.5">
                      <Checkbox checked={selected.includes(col.key)} onCheckedChange={() => toggle(col.key)} />
                      {col.label}
                    </label>
                  ))}
                </div>
              </div>
              <div className="mb-3">
                <h4 className="text-xs font-semibold text-muted-foreground mb-1.5">{OPTIONAL_GROUP}</h4>
                <div className="grid grid-cols-2 gap-1">
                  {optionalCols.map((col) => (
                    <label key={col.key} className="flex items-center gap-2 text-sm cursor-pointer hover:bg-muted/50 rounded px-2 py-0.5">
                      <Checkbox checked={selected.includes(col.key)} onCheckedChange={() => toggle(col.key)} />
                      {col.label}
                    </label>
                  ))}
                </div>
              </div>
            </ScrollArea>
          </>
        )}

        {isSummaryMode && (
          <div className="text-sm text-muted-foreground bg-muted/30 rounded-lg p-3">
            Summary exports use predefined financial columns optimized for {EXPORT_TYPE_LABELS[exportType].toLowerCase()}.
          </div>
        )}

        <DialogFooter className="flex-col sm:flex-row gap-2 sticky bottom-0 bg-background pt-3 pb-1 border-t">
          <Button
            variant={initialMode === "excel" ? "default" : "outline"}
            onClick={() => doExport("excel")}
            disabled={exporting}
            className="gap-2"
          >
            <FileSpreadsheet className="h-4 w-4" />
            Export Excel
          </Button>
          <Button
            variant={initialMode === "pdf" ? "default" : "outline"}
            onClick={() => doExport("pdf")}
            disabled={exporting}
            className="gap-2"
          >
            <FileText className="h-4 w-4" />
            Export PDF
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

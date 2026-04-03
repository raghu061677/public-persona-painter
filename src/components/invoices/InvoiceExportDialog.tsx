import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { FileSpreadsheet, FileText } from "lucide-react";
import {
  ALL_INVOICE_COLUMNS,
  DEFAULT_INVOICE_EXPORT_KEYS,
  loadSavedColumnKeys,
  saveColumnKeys,
  exportInvoiceExcel,
} from "@/utils/exports/excel/exportInvoiceExcel";
import { exportInvoicePdf, type InvoicePdfBranding } from "@/utils/exports/pdf/exportInvoicePdf";
import { toast } from "@/hooks/use-toast";

interface InvoiceExportDialogProps {
  open: boolean;
  onClose: () => void;
  invoices: any[];
  companyName?: string;
  /** Pass company branding for PDF header */
  branding?: InvoicePdfBranding;
  /** "excel" | "pdf" — which button opened the dialog */
  initialMode?: "excel" | "pdf";
}

const DEFAULT_GROUP = "Default Columns";
const OPTIONAL_GROUP = "Optional Columns";

export function InvoiceExportDialog({
  open,
  onClose,
  invoices,
  companyName,
  branding,
  initialMode = "excel",
}: InvoiceExportDialogProps) {
  const [selected, setSelected] = useState<string[]>(() => loadSavedColumnKeys());
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    if (open) setSelected(loadSavedColumnKeys());
  }, [open]);

  const toggle = (key: string) => {
    setSelected((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  };

  const selectAll = () => setSelected(ALL_INVOICE_COLUMNS.map((c) => c.key));
  const clearAll = () => setSelected([]);
  const resetDefaults = () => setSelected(DEFAULT_INVOICE_EXPORT_KEYS);

  const doExport = async (mode: "excel" | "pdf") => {
    if (selected.length === 0) {
      toast({ title: "No Columns", description: "Select at least one column to export." });
      return;
    }
    saveColumnKeys(selected);
    setExporting(true);
    try {
      if (mode === "excel") {
        await exportInvoiceExcel(invoices, selected, companyName);
        toast({ title: "Export Complete", description: "Invoice Excel downloaded." });
      } else {
        const pdfBranding: InvoicePdfBranding = branding || { companyName: companyName || "Company" };
        await exportInvoicePdf(invoices, selected, pdfBranding);
        toast({ title: "Export Complete", description: "Invoice PDF report downloaded." });
      }
      onClose();
    } catch (err) {
      console.error("Invoice export error:", err);
      toast({ title: "Export Failed", variant: "destructive" });
    } finally {
      setExporting(false);
    }
  };

  const defaultCols = ALL_INVOICE_COLUMNS.filter((c) => DEFAULT_INVOICE_EXPORT_KEYS.includes(c.key));
  const optionalCols = ALL_INVOICE_COLUMNS.filter((c) => !DEFAULT_INVOICE_EXPORT_KEYS.includes(c.key));
  const exportableCount = invoices.filter((i) => i.status !== "Draft" && i.status !== "Cancelled").length;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg w-[95vw] sm:w-auto max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Export Invoices</DialogTitle>
        </DialogHeader>

        <div className="flex flex-wrap gap-2 mb-3">
          <Button variant="outline" size="sm" onClick={selectAll}>Select All</Button>
          <Button variant="outline" size="sm" onClick={clearAll}>Clear All</Button>
          <Button variant="outline" size="sm" onClick={resetDefaults}>Reset Defaults</Button>
          <Badge variant="secondary" className="ml-auto self-center">
            {selected.length} / {ALL_INVOICE_COLUMNS.length} columns
          </Badge>
        </div>

        <div className="text-xs text-muted-foreground mb-2">
          {exportableCount} invoices will be exported (excluding Draft &amp; Cancelled)
        </div>

        <ScrollArea className="max-h-[380px] pr-2">
          <div className="mb-4">
            <h4 className="text-sm font-semibold text-muted-foreground mb-2">{DEFAULT_GROUP}</h4>
            <div className="grid grid-cols-2 gap-1.5">
              {defaultCols.map((col) => (
                <label
                  key={col.key}
                  className="flex items-center gap-2 text-sm cursor-pointer hover:bg-muted/50 rounded px-2 py-1"
                >
                  <Checkbox
                    checked={selected.includes(col.key)}
                    onCheckedChange={() => toggle(col.key)}
                  />
                  {col.label}
                </label>
              ))}
            </div>
          </div>
          <div className="mb-4">
            <h4 className="text-sm font-semibold text-muted-foreground mb-2">{OPTIONAL_GROUP}</h4>
            <div className="grid grid-cols-2 gap-1.5">
              {optionalCols.map((col) => (
                <label
                  key={col.key}
                  className="flex items-center gap-2 text-sm cursor-pointer hover:bg-muted/50 rounded px-2 py-1"
                >
                  <Checkbox
                    checked={selected.includes(col.key)}
                    onCheckedChange={() => toggle(col.key)}
                  />
                  {col.label}
                </label>
              ))}
            </div>
          </div>
        </ScrollArea>

        <DialogFooter className="flex-col sm:flex-row gap-2 sticky bottom-0 bg-background pt-3 pb-1 border-t">
          <Button
            variant={initialMode === "excel" ? "default" : "outline"}
            onClick={() => doExport("excel")}
            disabled={exporting}
            className="gap-2"
          >
            <FileSpreadsheet className="h-4 w-4" />
            Export Excel ({exportableCount})
          </Button>
          <Button
            variant={initialMode === "pdf" ? "default" : "outline"}
            onClick={() => doExport("pdf")}
            disabled={exporting}
            className="gap-2"
          >
            <FileText className="h-4 w-4" />
            Export PDF ({exportableCount})
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

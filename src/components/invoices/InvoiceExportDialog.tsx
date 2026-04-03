import { useState, useEffect, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  FileSpreadsheet, FileText, AlertTriangle, Info, Bookmark, BookmarkPlus, Trash2, Calendar,
} from "lucide-react";
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
  filterByPeriod,
  prefilterForExportType,
  isDetailedExportType,
  getPeriodLabel,
  EXPORT_TYPE_LABELS,
  EXPORT_TYPE_GROUPS,
  type ExportType,
  type DateBasis,
  type PeriodType,
  type PeriodConfig,
  type ExportPreset,
  loadExportPresets,
  saveExportPresets,
} from "@/utils/exports/invoiceExportMapper";
import { logExportAudit } from "@/utils/exports/exportAuditLogger";
import { toast } from "@/hooks/use-toast";

interface InvoiceExportDialogProps {
  open: boolean;
  onClose: () => void;
  invoices: any[];
  companyName?: string;
  branding?: InvoicePdfBranding;
  initialMode?: "excel" | "pdf";
}

const DATE_BASIS_OPTIONS: { value: DateBasis; label: string }[] = [
  { value: "invoice_date", label: "Invoice Date" },
  { value: "billing_period", label: "Billing Period" },
  { value: "due_date", label: "Due Date" },
];

const PERIOD_TYPE_OPTIONS: { value: PeriodType; label: string }[] = [
  { value: "current_view", label: "Current View" },
  { value: "exact_month", label: "Exact Invoice Month" },
  { value: "financial_quarter", label: "Financial Quarter" },
  { value: "financial_year", label: "Financial Year" },
  { value: "custom_range", label: "Custom Date Range" },
];

const FY_OPTIONS = (() => {
  const now = new Date();
  const startYear = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
  const results: { value: string; label: string }[] = [];
  for (let i = 0; i < 4; i++) {
    const y = startYear - i;
    const next = (y + 1).toString().slice(2);
    results.push({ value: `${y}-${next}`, label: `FY ${y}-${next}` });
  }
  return results;
})();

const MONTH_OPTIONS = (() => {
  const results: { value: string; label: string }[] = [];
  const now = new Date();
  for (let i = 0; i < 18; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    results.push({ value, label: `${months[d.getMonth()]} ${d.getFullYear()}` });
  }
  return results;
})();

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
  const [periodType, setPeriodType] = useState<PeriodType>("current_view");
  const [selectedMonth, setSelectedMonth] = useState(MONTH_OPTIONS[0]?.value || "");
  const [selectedQuarter, setSelectedQuarter] = useState("Q1");
  const [selectedFY, setSelectedFY] = useState(FY_OPTIONS[0]?.value || "");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [presets, setPresets] = useState<ExportPreset[]>([]);
  const [presetName, setPresetName] = useState("");
  const [showPresetSave, setShowPresetSave] = useState(false);

  useEffect(() => {
    if (open) {
      setSelected(loadSavedColumnKeys(exportType));
      setPresets(loadExportPresets());
    }
  }, [open, exportType]);

  const period: PeriodConfig = useMemo(() => {
    switch (periodType) {
      case "exact_month": return { type: "exact_month", month: selectedMonth };
      case "financial_quarter": return { type: "financial_quarter", quarter: selectedQuarter, fy: selectedFY };
      case "financial_year": return { type: "financial_year", fy: selectedFY };
      case "custom_range": return { type: "custom_range", dateFrom: customFrom, dateTo: customTo };
      default: return { type: "current_view" };
    }
  }, [periodType, selectedMonth, selectedQuarter, selectedFY, customFrom, customTo]);

  const periodLabel = useMemo(() => getPeriodLabel(period), [period]);

  // Normalized + period-filtered + type-filtered preview data
  const { previewData, reconciliation, previewTotals } = useMemo(() => {
    if (!open) return { previewData: [], reconciliation: { hasWarning: false, mismatchCount: 0, totalRecords: 0, taxableTotal: 0, totalTax: 0, igstTotal: 0, cgstTotal: 0, sgstTotal: 0, grossTotal: 0, paidTotal: 0, creditedTotal: 0, balanceDueTotal: 0, overdueTotal: 0 }, previewTotals: { taxable: 0, gst: 0, grand: 0, balance: 0 } };
    let data = normalizeInvoices(invoices, companyName);
    data = filterByPeriod(data, period, dateBasis);
    data = prefilterForExportType(data, exportType);
    const recon = checkReconciliation(data);
    return {
      previewData: data,
      reconciliation: recon,
      previewTotals: {
        taxable: recon.taxableTotal,
        gst: recon.totalTax,
        grand: recon.grossTotal,
        balance: recon.balanceDueTotal,
      },
    };
  }, [open, invoices, companyName, period, dateBasis, exportType]);

  const isDetailed = isDetailedExportType(exportType);

  const toggle = (key: string) => {
    setSelected((prev) => prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]);
  };
  const selectAll = () => setSelected(ALL_INVOICE_COLUMNS.map((c) => c.key));
  const clearAll = () => setSelected([]);
  const resetDefaults = () => setSelected(DEFAULT_INVOICE_EXPORT_KEYS);

  const applyPreset = (preset: ExportPreset) => {
    setExportType(preset.exportType);
    setDateBasis(preset.dateBasis);
    if (preset.columns.length > 0) setSelected(preset.columns);
    if (preset.period.type !== "current_view") {
      setPeriodType(preset.period.type);
      if (preset.period.month) setSelectedMonth(preset.period.month);
      if (preset.period.quarter) setSelectedQuarter(preset.period.quarter);
      if (preset.period.fy) setSelectedFY(preset.period.fy);
    }
    toast({ title: "Preset Applied", description: preset.name });
  };

  const handleSavePreset = () => {
    if (!presetName.trim()) return;
    const newPreset: ExportPreset = {
      id: `user_${Date.now()}`,
      name: presetName.trim(),
      exportType,
      dateBasis,
      period,
      columns: selected,
    };
    const updated = [...presets.filter(p => p.id !== newPreset.id), newPreset];
    saveExportPresets(updated);
    setPresets(updated);
    setPresetName("");
    setShowPresetSave(false);
    toast({ title: "Preset Saved", description: newPreset.name });
  };

  const handleDeletePreset = (id: string) => {
    const updated = presets.filter(p => p.id !== id);
    saveExportPresets(updated);
    setPresets(updated);
  };

  const doExport = async (fmt: "excel" | "pdf") => {
    if (isDetailed && selected.length === 0) {
      toast({ title: "No Columns", description: "Select at least one column to export." });
      return;
    }
    saveColumnKeys(selected, exportType);
    setExporting(true);
    try {
      if (fmt === "excel") {
        await exportInvoiceExcel(invoices, selected, companyName, exportType, dateBasis, period);
        toast({ title: "Export Complete", description: "Excel file downloaded." });
      } else {
        const pdfBranding: InvoicePdfBranding = branding || { companyName: companyName || "Company" };
        await exportInvoicePdf(invoices, selected, pdfBranding, exportType, dateBasis, period);
        toast({ title: "Export Complete", description: "PDF report downloaded." });
      }

      // Non-blocking audit log
      logExportAudit({
        exportFormat: fmt,
        exportType,
        dateBasis,
        selectedPeriod: periodLabel,
        recordCount: previewData.length,
        exportScope: "current_view",
      }).catch(() => {});

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
      <DialogContent className="max-w-2xl w-[95vw] sm:w-auto max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Export Invoices</DialogTitle>
        </DialogHeader>

        {/* Presets */}
        {presets.length > 0 && (
          <div className="space-y-1.5">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
              <Bookmark className="h-3.5 w-3.5" /> Saved Presets
            </div>
            <div className="flex flex-wrap gap-1.5">
              {presets.map((p) => (
                <div key={p.id} className="flex items-center gap-1">
                  <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => applyPreset(p)}>
                    {p.name}
                  </Button>
                  {p.id.startsWith("user_") && (
                    <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => handleDeletePreset(p.id)}>
                      <Trash2 className="h-3 w-3 text-destructive" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Export Type Selector - grouped */}
        <div className="space-y-2">
          <label className="text-xs font-medium text-muted-foreground block">Export Type</label>
          <Select value={exportType} onValueChange={(v) => setExportType(v as ExportType)}>
            <SelectTrigger className="h-9 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(EXPORT_TYPE_GROUPS).map(([group, types]) => (
                <div key={group}>
                  <div className="px-2 py-1 text-xs font-semibold text-muted-foreground">{group}</div>
                  {types.map((t) => (
                    <SelectItem key={t} value={t}>{EXPORT_TYPE_LABELS[t]}</SelectItem>
                  ))}
                </div>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Date Basis + Period */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Date Basis</label>
            <Select value={dateBasis} onValueChange={(v) => setDateBasis(v as DateBasis)}>
              <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                {DATE_BASIS_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Period</label>
            <Select value={periodType} onValueChange={(v) => setPeriodType(v as PeriodType)}>
              <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                {PERIOD_TYPE_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Period-specific selectors */}
        {periodType === "exact_month" && (
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">
              <Calendar className="h-3.5 w-3.5 inline mr-1" />Invoice Month
            </label>
            <Select value={selectedMonth} onValueChange={setSelectedMonth}>
              <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                {MONTH_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {periodType === "financial_quarter" && (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Quarter</label>
              <Select value={selectedQuarter} onValueChange={setSelectedQuarter}>
                <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Q1">Q1 (Apr-Jun)</SelectItem>
                  <SelectItem value="Q2">Q2 (Jul-Sep)</SelectItem>
                  <SelectItem value="Q3">Q3 (Oct-Dec)</SelectItem>
                  <SelectItem value="Q4">Q4 (Jan-Mar)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Financial Year</label>
              <Select value={selectedFY} onValueChange={setSelectedFY}>
                <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {FY_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        )}

        {periodType === "financial_year" && (
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Financial Year</label>
            <Select value={selectedFY} onValueChange={setSelectedFY}>
              <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                {FY_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {periodType === "custom_range" && (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">From</Label>
              <Input type="date" value={customFrom} onChange={(e) => setCustomFrom(e.target.value)} className="h-9 text-sm" />
            </div>
            <div>
              <Label className="text-xs">To</Label>
              <Input type="date" value={customTo} onChange={(e) => setCustomTo(e.target.value)} className="h-9 text-sm" />
            </div>
          </div>
        )}

        <Separator />

        {/* Summary Preview */}
        <div className="rounded-lg border bg-muted/30 p-3 space-y-1.5">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
            <Info className="h-3.5 w-3.5" />
            Export Preview
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
            <div><span className="text-muted-foreground">Type:</span>{" "}<span className="font-semibold">{EXPORT_TYPE_LABELS[exportType]}</span></div>
            <div><span className="text-muted-foreground">Records:</span>{" "}<span className="font-semibold">{previewData.length}</span></div>
            <div><span className="text-muted-foreground">Taxable:</span>{" "}<span className="font-semibold">{fmtINR(previewTotals.taxable)}</span></div>
            <div><span className="text-muted-foreground">Grand Total:</span>{" "}<span className="font-semibold">{fmtINR(previewTotals.grand)}</span></div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
            <div><span className="text-muted-foreground">GST:</span>{" "}<span className="font-semibold">{fmtINR(previewTotals.gst)}</span></div>
            <div><span className="text-muted-foreground">Balance Due:</span>{" "}<span className="font-semibold">{fmtINR(previewTotals.balance)}</span></div>
            {periodLabel !== "Current View" && (
              <div className="col-span-2"><span className="text-muted-foreground">Period:</span>{" "}<span className="font-semibold">{periodLabel}</span></div>
            )}
          </div>

          {reconciliation.hasWarning && (
            <div className="flex items-center gap-1.5 text-xs text-amber-600 mt-1">
              <AlertTriangle className="h-3.5 w-3.5" />
              {reconciliation.mismatchCount} row(s) have financial mismatch — please review source data.
            </div>
          )}
        </div>

        {/* Column Selection (for detailed modes) */}
        {isDetailed && (
          <>
            <div className="flex flex-wrap gap-2 mb-1">
              <Button variant="outline" size="sm" onClick={selectAll}>Select All</Button>
              <Button variant="outline" size="sm" onClick={clearAll}>Clear All</Button>
              <Button variant="outline" size="sm" onClick={resetDefaults}>Reset Defaults</Button>
              <Badge variant="secondary" className="ml-auto self-center">
                {selected.length} / {ALL_INVOICE_COLUMNS.length} columns
              </Badge>
            </div>

            <ScrollArea className="max-h-[220px] pr-2">
              <div className="mb-3">
                <h4 className="text-xs font-semibold text-muted-foreground mb-1.5">Default Columns</h4>
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
                <h4 className="text-xs font-semibold text-muted-foreground mb-1.5">Optional Columns</h4>
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

        {!isDetailed && (
          <div className="text-sm text-muted-foreground bg-muted/30 rounded-lg p-3">
            Summary exports use predefined financial columns optimized for {EXPORT_TYPE_LABELS[exportType].toLowerCase()}.
          </div>
        )}

        {/* Save Preset */}
        <div className="flex items-center gap-2">
          {showPresetSave ? (
            <div className="flex gap-2 flex-1">
              <Input
                placeholder="Preset name..."
                value={presetName}
                onChange={(e) => setPresetName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSavePreset()}
                className="h-8 text-sm flex-1"
              />
              <Button size="sm" onClick={handleSavePreset} className="h-8">Save</Button>
              <Button size="sm" variant="ghost" onClick={() => setShowPresetSave(false)} className="h-8">Cancel</Button>
            </div>
          ) : (
            <Button variant="outline" size="sm" onClick={() => setShowPresetSave(true)} className="gap-1.5 h-8">
              <BookmarkPlus className="h-3.5 w-3.5" /> Save as Preset
            </Button>
          )}
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2 sticky bottom-0 bg-background pt-3 pb-1 border-t">
          <Button
            variant={initialMode === "excel" ? "default" : "outline"}
            onClick={() => doExport("excel")}
            disabled={exporting}
            className="gap-2"
          >
            <FileSpreadsheet className="h-4 w-4" />
            {exporting ? "Exporting..." : "Export Excel"}
          </Button>
          <Button
            variant={initialMode === "pdf" ? "default" : "outline"}
            onClick={() => doExport("pdf")}
            disabled={exporting}
            className="gap-2"
          >
            <FileText className="h-4 w-4" />
            {exporting ? "Exporting..." : "Export PDF"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Download, FileSpreadsheet, FileText, Loader2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { GSTExportContext, exportXlsx, exportCsv } from "@/lib/gst-exports";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface Props {
  exportContext: GSTExportContext | null;
  hasBlockingIssues: boolean;
}

const EXPORTS = [
  { type: "monthly_summary", name: "GST Monthly Summary", desc: "Complete monthly GST summary with tax breakup, credit note impact, state-wise and HSN summary", view: "gst_monthly_summary_v", formats: ["XLSX", "CSV"], countKey: null },
  { type: "b2b", name: "GST B2B Register", desc: "B2B outward supplies register with GSTIN, place of supply, and tax details", view: "gst_b2b_v", formats: ["XLSX", "CSV"], countKey: "b2b" },
  { type: "b2c", name: "GST B2C Summary", desc: "B2C outward supplies with place of supply breakdown", view: "gst_b2c_v", formats: ["XLSX", "CSV"], countKey: "b2c" },
  { type: "credit_notes", name: "GST Credit Notes Register", desc: "Issued credit note register with original invoice linkage", view: "gst_credit_note_register_v", formats: ["XLSX", "CSV"], countKey: "creditNotes" },
  { type: "hsn", name: "GST HSN/SAC Summary", desc: "HSN/SAC wise summary of outward supplies", view: "gst_hsn_summary_v", formats: ["XLSX", "CSV"], countKey: "hsn" },
  { type: "invoice_register", name: "GST Invoice Register Detailed", desc: "Detailed invoice register for auditor review", view: "gst_invoice_register_v", formats: ["XLSX", "CSV"], countKey: "invoiceRegister" },
  { type: "validation", name: "GST Validation Report", desc: "Pre-filing validation report with issues and suggested fixes", view: "gst_validation_v", formats: ["XLSX", "CSV"], countKey: "validation" },
  { type: "statewise", name: "GST State-wise Summary", desc: "State-wise outward supply summary", view: "gst_statewise_summary_v", formats: ["XLSX", "CSV"], countKey: "statewise" },
];

export function GSTExportsTab({ exportContext, hasBlockingIssues }: Props) {
  const [loadingKey, setLoadingKey] = useState<string | null>(null);
  const [showWarning, setShowWarning] = useState(false);
  const [pendingExport, setPendingExport] = useState<{ type: string; format: string } | null>(null);

  const getCount = (countKey: string | null): number | null => {
    if (!countKey || !exportContext) return null;
    const data = (exportContext as any)[countKey];
    if (Array.isArray(data)) return data.length;
    if (countKey === "monthly_summary") return exportContext.summary ? 1 : 0;
    return null;
  };

  const handleExport = async (type: string, format: string) => {
    if (!exportContext) {
      toast.error("No data available for export");
      return;
    }
    if (hasBlockingIssues && !pendingExport) {
      setPendingExport({ type, format });
      setShowWarning(true);
      return;
    }

    const key = `${type}-${format}`;
    setLoadingKey(key);
    try {
      if (format === "XLSX") {
        await exportXlsx(exportContext, type);
      } else {
        exportCsv(exportContext, type);
      }
      toast.success(`${format} export downloaded`);
    } catch (err: any) {
      console.error("Export error:", err);
      toast.error(`Export failed: ${err.message || "Unknown error"}`);
    } finally {
      setLoadingKey(null);
      setPendingExport(null);
    }
  };

  const handleWarningConfirm = () => {
    setShowWarning(false);
    if (pendingExport) {
      handleExport(pendingExport.type, pendingExport.format);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-2 bg-muted/50 rounded-lg p-3">
        <FileText className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
        <p className="text-xs text-muted-foreground">
          Export files are generated from the same SQL views displayed in the dashboard tabs. All exports are company-scoped and filtered by the selected filing period.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {EXPORTS.map((exp) => {
          const count = getCount(exp.countKey);
          return (
            <Card key={exp.type} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-sm font-medium">{exp.name}</CardTitle>
                    <CardDescription className="text-xs mt-1">{exp.desc}</CardDescription>
                  </div>
                  <FileSpreadsheet className="h-5 w-5 text-muted-foreground shrink-0" />
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-[10px] text-muted-foreground font-mono">{exp.view}</span>
                  {count !== null && (
                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                      {count} {count === 1 ? "row" : "rows"}
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="flex items-center justify-between">
                  <div className="flex gap-1.5">
                    {exp.formats.map((f) => (
                      <Badge key={f} variant="outline" className="text-xs">{f}</Badge>
                    ))}
                  </div>
                  <div className="flex gap-1.5">
                    {exp.formats.map((f) => {
                      const key = `${exp.type}-${f}`;
                      const isLoading = loadingKey === key;
                      return (
                        <Button
                          key={f}
                          variant="outline"
                          size="sm"
                          className="text-xs"
                          disabled={isLoading || !exportContext}
                          onClick={() => handleExport(exp.type, f)}
                        >
                          {isLoading ? (
                            <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
                          ) : (
                            <Download className="h-3.5 w-3.5 mr-1" />
                          )}
                          {f}
                        </Button>
                      );
                    })}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <AlertDialog open={showWarning} onOpenChange={setShowWarning}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Blocking Validation Issues
            </AlertDialogTitle>
            <AlertDialogDescription>
              This period has blocking GST validation issues. You can still export for review, but filing should not proceed until issues are resolved.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setPendingExport(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleWarningConfirm}>Export Anyway</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

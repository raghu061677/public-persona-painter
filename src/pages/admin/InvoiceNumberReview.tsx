import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/contexts/CompanyContext";
import { ModuleGuard } from "@/components/rbac/ModuleGuard";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertTriangle, CheckCircle2, Search, Shield, FileWarning, Eye } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { formatDate } from "@/utils/plans";
import { getFinancialYear } from "@/utils/finance";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Textarea } from "@/components/ui/textarea";

interface InvoiceRow {
  id: string;
  invoice_date: string;
  client_name: string;
  total_amount: number;
  status: string;
  gst_rate: number | null;
  series: "INV" | "INV-Z";
  fy_label: string;
  seq_number: number;
  anomaly?: string;
  suggested_id?: string;
  conflict?: boolean;
}

function parseInvoiceId(id: string): { series: "INV" | "INV-Z"; fy: string; seq: number } | null {
  // INV/2025-26/0054 or INV-Z/2025-26/0008
  const match = id.match(/^(INV-Z|INV)\/(\d{4}-\d{2})\/(\d+)$/);
  if (!match) return null;
  return { series: match[1] as "INV" | "INV-Z", fy: match[2], seq: parseInt(match[3], 10) };
}

function getFYFromDate(dateStr: string): string {
  const d = new Date(dateStr);
  return getFinancialYear(d);
}

export default function InvoiceNumberReview() {
  const { company } = useCompany();
  const [invoices, setInvoices] = useState<InvoiceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [seriesFilter, setSeriesFilter] = useState<"all" | "INV" | "INV-Z">("all");
  const [confirmDialog, setConfirmDialog] = useState<{ invoice: InvoiceRow; reason: string } | null>(null);
  const [correctionReason, setCorrectionReason] = useState("");
  const [applying, setApplying] = useState(false);
  const [auditLog, setAuditLog] = useState<any[]>([]);

  useEffect(() => {
    if (company?.id) {
      loadInvoices();
      loadAuditLog();
    }
  }, [company?.id]);

  const loadInvoices = async () => {
    if (!company?.id) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("invoices")
      .select("id, invoice_date, client_name, total_amount, status, gst_rate")
      .eq("company_id", company.id)
      .not("id", "like", "DRAFT-%")
      .order("invoice_date", { ascending: true });

    if (error) {
      toast({ title: "Error", description: "Failed to load invoices", variant: "destructive" });
      setLoading(false);
      return;
    }

    // Parse and analyze
    const allIds = new Set((data || []).map((i: any) => i.id));
    const rows: InvoiceRow[] = (data || []).map((inv: any) => {
      const parsed = parseInvoiceId(inv.id);
      const expectedFY = inv.invoice_date ? getFYFromDate(inv.invoice_date) : "";
      
      let anomaly: string | undefined;
      let suggestedId: string | undefined;
      
      if (!parsed) {
        anomaly = "Unparseable invoice ID format";
      } else {
        // Check FY mismatch
        if (expectedFY && parsed.fy !== expectedFY) {
          anomaly = `FY mismatch: ID says ${parsed.fy}, date suggests ${expectedFY}`;
        }
        // Check GST rate vs prefix mismatch
        const effectiveGst = inv.gst_rate ?? 0;
        if (effectiveGst === 0 && parsed.series === "INV") {
          anomaly = (anomaly ? anomaly + "; " : "") + "0% GST but uses INV/ prefix (should be INV-Z/)";
        } else if (effectiveGst > 0 && parsed.series === "INV-Z") {
          anomaly = (anomaly ? anomaly + "; " : "") + `${effectiveGst}% GST but uses INV-Z/ prefix (should be INV/)`;
        }
      }

      return {
        id: inv.id,
        invoice_date: inv.invoice_date,
        client_name: inv.client_name,
        total_amount: inv.total_amount,
        status: inv.status,
        gst_rate: inv.gst_rate,
        series: parsed?.series || (inv.id?.startsWith("INV-Z") ? "INV-Z" : "INV"),
        fy_label: parsed?.fy || "",
        seq_number: parsed?.seq || 0,
        anomaly,
      };
    });

    setInvoices(rows);
    setLoading(false);
  };

  const loadAuditLog = async () => {
    if (!company?.id) return;
    const { data } = await supabase
      .from("finance_corrections_log")
      .select("*")
      .eq("company_id", company.id)
      .eq("entity_type", "invoice")
      .order("performed_at", { ascending: false })
      .limit(50);
    setAuditLog(data || []);
  };

  const filtered = useMemo(() => {
    if (seriesFilter === "all") return invoices;
    return invoices.filter((i) => i.series === seriesFilter);
  }, [invoices, seriesFilter]);

  const anomalies = useMemo(() => filtered.filter((i) => i.anomaly), [filtered]);

  // Sequence gap detection per series + FY
  const sequenceGaps = useMemo(() => {
    const groups: Record<string, number[]> = {};
    invoices.forEach((inv) => {
      if (!inv.fy_label || !inv.seq_number) return;
      const key = `${inv.series}/${inv.fy_label}`;
      if (!groups[key]) groups[key] = [];
      groups[key].push(inv.seq_number);
    });

    const gaps: { series: string; fy: string; missing: number[] }[] = [];
    Object.entries(groups).forEach(([key, seqs]) => {
      const [series, fy] = key.split("/");
      const sorted = [...new Set(seqs)].sort((a, b) => a - b);
      const max = sorted[sorted.length - 1];
      const missing: number[] = [];
      for (let i = 1; i <= max; i++) {
        if (!sorted.includes(i)) missing.push(i);
      }
      if (missing.length > 0) {
        gaps.push({ series, fy, missing });
      }
    });
    return gaps;
  }, [invoices]);

  const stats = useMemo(() => ({
    total: filtered.length,
    invCount: invoices.filter((i) => i.series === "INV").length,
    invZCount: invoices.filter((i) => i.series === "INV-Z").length,
    anomalyCount: anomalies.length,
    gapCount: sequenceGaps.reduce((s, g) => s + g.missing.length, 0),
  }), [filtered, invoices, anomalies, sequenceGaps]);

  // Placeholder: actual correction would be done here
  const handleConfirmCorrection = async () => {
    if (!confirmDialog || !company?.id) return;
    setApplying(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      // Log the correction intent (preview/dry-run logging)
      await supabase.from("finance_corrections_log").insert({
        company_id: company.id,
        action_type: "invoice_number_correction",
        entity_type: "invoice",
        entity_id: confirmDialog.invoice.id,
        old_value: { invoice_id: confirmDialog.invoice.id, anomaly: confirmDialog.invoice.anomaly },
        new_value: { reviewed: true, action: "flagged_for_review" },
        reason: correctionReason || "Admin review flagged",
        status: "applied",
        performed_by: user?.id,
      } as any);

      toast({ title: "Logged", description: "Invoice anomaly has been logged for review." });
      setCorrectionReason("");
      setConfirmDialog(null);
      loadAuditLog();
    } catch (err) {
      toast({ title: "Error", description: "Failed to log correction", variant: "destructive" });
    } finally {
      setApplying(false);
    }
  };

  return (
    <ModuleGuard module="finance">
      <div className="container mx-auto px-4 py-6 space-y-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Shield className="h-6 w-6 text-primary" />
            Invoice Number Review Tool
          </h1>
          <p className="text-muted-foreground mt-1">
            Admin-only tool to identify numbering anomalies, FY mismatches, and series conflicts.
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
          <Card>
            <CardContent className="pt-4 pb-3">
              <div className="text-xs text-muted-foreground">Total Invoices</div>
              <div className="text-2xl font-bold">{stats.total}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-3">
              <div className="text-xs text-muted-foreground">INV/ (Tax 18%)</div>
              <div className="text-2xl font-bold text-primary">{stats.invCount}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-3">
              <div className="text-xs text-muted-foreground">INV-Z/ (Zero %)</div>
              <div className="text-2xl font-bold text-amber-600">{stats.invZCount}</div>
            </CardContent>
          </Card>
          <Card className="border-destructive/30">
            <CardContent className="pt-4 pb-3">
              <div className="text-xs text-muted-foreground">Anomalies</div>
              <div className="text-2xl font-bold text-destructive">{stats.anomalyCount}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-3">
              <div className="text-xs text-muted-foreground">Sequence Gaps</div>
              <div className="text-2xl font-bold text-amber-600">{stats.gapCount}</div>
            </CardContent>
          </Card>
        </div>

        {/* Sequence Gaps */}
        {sequenceGaps.length > 0 && (
          <Card className="border-amber-500/30">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <FileWarning className="h-4 w-4 text-amber-600" />
                Sequence Gaps Detected
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {sequenceGaps.map((g, i) => (
                  <div key={i} className="text-sm">
                    <Badge variant="outline" className="mr-2">{g.series}/{g.fy}</Badge>
                    Missing: {g.missing.map(n => String(n).padStart(4, "0")).join(", ")}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Filter */}
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium">Series:</span>
          <Select value={seriesFilter} onValueChange={(v) => setSeriesFilter(v as any)}>
            <SelectTrigger className="w-[200px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Series</SelectItem>
              <SelectItem value="INV">INV/ (Tax Invoice 18%)</SelectItem>
              <SelectItem value="INV-Z">INV-Z/ (Zero % GST)</SelectItem>
            </SelectContent>
          </Select>
          <Badge variant="secondary">{anomalies.length} anomalies in view</Badge>
        </div>

        {/* Anomalies Table */}
        {anomalies.length > 0 && (
          <Card className="border-destructive/20">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-destructive" />
                Invoices with Anomalies ({anomalies.length})
              </CardTitle>
              <CardDescription>Review each anomaly before taking any action. No bulk operations allowed.</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Invoice ID</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Client</TableHead>
                    <TableHead>Series</TableHead>
                    <TableHead>FY</TableHead>
                    <TableHead>GST %</TableHead>
                    <TableHead>Anomaly</TableHead>
                    <TableHead>Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {anomalies.map((inv) => (
                    <TableRow key={inv.id} className="bg-destructive/5">
                      <TableCell className="font-mono text-sm">{inv.id}</TableCell>
                      <TableCell>{formatDate(inv.invoice_date)}</TableCell>
                      <TableCell>{inv.client_name}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{inv.series}</Badge>
                      </TableCell>
                      <TableCell>{inv.fy_label}</TableCell>
                      <TableCell>{inv.gst_rate ?? 0}%</TableCell>
                      <TableCell className="text-destructive text-sm max-w-[300px]">{inv.anomaly}</TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setCorrectionReason("");
                            setConfirmDialog({ invoice: inv, reason: "" });
                          }}
                        >
                          <Eye className="h-3 w-3 mr-1" />
                          Review
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        {anomalies.length === 0 && !loading && (
          <Card>
            <CardContent className="py-8 text-center">
              <CheckCircle2 className="h-8 w-8 text-green-500 mx-auto mb-2" />
              <p className="text-muted-foreground">No anomalies detected in the {seriesFilter === "all" ? "current" : seriesFilter} series.</p>
            </CardContent>
          </Card>
        )}

        {/* Audit Trail */}
        {auditLog.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Correction Audit Trail</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Invoice</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {auditLog.map((log: any) => (
                    <TableRow key={log.id}>
                      <TableCell>{formatDate(log.performed_at)}</TableCell>
                      <TableCell className="font-mono text-sm">{log.entity_id}</TableCell>
                      <TableCell>{log.action_type}</TableCell>
                      <TableCell className="max-w-[200px] truncate">{log.reason}</TableCell>
                      <TableCell>
                        <Badge variant={log.status === "applied" ? "default" : "secondary"}>{log.status}</Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        {/* Confirmation Dialog */}
        <AlertDialog open={!!confirmDialog} onOpenChange={(open) => !open && setConfirmDialog(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Review Invoice Anomaly</AlertDialogTitle>
              <AlertDialogDescription asChild>
                <div className="space-y-3">
                  <div className="bg-muted p-3 rounded-lg text-sm space-y-1">
                    <div><strong>Invoice:</strong> {confirmDialog?.invoice.id}</div>
                    <div><strong>Client:</strong> {confirmDialog?.invoice.client_name}</div>
                    <div><strong>Date:</strong> {confirmDialog?.invoice.invoice_date}</div>
                    <div><strong>GST Rate:</strong> {confirmDialog?.invoice.gst_rate ?? 0}%</div>
                    <div className="text-destructive"><strong>Anomaly:</strong> {confirmDialog?.invoice.anomaly}</div>
                  </div>
                  <div className="border border-amber-500/30 bg-amber-50 p-3 rounded-lg text-sm">
                    <strong>What this does:</strong> Logs this anomaly as "reviewed" in the correction audit trail.
                    No changes will be made to the invoice number or data.
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-medium">Reason / Notes:</label>
                    <Textarea
                      value={correctionReason}
                      onChange={(e) => setCorrectionReason(e.target.value)}
                      placeholder="Add notes about this anomaly..."
                    />
                  </div>
                </div>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleConfirmCorrection} disabled={applying}>
                {applying ? "Logging..." : "Confirm Review"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </ModuleGuard>
  );
}

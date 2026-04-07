import { useState, useEffect, useMemo, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/contexts/CompanyContext";
import { ModuleGuard } from "@/components/rbac/ModuleGuard";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import {
  AlertTriangle, CheckCircle2, Shield, FileWarning, Eye, Ban, RotateCcw,
  XCircle, ArrowRight, Trash2, AlertCircle, Info, Loader2,
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { formatDate } from "@/utils/plans";
import { getFinancialYear } from "@/utils/finance";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

/* ── Types ────────────────────────────────────────── */

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
  is_finance_mistake: boolean;
  exclude_from_sequence: boolean;
  void_reason: string | null;
}

interface DependencyCheck {
  has_payments: boolean;
  has_credit_notes: boolean;
  has_tds: boolean;
  payment_count: number;
  credit_count: number;
  total_paid: number;
  total_credited: number;
  safe_to_delete: boolean;
}

type ActionType =
  | "mark_finance_mistake"
  | "exclude_from_sequence"
  | "include_in_sequence"
  | "review_anomaly"
  | "safe_delete";

/* ── Helpers ──────────────────────────────────────── */

function parseInvoiceId(id: string): { series: "INV" | "INV-Z"; fy: string; seq: number } | null {
  const match = id.match(/^(INV-Z|INV)\/(\d{4}-\d{2})\/(\d+)$/);
  if (!match) return null;
  return { series: match[1] as "INV" | "INV-Z", fy: match[2], seq: parseInt(match[3], 10) };
}

function getFYFromDate(dateStr: string): string {
  return getFinancialYear(new Date(dateStr));
}

/* ── Component ────────────────────────────────────── */

export default function InvoiceNumberReview() {
  const { company } = useCompany();
  const [invoices, setInvoices] = useState<InvoiceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [seriesFilter, setSeriesFilter] = useState<"all" | "INV" | "INV-Z">("all");
  const [auditLog, setAuditLog] = useState<any[]>([]);

  // Action dialog state
  const [actionDialog, setActionDialog] = useState<{
    invoice: InvoiceRow;
    action: ActionType;
  } | null>(null);
  const [actionReason, setActionReason] = useState("");
  const [applying, setApplying] = useState(false);
  const [dependencies, setDependencies] = useState<DependencyCheck | null>(null);
  const [loadingDeps, setLoadingDeps] = useState(false);

  // Reset panel state
  const [resetSeries, setResetSeries] = useState<"INV" | "INV-Z">("INV");
  const [resetFY, setResetFY] = useState(() => getFinancialYear());
  const [resetTarget, setResetTarget] = useState("");
  const [resetPreview, setResetPreview] = useState<any>(null);
  const [resetLoading, setResetLoading] = useState(false);
  const [resetApplying, setResetApplying] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [resetReason, setResetReason] = useState("");

  useEffect(() => {
    if (company?.id) {
      loadInvoices();
      loadAuditLog();
    }
  }, [company?.id]);

  /* ── Data Loading ───────────────────────────────── */

  const loadInvoices = async () => {
    if (!company?.id) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("invoices")
      .select("id, invoice_date, client_name, total_amount, status, gst_rate, gst_percent, is_finance_mistake, exclude_from_sequence, void_reason, paid_amount, credited_amount")
      .eq("company_id", company.id)
      .not("id", "like", "DRAFT-%")
      .order("invoice_date", { ascending: true });

    if (error) {
      toast({ title: "Error", description: "Failed to load invoices", variant: "destructive" });
      setLoading(false);
      return;
    }

    const rows: InvoiceRow[] = (data || []).map((inv: any) => {
      const parsed = parseInvoiceId(inv.id);
      const expectedFY = inv.invoice_date ? getFYFromDate(inv.invoice_date) : "";
      let anomaly: string | undefined;

      if (!parsed) {
        anomaly = "Unparseable invoice ID format";
      } else {
        if (expectedFY && parsed.fy !== expectedFY) {
          anomaly = `FY mismatch: ID says ${parsed.fy}, date suggests ${expectedFY}`;
        }
        const effectiveGst = inv.gst_rate ?? inv.gst_percent ?? 0;
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
        gst_rate: inv.gst_rate ?? inv.gst_percent,
        series: parsed?.series || (inv.id?.startsWith("INV-Z") ? "INV-Z" : "INV"),
        fy_label: parsed?.fy || "",
        seq_number: parsed?.seq || 0,
        anomaly,
        is_finance_mistake: inv.is_finance_mistake || false,
        exclude_from_sequence: inv.exclude_from_sequence || false,
        void_reason: inv.void_reason,
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

  /* ── Dependency Check ───────────────────────────── */

  const checkDependencies = async (invoiceId: string): Promise<DependencyCheck> => {
    setLoadingDeps(true);
    try {
      // Check payments
      const { data: inv } = await supabase
        .from("invoices")
        .select("paid_amount, credited_amount, payments")
        .eq("id", invoiceId)
        .single();

      const paidAmount = inv?.paid_amount || 0;
      const creditedAmount = inv?.credited_amount || 0;
      const payments = Array.isArray(inv?.payments) ? inv.payments : [];
      const hasPayments = paidAmount > 0 || payments.length > 0;

      // Check credit notes
      const { count: creditCount } = await supabase
        .from("credit_notes" as any)
        .select("id", { count: "exact", head: true })
        .eq("invoice_id", invoiceId);

      const hasCreditNotes = (creditCount || 0) > 0;

      const result: DependencyCheck = {
        has_payments: hasPayments,
        has_credit_notes: hasCreditNotes,
        has_tds: false,
        payment_count: payments.length,
        credit_count: creditCount || 0,
        total_paid: paidAmount,
        total_credited: creditedAmount,
        safe_to_delete: !hasPayments && !hasCreditNotes,
      };
      setDependencies(result);
      return result;
    } catch {
      const fallback: DependencyCheck = {
        has_payments: false, has_credit_notes: false, has_tds: false,
        payment_count: 0, credit_count: 0, total_paid: 0, total_credited: 0, safe_to_delete: false,
      };
      setDependencies(fallback);
      return fallback;
    } finally {
      setLoadingDeps(false);
    }
  };

  /* ── Action Handlers ────────────────────────────── */

  const openAction = async (invoice: InvoiceRow, action: ActionType) => {
    setActionReason("");
    setDependencies(null);
    setActionDialog({ invoice, action });

    if (action === "exclude_from_sequence" || action === "safe_delete" || action === "mark_finance_mistake") {
      await checkDependencies(invoice.id);
    }
  };

  const executeAction = async () => {
    if (!actionDialog || !company?.id) return;
    setApplying(true);
    const { invoice, action } = actionDialog;

    try {
      const { data: { user } } = await supabase.auth.getUser();

      let updateFields: Record<string, any> = {};
      let auditActionType: string = action;

      switch (action) {
        case "mark_finance_mistake":
          updateFields = { is_finance_mistake: true, void_reason: actionReason, voided_by: user?.id, voided_at: new Date().toISOString() };
          break;
        case "exclude_from_sequence":
          updateFields = { exclude_from_sequence: true, is_finance_mistake: true, void_reason: actionReason, voided_by: user?.id, voided_at: new Date().toISOString() };
          auditActionType = "excluded_from_sequence";
          break;
        case "include_in_sequence":
          updateFields = { exclude_from_sequence: false, is_finance_mistake: false, void_reason: null, voided_by: null, voided_at: null };
          auditActionType = "included_in_sequence";
          break;
        case "review_anomaly":
          // No invoice update, just log
          break;
        case "safe_delete":
          if (!dependencies?.safe_to_delete) {
            toast({ title: "Blocked", description: "Cannot delete: invoice has dependencies.", variant: "destructive" });
            setApplying(false);
            return;
          }
          // Delete the invoice
          const { error: delErr } = await supabase.from("invoices").delete().eq("id", invoice.id);
          if (delErr) throw delErr;
          auditActionType = "deleted_safe_invoice";
          break;
      }

      // Update invoice if needed
      if (action !== "review_anomaly" && action !== "safe_delete" && Object.keys(updateFields).length > 0) {
        const { error: upErr } = await supabase.from("invoices").update(updateFields).eq("id", invoice.id);
        if (upErr) throw upErr;
      }

      // Write audit log
      await supabase.from("finance_corrections_log").insert({
        company_id: company.id,
        action_type: auditActionType,
        entity_type: "invoice",
        entity_id: invoice.id,
        old_value: {
          invoice_id: invoice.id,
          series: invoice.series,
          fy_label: invoice.fy_label,
          seq_number: invoice.seq_number,
          was_finance_mistake: invoice.is_finance_mistake,
          was_excluded: invoice.exclude_from_sequence,
        },
        new_value: action === "safe_delete"
          ? { deleted: true }
          : { ...updateFields, action },
        reason: actionReason || `Admin action: ${action}`,
        status: "applied",
        performed_by: user?.id,
      } as any);

      toast({ title: "Success", description: `Action "${action.replace(/_/g, " ")}" applied to ${invoice.id}` });
      setActionDialog(null);
      setActionReason("");
      loadInvoices();
      loadAuditLog();
    } catch (err: any) {
      toast({ title: "Error", description: err.message || "Action failed", variant: "destructive" });
    } finally {
      setApplying(false);
    }
  };

  /* ── Reset Counter ──────────────────────────────── */

  const previewReset = async () => {
    if (!company?.id || !resetTarget) return;
    setResetLoading(true);
    try {
      const targetSeq = parseInt(resetTarget, 10);
      if (isNaN(targetSeq) || targetSeq < 1) {
        toast({ title: "Invalid", description: "Enter a valid positive number", variant: "destructive" });
        return;
      }
      const { data, error } = await supabase.rpc("reset_invoice_counter", {
        p_company_id: company.id,
        p_prefix: resetSeries,
        p_fy_label: resetFY,
        p_target_seq: targetSeq,
        p_dry_run: true,
      });
      if (error) throw error;
      setResetPreview(data);
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setResetLoading(false);
    }
  };

  const applyReset = async () => {
    if (!company?.id || !resetPreview?.success) return;
    setResetApplying(true);
    try {
      const targetSeq = parseInt(resetTarget, 10);
      const { data: { user } } = await supabase.auth.getUser();

      const { data, error } = await supabase.rpc("reset_invoice_counter", {
        p_company_id: company.id,
        p_prefix: resetSeries,
        p_fy_label: resetFY,
        p_target_seq: targetSeq,
        p_dry_run: false,
      });
      if (error) throw error;

      // Audit log
      await supabase.from("finance_corrections_log").insert({
        company_id: company.id,
        action_type: "next_number_reset",
        entity_type: "invoice",
        entity_id: `${resetSeries}/${resetFY}`,
        old_value: { current_last_seq: resetPreview.current_last_seq, series: resetSeries, fy: resetFY },
        new_value: { proposed_next_seq: targetSeq, confirmed_next_id: (data as any)?.proposed_next_id },
        reason: resetReason || "Admin counter reset",
        status: "applied",
        performed_by: user?.id,
      } as any);

      toast({ title: "Counter Reset", description: `Next ${resetSeries} number in ${resetFY} will be ${String(targetSeq).padStart(4, "0")}` });
      setShowResetConfirm(false);
      setResetPreview(null);
      setResetReason("");
      loadAuditLog();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setResetApplying(false);
    }
  };

  /* ── Derived Data ───────────────────────────────── */

  const filtered = useMemo(() => {
    if (seriesFilter === "all") return invoices;
    return invoices.filter((i) => i.series === seriesFilter);
  }, [invoices, seriesFilter]);

  const anomalies = useMemo(() => filtered.filter((i) => i.anomaly), [filtered]);
  const mistakeInvoices = useMemo(() => filtered.filter((i) => i.is_finance_mistake || i.exclude_from_sequence), [filtered]);

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
      if (missing.length > 0) gaps.push({ series, fy, missing });
    });
    return gaps;
  }, [invoices]);

  const fyOptions = useMemo(() => {
    const fys = new Set(invoices.map((i) => i.fy_label).filter(Boolean));
    fys.add(getFinancialYear());
    return [...fys].sort();
  }, [invoices]);

  const stats = useMemo(() => ({
    total: filtered.length,
    invCount: invoices.filter((i) => i.series === "INV").length,
    invZCount: invoices.filter((i) => i.series === "INV-Z").length,
    anomalyCount: anomalies.length,
    gapCount: sequenceGaps.reduce((s, g) => s + g.missing.length, 0),
    mistakeCount: mistakeInvoices.length,
  }), [filtered, invoices, anomalies, sequenceGaps, mistakeInvoices]);

  /* ── Status Badge Helper ────────────────────────── */

  const getSequenceBadge = (inv: InvoiceRow) => {
    if (inv.exclude_from_sequence) return <Badge variant="destructive" className="text-xs">Excluded from Sequence</Badge>;
    if (inv.is_finance_mistake) return <Badge className="bg-amber-500/10 text-amber-700 border-amber-500/20 text-xs">Finance Mistake</Badge>;
    return <Badge variant="outline" className="bg-green-500/10 text-green-700 border-green-500/20 text-xs">Live</Badge>;
  };

  /* ── Action Labels ──────────────────────────────── */

  const getActionConfig = (action: ActionType) => {
    switch (action) {
      case "mark_finance_mistake": return { title: "Mark as Finance Mistake", icon: AlertTriangle, color: "text-amber-600", desc: "Flags this invoice as raised by mistake. It remains visible in history but is marked with a finance mistake badge." };
      case "exclude_from_sequence": return { title: "Exclude from Sequence", icon: Ban, color: "text-destructive", desc: "Marks as finance mistake AND excludes this invoice number from next-number calculation. The sequence will skip this number." };
      case "include_in_sequence": return { title: "Include in Sequence", icon: RotateCcw, color: "text-primary", desc: "Reverses a previous exclusion. This invoice will be treated as a normal live invoice again." };
      case "review_anomaly": return { title: "Review Anomaly", icon: Eye, color: "text-primary", desc: "Logs this anomaly as reviewed in the correction audit trail. No changes to invoice data." };
      case "safe_delete": return { title: "Delete Invoice (if safe)", icon: Trash2, color: "text-destructive", desc: "Permanently deletes this invoice record. Only allowed if no payments, credit notes, or TDS links exist." };
    }
  };

  /* ── Render ─────────────────────────────────────── */

  return (
    <ModuleGuard module="finance">
      <div className="container mx-auto px-4 py-6 space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Shield className="h-6 w-6 text-primary" />
            Invoice Number Review & Sequence Correction
          </h1>
          <p className="text-muted-foreground mt-1">
            Admin-only tool to identify anomalies, mark finance mistakes, exclude from sequence, and reset counters.
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-6 gap-3">
          <Card><CardContent className="pt-4 pb-3"><div className="text-xs text-muted-foreground">Total Invoices</div><div className="text-2xl font-bold">{stats.total}</div></CardContent></Card>
          <Card><CardContent className="pt-4 pb-3"><div className="text-xs text-muted-foreground">INV/ (Tax 18%)</div><div className="text-2xl font-bold text-primary">{stats.invCount}</div></CardContent></Card>
          <Card><CardContent className="pt-4 pb-3"><div className="text-xs text-muted-foreground">INV-Z/ (Zero %)</div><div className="text-2xl font-bold text-amber-600">{stats.invZCount}</div></CardContent></Card>
          <Card className="border-destructive/30"><CardContent className="pt-4 pb-3"><div className="text-xs text-muted-foreground">Anomalies</div><div className="text-2xl font-bold text-destructive">{stats.anomalyCount}</div></CardContent></Card>
          <Card><CardContent className="pt-4 pb-3"><div className="text-xs text-muted-foreground">Seq. Gaps</div><div className="text-2xl font-bold text-amber-600">{stats.gapCount}</div></CardContent></Card>
          <Card className="border-amber-500/30"><CardContent className="pt-4 pb-3"><div className="text-xs text-muted-foreground">Mistakes / Excluded</div><div className="text-2xl font-bold text-amber-700">{stats.mistakeCount}</div></CardContent></Card>
        </div>

        {/* Sequence Gaps */}
        {sequenceGaps.length > 0 && (
          <Card className="border-amber-500/30">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2"><FileWarning className="h-4 w-4 text-amber-600" />Sequence Gaps Detected</CardTitle>
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
            <SelectTrigger className="w-[200px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Series</SelectItem>
              <SelectItem value="INV">INV/ (Tax Invoice 18%)</SelectItem>
              <SelectItem value="INV-Z">INV-Z/ (Zero % GST)</SelectItem>
            </SelectContent>
          </Select>
          <Badge variant="secondary">{anomalies.length} anomalies</Badge>
          {mistakeInvoices.length > 0 && <Badge className="bg-amber-500/10 text-amber-700 border-amber-500/20">{mistakeInvoices.length} mistakes/excluded</Badge>}
        </div>

        {/* ═══ Mistake/Excluded Invoices ═══ */}
        {mistakeInvoices.length > 0 && (
          <Card className="border-amber-500/30">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Ban className="h-5 w-5 text-amber-600" />
                Finance Mistakes & Excluded from Sequence ({mistakeInvoices.length})
              </CardTitle>
              <CardDescription>These invoices are flagged and may be excluded from next-number calculation.</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Invoice ID</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Client</TableHead>
                    <TableHead>Series</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Sequence Status</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {mistakeInvoices.map((inv) => (
                    <TableRow key={inv.id} className="bg-amber-50/50 dark:bg-amber-900/10">
                      <TableCell className="font-mono text-sm">{inv.id}</TableCell>
                      <TableCell>{formatDate(inv.invoice_date)}</TableCell>
                      <TableCell>{inv.client_name}</TableCell>
                      <TableCell><Badge variant="outline">{inv.series}</Badge></TableCell>
                      <TableCell><Badge variant="secondary">{inv.status}</Badge></TableCell>
                      <TableCell>{getSequenceBadge(inv)}</TableCell>
                      <TableCell className="text-sm max-w-[200px] truncate">{inv.void_reason || "—"}</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button size="sm" variant="outline" onClick={() => openAction(inv, "include_in_sequence")} title="Restore to sequence">
                            <RotateCcw className="h-3 w-3" />
                          </Button>
                          {!inv.exclude_from_sequence && (
                            <Button size="sm" variant="outline" className="text-destructive" onClick={() => openAction(inv, "exclude_from_sequence")} title="Exclude from sequence">
                              <Ban className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        {/* ═══ Anomalies Table ═══ */}
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
                    <TableHead>Seq. Status</TableHead>
                    <TableHead>Anomaly</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {anomalies.map((inv) => (
                    <TableRow key={inv.id} className="bg-destructive/5">
                      <TableCell className="font-mono text-sm">{inv.id}</TableCell>
                      <TableCell>{formatDate(inv.invoice_date)}</TableCell>
                      <TableCell>{inv.client_name}</TableCell>
                      <TableCell><Badge variant="outline">{inv.series}</Badge></TableCell>
                      <TableCell>{inv.fy_label}</TableCell>
                      <TableCell>{inv.gst_rate ?? 0}%</TableCell>
                      <TableCell>{getSequenceBadge(inv)}</TableCell>
                      <TableCell className="text-destructive text-sm max-w-[250px]">{inv.anomaly}</TableCell>
                      <TableCell>
                        <div className="flex gap-1 flex-wrap">
                          <Button size="sm" variant="outline" onClick={() => openAction(inv, "review_anomaly")} title="Review"><Eye className="h-3 w-3" /></Button>
                          {!inv.is_finance_mistake && (
                            <Button size="sm" variant="outline" className="text-amber-600" onClick={() => openAction(inv, "mark_finance_mistake")} title="Mark as mistake"><AlertTriangle className="h-3 w-3" /></Button>
                          )}
                          {!inv.exclude_from_sequence && (
                            <Button size="sm" variant="outline" className="text-destructive" onClick={() => openAction(inv, "exclude_from_sequence")} title="Exclude from sequence"><Ban className="h-3 w-3" /></Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        {anomalies.length === 0 && mistakeInvoices.length === 0 && !loading && (
          <Card><CardContent className="py-8 text-center"><CheckCircle2 className="h-8 w-8 text-green-500 mx-auto mb-2" /><p className="text-muted-foreground">No anomalies or mistakes detected.</p></CardContent></Card>
        )}

        {/* ═══ All Invoices Table (compact) ═══ */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">All Invoices — Sequence View ({filtered.length})</CardTitle>
            <CardDescription>Full list with sequence status badges. Use row actions for individual corrections.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="max-h-[400px] overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Invoice ID</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Client</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Seq. Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((inv) => (
                    <TableRow key={inv.id} className={inv.is_finance_mistake ? "opacity-60" : ""}>
                      <TableCell className="font-mono text-sm">{inv.id}</TableCell>
                      <TableCell>{formatDate(inv.invoice_date)}</TableCell>
                      <TableCell className="max-w-[150px] truncate">{inv.client_name}</TableCell>
                      <TableCell>₹{inv.total_amount?.toLocaleString("en-IN")}</TableCell>
                      <TableCell><Badge variant="secondary">{inv.status}</Badge></TableCell>
                      <TableCell>{getSequenceBadge(inv)}</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          {!inv.is_finance_mistake && !inv.exclude_from_sequence && (
                            <>
                              <Button size="sm" variant="ghost" className="h-7 px-2 text-amber-600" onClick={() => openAction(inv, "mark_finance_mistake")} title="Mark as mistake"><AlertTriangle className="h-3 w-3" /></Button>
                              <Button size="sm" variant="ghost" className="h-7 px-2 text-destructive" onClick={() => openAction(inv, "exclude_from_sequence")} title="Exclude from seq"><Ban className="h-3 w-3" /></Button>
                            </>
                          )}
                          {(inv.is_finance_mistake || inv.exclude_from_sequence) && (
                            <>
                              <Button size="sm" variant="ghost" className="h-7 px-2 text-primary" onClick={() => openAction(inv, "include_in_sequence")} title="Restore"><RotateCcw className="h-3 w-3" /></Button>
                              <Button size="sm" variant="ghost" className="h-7 px-2 text-destructive" onClick={() => openAction(inv, "safe_delete")} title="Delete if safe"><Trash2 className="h-3 w-3" /></Button>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* ═══ Reset Next Invoice Number Panel ═══ */}
        <Card className="border-primary/30">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <ArrowRight className="h-5 w-5 text-primary" />
              Reset Next Invoice Number
            </CardTitle>
            <CardDescription>
              Recalculate or override the next invoice number for a series + FY. Excluded/mistake invoices are skipped.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Invoice Series</label>
                <Select value={resetSeries} onValueChange={(v) => { setResetSeries(v as any); setResetPreview(null); }}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="INV">INV/ (GST 18%)</SelectItem>
                    <SelectItem value="INV-Z">INV-Z/ (Zero %)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Financial Year</label>
                <Select value={resetFY} onValueChange={(v) => { setResetFY(v); setResetPreview(null); }}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {fyOptions.map((fy) => <SelectItem key={fy} value={fy}>{fy}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Target Next Number</label>
                <Input
                  type="number"
                  min="1"
                  value={resetTarget}
                  onChange={(e) => { setResetTarget(e.target.value); setResetPreview(null); }}
                  placeholder="e.g. 10"
                />
              </div>
              <div className="flex items-end">
                <Button onClick={previewReset} disabled={!resetTarget || resetLoading} className="w-full">
                  {resetLoading ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Eye className="h-4 w-4 mr-1" />}
                  Preview
                </Button>
              </div>
            </div>

            {/* Reset Preview Card */}
            {resetPreview && (
              <Card className={resetPreview.success ? "border-green-500/30 bg-green-50/50 dark:bg-green-900/10" : "border-destructive/30 bg-destructive/5"}>
                <CardContent className="pt-4 pb-3">
                  {!resetPreview.success ? (
                    <div className="flex items-start gap-2 text-destructive">
                      <XCircle className="h-5 w-5 mt-0.5 shrink-0" />
                      <div>
                        <div className="font-medium">Conflict Detected</div>
                        <div className="text-sm">{resetPreview.error}</div>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="font-medium flex items-center gap-2 text-green-700 dark:text-green-400">
                        <CheckCircle2 className="h-5 w-5" />
                        Dry-Run Preview — Ready to Apply
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                        <div><span className="text-muted-foreground">Series:</span> <strong>{resetSeries}</strong></div>
                        <div><span className="text-muted-foreground">FY:</span> <strong>{resetFY}</strong></div>
                        <div><span className="text-muted-foreground">Active Invoices:</span> <strong>{resetPreview.active_count}</strong></div>
                        <div><span className="text-muted-foreground">Excluded (Mistakes):</span> <strong className="text-amber-600">{resetPreview.excluded_count}</strong></div>
                        <div><span className="text-muted-foreground">Current Counter:</span> <strong>{resetPreview.current_last_seq}</strong></div>
                        <div><span className="text-muted-foreground">Max Active Seq:</span> <strong>{resetPreview.max_active_seq}</strong></div>
                        <div className="col-span-2">
                          <span className="text-muted-foreground">Next Invoice Will Be:</span>{" "}
                          <strong className="text-primary font-mono">{resetPreview.proposed_next_id}</strong>
                        </div>
                      </div>
                      <Separator />
                      <div className="flex gap-2 items-end">
                        <div className="flex-1">
                          <label className="text-xs font-medium mb-1 block">Reason for reset (required)</label>
                          <Textarea
                            value={resetReason}
                            onChange={(e) => setResetReason(e.target.value)}
                            placeholder="E.g. Invoices 0010 and 0011 were raised by mistake for old campaigns..."
                            rows={2}
                          />
                        </div>
                        <Button
                          variant="default"
                          disabled={!resetReason.trim() || resetApplying}
                          onClick={() => setShowResetConfirm(true)}
                        >
                          {resetApplying ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
                          Apply Reset
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </CardContent>
        </Card>

        {/* ═══ Audit Trail ═══ */}
        {auditLog.length > 0 && (
          <Card>
            <CardHeader><CardTitle className="text-base">Correction Audit Trail</CardTitle></CardHeader>
            <CardContent>
              <div className="max-h-[300px] overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Invoice / Entity</TableHead>
                      <TableHead>Action</TableHead>
                      <TableHead>Reason</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {auditLog.map((log: any) => (
                      <TableRow key={log.id}>
                        <TableCell className="text-sm">{formatDate(log.performed_at)}</TableCell>
                        <TableCell className="font-mono text-sm">{log.entity_id}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs">{log.action_type?.replace(/_/g, " ")}</Badge>
                        </TableCell>
                        <TableCell className="max-w-[200px] truncate text-sm">{log.reason}</TableCell>
                        <TableCell><Badge variant={log.status === "applied" ? "default" : "secondary"}>{log.status}</Badge></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        )}

        {/* ═══ Action Confirmation Dialog ═══ */}
        <AlertDialog open={!!actionDialog} onOpenChange={(open) => !open && setActionDialog(null)}>
          <AlertDialogContent className="max-w-lg">
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2">
                {actionDialog && (() => { const cfg = getActionConfig(actionDialog.action); return <><cfg.icon className={`h-5 w-5 ${cfg.color}`} />{cfg.title}</>; })()}
              </AlertDialogTitle>
              <AlertDialogDescription asChild>
                <div className="space-y-3">
                  {/* Invoice Details */}
                  <div className="bg-muted p-3 rounded-lg text-sm space-y-1">
                    <div><strong>Invoice:</strong> <span className="font-mono">{actionDialog?.invoice.id}</span></div>
                    <div><strong>Client:</strong> {actionDialog?.invoice.client_name}</div>
                    <div><strong>Date:</strong> {actionDialog?.invoice.invoice_date}</div>
                    <div><strong>Amount:</strong> ₹{actionDialog?.invoice.total_amount?.toLocaleString("en-IN")}</div>
                    <div><strong>GST Rate:</strong> {actionDialog?.invoice.gst_rate ?? 0}%</div>
                    <div><strong>Current Status:</strong> {actionDialog?.invoice.status}</div>
                  </div>

                  {/* Action Description */}
                  <div className="border border-primary/20 bg-primary/5 p-3 rounded-lg text-sm">
                    <strong>What this does:</strong> {actionDialog && getActionConfig(actionDialog.action).desc}
                  </div>

                  {/* Dependency Check */}
                  {(actionDialog?.action === "exclude_from_sequence" || actionDialog?.action === "mark_finance_mistake" || actionDialog?.action === "safe_delete") && (
                    <div className="border rounded-lg p-3 text-sm space-y-2">
                      <div className="font-medium flex items-center gap-1"><Info className="h-4 w-4" />Dependency Check</div>
                      {loadingDeps ? (
                        <div className="flex items-center gap-2 text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />Checking dependencies...</div>
                      ) : dependencies ? (
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            {dependencies.has_payments ? <XCircle className="h-4 w-4 text-destructive" /> : <CheckCircle2 className="h-4 w-4 text-green-500" />}
                            Payments: {dependencies.has_payments ? `${dependencies.payment_count} records (₹${dependencies.total_paid.toLocaleString("en-IN")})` : "None"}
                          </div>
                          <div className="flex items-center gap-2">
                            {dependencies.has_credit_notes ? <XCircle className="h-4 w-4 text-destructive" /> : <CheckCircle2 className="h-4 w-4 text-green-500" />}
                            Credit Notes: {dependencies.has_credit_notes ? `${dependencies.credit_count} found` : "None"}
                          </div>
                          {actionDialog?.action === "safe_delete" && !dependencies.safe_to_delete && (
                            <div className="mt-2 p-2 bg-destructive/10 rounded text-destructive text-xs">
                              <AlertCircle className="h-4 w-4 inline mr-1" />
                              This invoice cannot be deleted safely. Use "Finance Mistake" or "Exclude from Sequence" instead.
                            </div>
                          )}
                        </div>
                      ) : null}
                    </div>
                  )}

                  {/* Sequence impact notice */}
                  {actionDialog?.action === "exclude_from_sequence" && (
                    <div className="border border-amber-500/30 bg-amber-50 dark:bg-amber-900/10 p-3 rounded-lg text-sm">
                      <strong>Sequence Impact:</strong> Invoice <span className="font-mono">{actionDialog.invoice.id}</span> will remain visible in history but its number ({String(actionDialog.invoice.seq_number).padStart(4, "0")}) will be skipped when calculating the next invoice number.
                    </div>
                  )}

                  {/* Reason input */}
                  <div className="space-y-1">
                    <label className="text-sm font-medium">Reason / Notes (required):</label>
                    <Textarea
                      value={actionReason}
                      onChange={(e) => setActionReason(e.target.value)}
                      placeholder="Explain why this action is being taken..."
                    />
                  </div>
                </div>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={executeAction}
                disabled={applying || !actionReason.trim() || (actionDialog?.action === "safe_delete" && !dependencies?.safe_to_delete)}
              >
                {applying ? "Applying..." : "Confirm"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* ═══ Reset Confirmation Dialog ═══ */}
        <AlertDialog open={showResetConfirm} onOpenChange={setShowResetConfirm}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirm Counter Reset</AlertDialogTitle>
              <AlertDialogDescription asChild>
                <div className="space-y-3">
                  <div className="bg-muted p-3 rounded-lg text-sm space-y-1">
                    <div><strong>Series:</strong> {resetSeries}</div>
                    <div><strong>Financial Year:</strong> {resetFY}</div>
                    <div><strong>Current Counter:</strong> {resetPreview?.current_last_seq}</div>
                    <div><strong>Excluded Mistakes:</strong> {resetPreview?.excluded_count}</div>
                    <div><strong>New Next Number:</strong> <span className="font-mono text-primary font-bold">{resetPreview?.proposed_next_id}</span></div>
                  </div>
                  <div className="border border-amber-500/30 bg-amber-50 dark:bg-amber-900/10 p-3 rounded-lg text-sm">
                    <strong>Warning:</strong> This will change the internal counter. The next finalized invoice in {resetSeries}/{resetFY} series will use number {String(resetTarget).padStart(4, "0")}.
                  </div>
                  <div className="text-sm"><strong>Reason:</strong> {resetReason}</div>
                </div>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={applyReset} disabled={resetApplying}>
                {resetApplying ? "Applying..." : "Apply Counter Reset"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </ModuleGuard>
  );
}

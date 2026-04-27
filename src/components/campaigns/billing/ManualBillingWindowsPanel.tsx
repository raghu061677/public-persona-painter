import { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { format, parseISO, differenceInCalendarDays, addDays, isAfter, isBefore } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Loader2, Plus, FileText, Trash2, AlertTriangle, Info, Pencil, RotateCcw } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { formatCurrency } from "@/utils/mediaAssets";
import { generateDraftInvoiceId } from "@/utils/finance";
import { buildRegistrationSnapshot } from "@/utils/invoiceRegistrationSnapshot";
import { logActivity } from "@/utils/activityLogger";
import type { CampaignTotalsResult } from "@/utils/computeCampaignTotals";

// 30-day commercial basis (industry standard for OOH)
const COMMERCIAL_DAYS_PER_MONTH = 30;

interface ManualWindowInvoice {
  id: string;
  invoice_no?: string | null;
  invoice_period_start: string | null;
  invoice_period_end: string | null;
  total_amount: number;
  sub_total: number | null;
  gst_amount: number | null;
  status: string;
  due_date: string | null;
  billing_window_key: string | null;
}

interface Props {
  campaign: {
    id: string;
    campaign_name: string;
    client_id: string;
    client_name: string;
    company_id?: string;
    start_date: string;
    end_date: string;
    tax_type?: string;
  };
  totals: CampaignTotalsResult;
  gstMode: "CGST_SGST" | "IGST";
  invoices: ManualWindowInvoice[]; // pre-filtered to billing_mode='manual_window'
  locked: boolean; // disabled when another billing mode already finalized
  onChanged: () => void;
}

/**
 * Manual Billing Windows panel.
 * Storage: each manual window is persisted as a draft invoice with
 * billing_mode='manual_window' and billing_window_key='manual_<startISO>_<endISO>'.
 * No new schema required — the invoices table already supports billing_mode.
 */
export function ManualBillingWindowsPanel({
  campaign,
  totals,
  gstMode,
  invoices,
  locked,
  onChanged,
}: Props) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  // Inline edit dialog state for draft windows
  const [editTarget, setEditTarget] = useState<ManualWindowInvoice | null>(null);
  const [editStart, setEditStart] = useState("");
  const [editEnd, setEditEnd] = useState("");
  const [editSaving, setEditSaving] = useState(false);

  // Phase 3 — table sort state (display-only, does not mutate data)
  type SortKey = "start" | "end" | "status";
  type SortDir = "asc" | "desc";
  const [sortKey, setSortKey] = useState<SortKey>("start");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir(key === "status" ? "asc" : "asc");
    }
  };

  // Sorted view — pure display layer over `invoices` prop.
  const sortedInvoices = useMemo(() => {
    const STATUS_ORDER: Record<string, number> = {
      Draft: 0,
      Sent: 1,
      Partial: 2,
      "Partially Paid": 2,
      Overdue: 3,
      Paid: 4,
      Issued: 5,
      Cancelled: 6,
    };
    const arr = [...invoices];
    arr.sort((a, b) => {
      let cmp = 0;
      if (sortKey === "start") {
        cmp = (a.invoice_period_start || "").localeCompare(b.invoice_period_start || "");
      } else if (sortKey === "end") {
        cmp = (a.invoice_period_end || "").localeCompare(b.invoice_period_end || "");
      } else {
        const ai = STATUS_ORDER[a.status] ?? 99;
        const bi = STATUS_ORDER[b.status] ?? 99;
        cmp = ai - bi;
      }
      return sortDir === "asc" ? cmp : -cmp;
    });
    return arr;
  }, [invoices, sortKey, sortDir]);

  // Phase 5 — Inline validation messages for edit dialog (overlap / bounds).
  const editErrors = useMemo(() => {
    if (!editTarget || !editStart || !editEnd) return null;
    const errs: { bounds?: string; overlap?: string; range?: string } = {};
    const s = parseISO(editStart);
    const e = parseISO(editEnd);
    const cs = parseISO(campaign.start_date);
    const ce = parseISO(campaign.end_date);
    if (isAfter(s, e)) {
      errs.range = "End date must be on or after start date.";
    }
    if (isBefore(s, cs) || isAfter(e, ce)) {
      errs.bounds = `Date range must stay within the campaign period: ${format(cs, "dd MMM yyyy")} – ${format(ce, "dd MMM yyyy")}.`;
    }
    const overlap = invoices
      .filter(
        (inv) =>
          inv.id !== editTarget.id &&
          inv.status !== "Cancelled" &&
          inv.invoice_period_start &&
          inv.invoice_period_end,
      )
      .find((inv) => {
        const iS = parseISO(inv.invoice_period_start!);
        const iE = parseISO(inv.invoice_period_end!);
        return !(isAfter(s, iE) || isBefore(e, iS));
      });
    if (overlap) {
      errs.overlap = `This date range overlaps an existing manual invoice window: ${format(parseISO(overlap.invoice_period_start!), "dd MMM yyyy")} – ${format(parseISO(overlap.invoice_period_end!), "dd MMM yyyy")} (${overlap.invoice_no || overlap.id}, ${overlap.status}).`;
    }
    return errs;
  }, [editTarget, editStart, editEnd, invoices, campaign.start_date, campaign.end_date]);
  const hasEditErrors = !!editErrors && (editErrors.bounds || editErrors.overlap || editErrors.range);

  // Per-day rate (30-day commercial basis)
  // monthlyAgreed comes from computeCampaignTotals.monthlyDisplayRent.
  const monthlyAgreed = totals.monthlyDisplayRent || 0;
  const perDayRate = useMemo(
    () => Math.round(((monthlyAgreed / COMMERCIAL_DAYS_PER_MONTH) || 0) * 100) / 100,
    [monthlyAgreed],
  );

  // Reset dialog inputs each time it opens; default to next uncovered date.
  useEffect(() => {
    if (!open) return;
    // Phase 4 — Suggest next uncovered, non-overlapping range, capped to 30 days.
    const suggestion = suggestNextWindow(campaign, invoices);
    setStartDate(suggestion.start);
    setEndDate(suggestion.end);
  }, [open, campaign, invoices]);

  // Live preview computation for the Add dialog
  const preview = useMemo(() => {
    return computePreview({
      startDate,
      endDate,
      campaign,
      invoices,
      perDayRate,
      gstRate: totals.gstRate,
    });
  }, [startDate, endDate, invoices, perDayRate, totals.gstRate, campaign]);

  // Detect cancelled twin to surface number-reuse hint in the dialog
  const cancelledTwin = useMemo(
    () => (startDate && endDate ? findCancelledTwin(invoices, startDate, endDate) : null),
    [startDate, endDate, invoices],
  );

  // Live preview for inline edit
  const editPreview = useMemo(() => {
    if (!editTarget) return null;
    return computePreview({
      startDate: editStart,
      endDate: editEnd,
      campaign,
      invoices,
      perDayRate,
      gstRate: totals.gstRate,
      excludeId: editTarget.id,
    });
  }, [editTarget, editStart, editEnd, invoices, perDayRate, totals.gstRate, campaign]);

  // Coverage analysis: show uninvoiced gaps
  const coverage = useMemo(
    () => analyzeCoverage(campaign, invoices),
    [campaign, invoices],
  );

  const handleCreate = async () => {
    if (!preview || "error" in preview) return;
    setSubmitting(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error("Not authenticated");

      const regSnapshot = await buildRegistrationSnapshot(campaign.id);
      // Phase 2 — Reuse cancelled invoice number when regenerating the EXACT
      // same manual window for this campaign. Falls back to a fresh draft id.
      const reuseTwin = findCancelledTwin(invoices, startDate, endDate);
      let invoiceId = generateDraftInvoiceId();
      let reusedFromCancelled = false;
      if (reuseTwin) {
        const candidate = (reuseTwin.invoice_no || reuseTwin.id || "").trim();
        if (candidate) {
          // Defensive: ensure no other non-cancelled invoice owns this number.
          const { data: clash } = await supabase
            .from("invoices")
            .select("id, status")
            .or(`id.eq.${candidate},invoice_no.eq.${candidate}`)
            .neq("status", "Cancelled")
            .limit(1);
          if (!clash || clash.length === 0) {
            invoiceId = candidate;
            reusedFromCancelled = true;
          }
        }
      }
      const isIGST = gstMode === "IGST";
      const gstHalf = totals.gstRate / 2;

      const dueDate = addDays(parseISO(startDate), 30);

      const items = [
        {
          sno: 1,
          description: `Display rent (${preview.days} day${preview.days === 1 ? "" : "s"} @ ${formatCurrency(perDayRate)}/day, 30-day basis)`,
          quantity: preview.days,
          rate: perDayRate,
          amount: preview.taxable,
          total: preview.taxable,
          hsn_sac: "998361",
          charge_type: "manual_window_rent",
        },
      ];

      // If reusing a cancelled number, hard-delete the cancelled record first
      // so the unique key (id / invoice_no) is free for the new draft. This is
      // safe — cancelled invoices carry no live receivable and are excluded
      // from GSTR exports.
      if (reusedFromCancelled && reuseTwin) {
        const { error: delErr } = await supabase
          .from("invoices")
          .delete()
          .eq("id", reuseTwin.id)
          .eq("status", "Cancelled");
        if (delErr) throw delErr;
      }

      const { error } = await supabase.from("invoices").insert({
        id: invoiceId,
        invoice_no: invoiceId,
        campaign_id: campaign.id,
        client_id: campaign.client_id,
        client_name: campaign.client_name,
        company_id: campaign.company_id,
        invoice_date: startDate,
        due_date: format(dueDate, "yyyy-MM-dd"),
        invoice_period_start: startDate,
        invoice_period_end: endDate,
        billing_mode: "manual_window",
        billing_window_key: `manual_${startDate}_${endDate}`,
        is_monthly_split: false,
        sub_total: preview.taxable,
        gst_percent: totals.gstRate,
        gst_amount: preview.gst,
        total_amount: preview.grand,
        balance_due: preview.grand,
        tax_type: isIGST ? "igst" : "cgst_sgst",
        gst_mode: gstMode,
        cgst_percent: isIGST ? 0 : gstHalf,
        sgst_percent: isIGST ? 0 : gstHalf,
        igst_percent: isIGST ? totals.gstRate : 0,
        cgst_amount: isIGST ? 0 : preview.gst / 2,
        sgst_amount: isIGST ? 0 : preview.gst / 2,
        igst_amount: isIGST ? preview.gst : 0,
        status: "Draft",
        is_draft: true,
        items,
        notes:
          `Manual billing window for ${campaign.campaign_name} (${format(parseISO(startDate), "dd MMM yyyy")} – ${format(parseISO(endDate), "dd MMM yyyy")})` +
          (reusedFromCancelled
            ? `\n[Regenerated — reusing cancelled invoice number ${invoiceId}]`
            : ""),
        created_by: userData.user.id,
        ...regSnapshot,
      });
      if (error) throw error;

      toast({
        title: reusedFromCancelled ? "Manual window regenerated" : "Manual window created",
        description: reusedFromCancelled
          ? `Reused cancelled invoice number ${invoiceId} for ${preview.days} day(s).`
          : `Draft invoice ${invoiceId} created for ${preview.days} day(s).`,
      });
      setOpen(false);
      onChanged();
    } catch (err: any) {
      console.error("Create manual window error:", err);
      toast({
        title: "Error",
        description: err.message || "Failed to create manual window",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const openEdit = (inv: ManualWindowInvoice) => {
    if (inv.status !== "Draft") return;
    setEditTarget(inv);
    setEditStart(inv.invoice_period_start || "");
    setEditEnd(inv.invoice_period_end || "");
  };

  const handleEditSave = async () => {
    if (!editTarget || !editPreview || "error" in editPreview) return;
    if (hasEditErrors) return;
    setEditSaving(true);
    try {
      const prevStart = editTarget.invoice_period_start || "";
      const prevEnd = editTarget.invoice_period_end || "";
      const datesChanged = prevStart !== editStart || prevEnd !== editEnd;
      const isIGST = gstMode === "IGST";
      const dueDate = addDays(parseISO(editStart), 30);
      const items = [
        {
          sno: 1,
          description: `Display rent (${editPreview.days} day${editPreview.days === 1 ? "" : "s"} @ ${formatCurrency(perDayRate)}/day, 30-day basis)`,
          quantity: editPreview.days,
          rate: perDayRate,
          amount: editPreview.taxable,
          total: editPreview.taxable,
          hsn_sac: "998361",
          charge_type: "manual_window_rent",
        },
      ];
      const { error } = await supabase
        .from("invoices")
        .update({
          invoice_date: editStart,
          due_date: format(dueDate, "yyyy-MM-dd"),
          invoice_period_start: editStart,
          invoice_period_end: editEnd,
          billing_window_key: `manual_${editStart}_${editEnd}`,
          sub_total: editPreview.taxable,
          gst_amount: editPreview.gst,
          total_amount: editPreview.grand,
          balance_due: editPreview.grand,
          cgst_amount: isIGST ? 0 : editPreview.gst / 2,
          sgst_amount: isIGST ? 0 : editPreview.gst / 2,
          igst_amount: isIGST ? editPreview.gst : 0,
          items,
          notes: `Manual billing window for ${campaign.campaign_name} (${format(parseISO(editStart), "dd MMM yyyy")} – ${format(parseISO(editEnd), "dd MMM yyyy")})`,
        })
        .eq("id", editTarget.id)
        .eq("status", "Draft"); // safety: only drafts editable
      if (error) throw error;

      // Phase 2 — audit note (only when dates actually changed; reuses existing log_activity RPC)
      if (datesChanged) {
        const fromLabel = prevStart && prevEnd
          ? `${format(parseISO(prevStart), "dd MMM yyyy")} – ${format(parseISO(prevEnd), "dd MMM yyyy")}`
          : "(unset)";
        const toLabel = `${format(parseISO(editStart), "dd MMM yyyy")} – ${format(parseISO(editEnd), "dd MMM yyyy")}`;
        await logActivity(
          "edit",
          "invoice",
          editTarget.id,
          editTarget.invoice_no || editTarget.id,
          {
            billing_mode: "manual_window",
            campaign_id: campaign.id,
            previous_start_date: prevStart,
            previous_end_date: prevEnd,
            new_start_date: editStart,
            new_end_date: editEnd,
            summary: `Manual billing window updated: ${fromLabel} → ${toLabel}`,
          },
        );
      }

      toast({ title: "Draft updated", description: `Window ${editTarget.id} updated.` });
      setEditTarget(null);
      onChanged();
    } catch (err: any) {
      toast({ title: "Error", description: err.message || "Update failed", variant: "destructive" });
    } finally {
      setEditSaving(false);
    }
  };

  const handleCancelDraft = async (inv: ManualWindowInvoice) => {
    if (inv.status !== "Draft") {
      toast({
        title: "Cannot cancel",
        description: "Only draft windows can be removed. Finalized invoices must be cancelled from the invoice page.",
        variant: "destructive",
      });
      return;
    }
    if (!window.confirm("Remove this draft manual billing window?")) return;
    try {
      const { error } = await supabase.from("invoices").delete().eq("id", inv.id);
      if (error) throw error;
      toast({ title: "Draft removed", description: `Window ${inv.id} deleted.` });
      onChanged();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <FileText className="h-4 w-4" />
          Manual Billing Windows
          <Badge variant="outline" className="text-xs">30-day commercial basis</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription className="text-xs">
            Per-day rate = Monthly agreed amount ({formatCurrency(monthlyAgreed)}) ÷ 30 ={" "}
            <strong>{formatCurrency(perDayRate)}/day</strong>. Each window generates a draft invoice;
            finalised invoices are immutable. Existing Calendar Monthly, Single Invoice and Asset
            Cycle Billing flows are unchanged.
          </AlertDescription>
        </Alert>

        {/* Phase 5 — Coverage timeline */}
        <CoverageTimeline campaign={campaign} invoices={invoices} />

        {coverage.gaps.length > 0 && (
          <Alert variant="default" className="border-amber-300 bg-amber-50 dark:bg-amber-950/30">
            <AlertTriangle className="h-4 w-4 text-amber-600" />
            <AlertDescription className="text-xs">
              <strong>Uninvoiced gaps:</strong>{" "}
              {coverage.gaps
                .map((g) => `${format(g.start, "dd MMM yyyy")} – ${format(g.end, "dd MMM yyyy")} (${g.days}d)`)
                .join(" • ")}
            </AlertDescription>
          </Alert>
        )}

        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            {invoices.length === 0
              ? "No manual windows yet."
              : `${invoices.length} window${invoices.length === 1 ? "" : "s"} • Covered ${coverage.coveredDays}/${coverage.totalDays} days`}
          </div>
          <Button size="sm" onClick={() => setOpen(true)} disabled={locked}>
            <Plus className="h-4 w-4 mr-1" />
            Create Manual Invoice Window
          </Button>
        </div>

        {invoices.length > 0 && (
          <div className="border rounded-md overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Start Date</TableHead>
                  <TableHead>End Date</TableHead>
                  <TableHead className="text-right">Days</TableHead>
                  <TableHead className="text-right">Per Day Rate</TableHead>
                  <TableHead className="text-right">Taxable</TableHead>
                  <TableHead className="text-right">GST</TableHead>
                  <TableHead className="text-right">Grand Total</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoices.map((inv) => {
                  const s = inv.invoice_period_start ? parseISO(inv.invoice_period_start) : null;
                  const e = inv.invoice_period_end ? parseISO(inv.invoice_period_end) : null;
                  const days = s && e ? differenceInCalendarDays(e, s) + 1 : 0;
                  const taxable = Number(inv.sub_total ?? 0);
                  const rowPerDay = days > 0 ? Math.round((taxable / days) * 100) / 100 : 0;
                  return (
                    <TableRow key={inv.id}>
                      <TableCell>{s ? format(s, "dd MMM yyyy") : "—"}</TableCell>
                      <TableCell>{e ? format(e, "dd MMM yyyy") : "—"}</TableCell>
                      <TableCell className="text-right">{days}</TableCell>
                      <TableCell className="text-right">{formatCurrency(rowPerDay)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(taxable)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(Number(inv.gst_amount ?? 0))}</TableCell>
                      <TableCell className="text-right font-medium">{formatCurrency(Number(inv.total_amount ?? 0))}</TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            inv.status === "Paid"
                              ? "default"
                              : inv.status === "Cancelled"
                                ? "destructive"
                                : inv.status === "Draft"
                                  ? "secondary"
                                  : "outline"
                          }
                        >
                          {inv.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex gap-2 justify-end">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => navigate(`/admin/invoices/view/${encodeURIComponent(inv.id)}`)}
                          >
                            View
                          </Button>
                          {inv.status === "Draft" && (
                            <>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => openEdit(inv)}
                                title="Edit dates"
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleCancelDraft(inv)}
                                title="Remove draft"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[520px]">
          <DialogHeader>
            <DialogTitle>Create Manual Invoice Window</DialogTitle>
            <DialogDescription>
              Pick any client-approved billing window. Amount uses the agreed monthly rate on a 30-day commercial basis.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {coverage.gaps.length === 0 ? (
              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription className="text-xs">
                  Campaign period is fully covered. Any new window will overlap an existing one.
                </AlertDescription>
              </Alert>
            ) : (
              <Alert className="border-primary/40 bg-primary/5">
                <Info className="h-4 w-4 text-primary" />
                <AlertDescription className="text-xs">
                  Suggested next window:{" "}
                  <strong>
                    {startDate && endDate
                      ? `${format(parseISO(startDate), "dd MMM yyyy")} – ${format(parseISO(endDate), "dd MMM yyyy")}`
                      : "—"}
                  </strong>{" "}
                  (first uncovered range, capped at 30 days). You may change it.
                </AlertDescription>
              </Alert>
            )}
            {cancelledTwin && (
              <Alert className="border-blue-300 bg-blue-50 dark:bg-blue-950/30">
                <RotateCcw className="h-4 w-4 text-blue-600" />
                <AlertDescription className="text-xs">
                  A cancelled invoice <strong>{cancelledTwin.invoice_no || cancelledTwin.id}</strong>{" "}
                  exists for this exact window. Its number will be <strong>reused</strong> for continuity.
                </AlertDescription>
              </Alert>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="mw-start">Start Date</Label>
                <Input
                  id="mw-start"
                  type="date"
                  value={startDate}
                  min={campaign.start_date}
                  max={campaign.end_date}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="mw-end">End Date</Label>
                <Input
                  id="mw-end"
                  type="date"
                  value={endDate}
                  min={startDate || campaign.start_date}
                  max={campaign.end_date}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
            </div>

            <div className="rounded-md border p-3 space-y-2 bg-muted/30">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Per-day rate (30-day basis)</span>
                <span className="font-medium text-foreground">{formatCurrency(perDayRate)}</span>
              </div>
              {isPreviewError(preview) ? (
                <div className="text-sm text-destructive">{preview.error}</div>
              ) : preview ? (
                <>
                  <div className="flex justify-between text-sm">
                    <span>Billed Days</span>
                    <span className="font-medium">{preview.days}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Taxable Amount</span>
                    <span className="font-medium">{formatCurrency(preview.taxable)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>GST ({totals.gstRate}%)</span>
                    <span className="font-medium">{formatCurrency(preview.gst)}</span>
                  </div>
                  <div className="flex justify-between text-base border-t pt-2">
                    <span className="font-semibold">Grand Total</span>
                    <span className="font-bold text-primary">{formatCurrency(preview.grand)}</span>
                  </div>
                </>
              ) : (
                <div className="text-xs text-muted-foreground">Pick start and end dates to preview.</div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={submitting}>
              Cancel
            </Button>
            <Button
              onClick={handleCreate}
              disabled={!preview || "error" in (preview || {}) || submitting}
            >
              {submitting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <FileText className="h-4 w-4 mr-2" />}
              Generate Draft Invoice
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Phase 6 — Edit draft window dialog */}
      <Dialog open={!!editTarget} onOpenChange={(v) => !v && setEditTarget(null)}>
        <DialogContent className="sm:max-w-[520px]">
          <DialogHeader>
            <DialogTitle>Edit Draft Manual Window</DialogTitle>
            <DialogDescription>
              Update the start/end dates. Amounts will recalculate using the same per-day rate.
              Editing is allowed for draft windows only.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="mw-edit-start">Start Date</Label>
                <Input
                  id="mw-edit-start"
                  type="date"
                  value={editStart}
                  min={campaign.start_date}
                  max={campaign.end_date}
                  onChange={(e) => setEditStart(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="mw-edit-end">End Date</Label>
                <Input
                  id="mw-edit-end"
                  type="date"
                  value={editEnd}
                  min={editStart || campaign.start_date}
                  max={campaign.end_date}
                  onChange={(e) => setEditEnd(e.target.value)}
                />
              </div>
            </div>
            <div className="rounded-md border p-3 space-y-2 bg-muted/30">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Per-day rate (30-day basis)</span>
                <span className="font-medium text-foreground">{formatCurrency(perDayRate)}</span>
              </div>
              {isPreviewError(editPreview) ? (
                <div className="text-sm text-destructive">{editPreview.error}</div>
              ) : editPreview ? (
                <>
                  <div className="flex justify-between text-sm">
                    <span>Billed Days</span>
                    <span className="font-medium">{editPreview.days}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Taxable Amount</span>
                    <span className="font-medium">{formatCurrency(editPreview.taxable)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>GST ({totals.gstRate}%)</span>
                    <span className="font-medium">{formatCurrency(editPreview.gst)}</span>
                  </div>
                  <div className="flex justify-between text-base border-t pt-2">
                    <span className="font-semibold">Grand Total</span>
                    <span className="font-bold text-primary">{formatCurrency(editPreview.grand)}</span>
                  </div>
                </>
              ) : (
                <div className="text-xs text-muted-foreground">Adjust dates to preview.</div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditTarget(null)} disabled={editSaving}>
              Cancel
            </Button>
            <Button
              onClick={handleEditSave}
              disabled={!editPreview || isPreviewError(editPreview) || editSaving}
            >
              {editSaving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <FileText className="h-4 w-4 mr-2" />}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

// ───────────────────────── helpers ─────────────────────────

/**
 * Phase 5 — Compact coverage timeline for the campaign period.
 * Renders proportional segments: covered (finalised vs draft) and gaps.
 */
function CoverageTimeline({
  campaign,
  invoices,
}: {
  campaign: { start_date: string; end_date: string };
  invoices: ManualWindowInvoice[];
}) {
  const cs = parseISO(campaign.start_date);
  const ce = parseISO(campaign.end_date);
  const totalDays = Math.max(1, differenceInCalendarDays(ce, cs) + 1);

  type Seg = {
    kind: "covered-final" | "covered-draft" | "gap" | "cancelled";
    start: Date;
    end: Date;
    days: number;
    label: string;
  };

  const active = invoices
    .filter((i) => i.status !== "Cancelled" && i.invoice_period_start && i.invoice_period_end)
    .map((i) => ({
      s: parseISO(i.invoice_period_start!),
      e: parseISO(i.invoice_period_end!),
      isDraft: i.status === "Draft",
      id: i.invoice_no || i.id,
    }))
    .sort((a, b) => a.s.getTime() - b.s.getTime());

  const segments: Seg[] = [];
  let cursor = cs;
  for (const w of active) {
    if (isBefore(cursor, w.s)) {
      const gapEnd = addDays(w.s, -1);
      segments.push({
        kind: "gap",
        start: cursor,
        end: gapEnd,
        days: differenceInCalendarDays(gapEnd, cursor) + 1,
        label: `Gap ${format(cursor, "dd MMM")} – ${format(gapEnd, "dd MMM")}`,
      });
    }
    const segStart = isBefore(w.s, cursor) ? cursor : w.s;
    const segEnd = isAfter(w.e, ce) ? ce : w.e;
    if (!isAfter(segStart, segEnd)) {
      segments.push({
        kind: w.isDraft ? "covered-draft" : "covered-final",
        start: segStart,
        end: segEnd,
        days: differenceInCalendarDays(segEnd, segStart) + 1,
        label: `${w.isDraft ? "Draft" : "Invoiced"} ${format(segStart, "dd MMM")} – ${format(segEnd, "dd MMM")} (${w.id})`,
      });
    }
    if (isAfter(addDays(w.e, 1), cursor)) cursor = addDays(w.e, 1);
  }
  if (!isAfter(cursor, ce)) {
    segments.push({
      kind: "gap",
      start: cursor,
      end: ce,
      days: differenceInCalendarDays(ce, cursor) + 1,
      label: `Gap ${format(cursor, "dd MMM")} – ${format(ce, "dd MMM")}`,
    });
  }

  const colorFor = (k: Seg["kind"]) =>
    k === "covered-final"
      ? "bg-emerald-500"
      : k === "covered-draft"
        ? "bg-emerald-300"
        : "bg-amber-300";

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>Coverage timeline</span>
        <span>
          {format(cs, "dd MMM yyyy")} → {format(ce, "dd MMM yyyy")}
        </span>
      </div>
      <div className="flex h-3 w-full overflow-hidden rounded-md border bg-muted">
        {segments.map((s, i) => (
          <div
            key={i}
            className={`${colorFor(s.kind)} h-full`}
            style={{ width: `${(s.days / totalDays) * 100}%` }}
            title={s.label}
          />
        ))}
      </div>
      <div className="flex flex-wrap gap-3 text-[10px] text-muted-foreground">
        <span className="flex items-center gap-1">
          <span className="inline-block h-2 w-2 rounded-sm bg-emerald-500" /> Invoiced
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-2 w-2 rounded-sm bg-emerald-300" /> Draft
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-2 w-2 rounded-sm bg-amber-300" /> Gap
        </span>
      </div>
    </div>
  );
}

type PreviewOk = { days: number; taxable: number; gst: number; grand: number };
type PreviewErr = { error: string };
type PreviewResult = PreviewOk | PreviewErr | null;

function isPreviewError(p: PreviewResult): p is PreviewErr {
  return !!p && "error" in p;
}

/**
 * Phase 3 — Overlap & preview computation.
 * Treats ALL non-cancelled manual_window invoices (Draft, Sent, Partial, Paid,
 * Overdue, …) as blocking. Cancelled invoices never block — their numbers may
 * be reused via findCancelledTwin().
 */
function computePreview(opts: {
  startDate: string;
  endDate: string;
  campaign: { start_date: string; end_date: string };
  invoices: ManualWindowInvoice[];
  perDayRate: number;
  gstRate: number;
  excludeId?: string;
}):
  | { days: number; taxable: number; gst: number; grand: number }
  | { error: string }
  | null {
  const { startDate, endDate, campaign, invoices, perDayRate, gstRate, excludeId } = opts;
  if (!startDate || !endDate) return null;
  const s = parseISO(startDate);
  const e = parseISO(endDate);
  if (isAfter(s, e)) return { error: "End date must be on or after start date." };
  const days = differenceInCalendarDays(e, s) + 1;
  if (days <= 0) return { error: "Window must be at least 1 day." };

  const cs = parseISO(campaign.start_date);
  const ce = parseISO(campaign.end_date);
  if (isBefore(s, cs) || isAfter(e, ce)) {
    return {
      error: `Window must lie within campaign period (${format(cs, "dd MMM yyyy")} – ${format(ce, "dd MMM yyyy")}).`,
    };
  }

  const overlap = invoices
    .filter(
      (inv) =>
        inv.status !== "Cancelled" &&
        inv.id !== excludeId &&
        inv.invoice_period_start &&
        inv.invoice_period_end,
    )
    .find((inv) => {
      const iS = parseISO(inv.invoice_period_start!);
      const iE = parseISO(inv.invoice_period_end!);
      return !(isAfter(s, iE) || isBefore(e, iS)); // inclusive overlap
    });
  if (overlap) {
    return {
      error: `Overlaps existing ${overlap.status} window ${format(parseISO(overlap.invoice_period_start!), "dd MMM yyyy")} – ${format(parseISO(overlap.invoice_period_end!), "dd MMM yyyy")} (${overlap.invoice_no || overlap.id}).`,
    };
  }

  const taxable = Math.round(perDayRate * days * 100) / 100;
  const gst = Math.round(((taxable * gstRate) / 100) * 100) / 100;
  const grand = Math.round((taxable + gst) * 100) / 100;
  return { days, taxable, gst, grand };
}

/**
 * Find the most-recent cancelled manual_window invoice whose period exactly
 * matches the proposed window. Used for invoice-number reuse on regeneration.
 * Skips stale DRAFT-* ids — we only reuse permanent finalised numbers.
 */
function findCancelledTwin(
  invoices: ManualWindowInvoice[],
  startDate: string,
  endDate: string,
): ManualWindowInvoice | null {
  if (!startDate || !endDate) return null;
  const matches = invoices.filter((inv) => {
    if (inv.status !== "Cancelled") return false;
    if (inv.invoice_period_start !== startDate) return false;
    if (inv.invoice_period_end !== endDate) return false;
    const num = (inv.invoice_no || inv.id || "").trim();
    if (!num) return false;
    if (num.startsWith("DRAFT-")) return false;
    return true;
  });
  if (matches.length === 0) return null;
  // Deterministic: greatest invoice_no — sequential INV/YYYY-YY/#### sorts chronologically.
  return matches.sort((a, b) =>
    (b.invoice_no || b.id).localeCompare(a.invoice_no || a.id),
  )[0];
}

/**
 * Phase 4 — Suggest the next uncovered window, capped to a 30-day commercial month.
 */
function suggestNextWindow(
  campaign: { start_date: string; end_date: string },
  invoices: ManualWindowInvoice[],
): { start: string; end: string } {
  const cov = analyzeCoverage(campaign, invoices);
  if (cov.gaps.length === 0) {
    return { start: campaign.end_date, end: "" };
  }
  const gap = cov.gaps[0];
  const ce = parseISO(campaign.end_date);
  const cap = addDays(gap.start, COMMERCIAL_DAYS_PER_MONTH - 1);
  const end = isAfter(cap, gap.end) ? gap.end : isAfter(cap, ce) ? ce : cap;
  return { start: format(gap.start, "yyyy-MM-dd"), end: format(end, "yyyy-MM-dd") };
}

function computeNextUncoveredStart(
  campaign: { start_date: string; end_date: string },
  invoices: ManualWindowInvoice[],
): string {
  const cs = parseISO(campaign.start_date);
  const ce = parseISO(campaign.end_date);
  const active = invoices
    .filter((i) => i.status !== "Cancelled" && i.invoice_period_start && i.invoice_period_end)
    .map((i) => ({
      s: parseISO(i.invoice_period_start!),
      e: parseISO(i.invoice_period_end!),
    }))
    .sort((a, b) => a.s.getTime() - b.s.getTime());

  let cursor = cs;
  for (const w of active) {
    if (isBefore(cursor, w.s)) return format(cursor, "yyyy-MM-dd");
    if (!isAfter(addDays(w.e, 1), ce)) cursor = addDays(w.e, 1);
    else cursor = addDays(ce, 1);
  }
  return isAfter(cursor, ce) ? campaign.end_date : format(cursor, "yyyy-MM-dd");
}

function analyzeCoverage(
  campaign: { start_date: string; end_date: string },
  invoices: ManualWindowInvoice[],
) {
  const cs = parseISO(campaign.start_date);
  const ce = parseISO(campaign.end_date);
  const totalDays = differenceInCalendarDays(ce, cs) + 1;

  const active = invoices
    .filter((i) => i.status !== "Cancelled" && i.invoice_period_start && i.invoice_period_end)
    .map((i) => ({
      s: parseISO(i.invoice_period_start!),
      e: parseISO(i.invoice_period_end!),
    }))
    .sort((a, b) => a.s.getTime() - b.s.getTime());

  const gaps: { start: Date; end: Date; days: number }[] = [];
  let cursor = cs;
  for (const w of active) {
    if (isBefore(cursor, w.s)) {
      const gapEnd = addDays(w.s, -1);
      gaps.push({ start: cursor, end: gapEnd, days: differenceInCalendarDays(gapEnd, cursor) + 1 });
    }
    if (isAfter(addDays(w.e, 1), cursor)) cursor = addDays(w.e, 1);
  }
  if (!isAfter(cursor, ce)) {
    gaps.push({ start: cursor, end: ce, days: differenceInCalendarDays(ce, cursor) + 1 });
  }

  const coveredDays = active.reduce(
    (sum, w) => sum + Math.max(0, differenceInCalendarDays(w.e, w.s) + 1),
    0,
  );

  return { totalDays, coveredDays, gaps };
}
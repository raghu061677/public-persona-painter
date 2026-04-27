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
      const invoiceId = generateDraftInvoiceId();
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
        notes: `Manual billing window for ${campaign.campaign_name} (${format(parseISO(startDate), "dd MMM yyyy")} – ${format(parseISO(endDate), "dd MMM yyyy")})`,
        created_by: userData.user.id,
        ...regSnapshot,
      });
      if (error) throw error;

      toast({
        title: "Manual window created",
        description: `Draft invoice ${invoiceId} created for ${preview.days} day(s).`,
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
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleCancelDraft(inv)}
                              title="Remove draft"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
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
              {preview && "error" in preview ? (
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
    </Card>
  );
}

// ───────────────────────── helpers ─────────────────────────

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
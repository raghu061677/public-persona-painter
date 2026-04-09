import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertTriangle, Eye, FilePlus, FileWarning, RefreshCw, CalendarX } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/contexts/CompanyContext";
import { useNavigate } from "react-router-dom";
import { format, startOfMonth, endOfMonth, addMonths, isBefore, isSameMonth } from "date-fns";

// ---------- Types ----------

type AlertType =
  | "no_invoice"
  | "draft_only"
  | "partially_invoiced"
  | "cancelled_needs_regen"
  | "missed_period";

interface MissedPeriodInfo {
  monthKey: string; // "2026-03"
  label: string;    // "March 2026"
}

interface BillingAlert {
  campaign_id: string;
  campaign_name: string;
  client_name: string;
  start_date: string;
  end_date: string;
  billing_cycle: string | null;
  finalized_count: number;
  draft_count: number;
  alert_type: AlertType;
  missed_periods: MissedPeriodInfo[];
}

interface InvoiceRow {
  campaign_id: string | null;
  is_draft: boolean | null;
  status: string | null;
  billing_month: string | null;
  invoice_period_start: string | null;
  invoice_period_end: string | null;
}

// ---------- Helpers ----------

/** Generate calendar-month billing slices for a campaign */
function generateBillingPeriods(startDate: string, endDate: string) {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const periods: { monthKey: string; label: string; periodStart: Date; periodEnd: Date }[] = [];

  let cursor = new Date(start);
  let safety = 0;
  while ((isBefore(cursor, end) || isSameMonth(cursor, end)) && safety < 120) {
    const mStart = startOfMonth(cursor);
    const mEnd = endOfMonth(cursor);
    const periodStart = start > mStart ? start : mStart;
    const periodEnd = end < mEnd ? end : mEnd;

    periods.push({
      monthKey: format(periodStart, "yyyy-MM"),
      label: format(periodStart, "MMMM yyyy"),
      periodStart,
      periodEnd,
    });

    cursor = addMonths(mStart, 1);
    safety++;
  }
  return periods;
}

/** Check if an invoice covers a given month key using 3-tier priority */
function invoiceCoversMonth(inv: InvoiceRow, monthKey: string): boolean {
  // Tier 1: invoice_period_start / end
  if (inv.invoice_period_start && inv.invoice_period_end) {
    const invStart = new Date(inv.invoice_period_start);
    const invEnd = new Date(inv.invoice_period_end);
    const periodMonth = new Date(monthKey + "-01");
    const periodEnd = endOfMonth(periodMonth);
    // Overlap check
    return invStart <= periodEnd && invEnd >= periodMonth;
  }
  // Tier 2: billing_month
  if (inv.billing_month) {
    // billing_month may be "2026-03" or "2026-03-01"
    const bm = inv.billing_month.substring(0, 7);
    return bm === monthKey;
  }
  return false;
}

function isFinalized(inv: InvoiceRow): boolean {
  return inv.is_draft !== true && inv.status !== "Cancelled";
}

function isDraft(inv: InvoiceRow): boolean {
  return inv.is_draft === true;
}

function isCancelled(inv: InvoiceRow): boolean {
  return inv.status === "Cancelled" && inv.is_draft !== true;
}

// ---------- Component ----------

export function BillingAlertsWidget() {
  const { company } = useCompany();
  const navigate = useNavigate();
  const [alerts, setAlerts] = useState<BillingAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [runningCount, setRunningCount] = useState(0);

  useEffect(() => {
    if (company?.id) loadAlerts();
  }, [company?.id]);

  const loadAlerts = async () => {
    if (!company?.id) return;
    try {
      setLoading(true);

      const { data: campaigns } = await supabase
        .from("campaigns")
        .select("id, campaign_name, client_name, start_date, end_date, billing_cycle")
        .eq("company_id", company.id)
        .eq("status", "Running");

      if (!campaigns?.length) {
        setAlerts([]);
        setRunningCount(0);
        return;
      }

      setRunningCount(campaigns.length);
      const campaignIds = campaigns.map((c) => c.id);

      const { data: invoices } = await supabase
        .from("invoices")
        .select("campaign_id, is_draft, status, billing_month, invoice_period_start, invoice_period_end")
        .in("campaign_id", campaignIds);

      const invoicesByCampaign = new Map<string, InvoiceRow[]>();
      (invoices || []).forEach((inv) => {
        if (!inv.campaign_id) return;
        const list = invoicesByCampaign.get(inv.campaign_id) || [];
        list.push(inv as InvoiceRow);
        invoicesByCampaign.set(inv.campaign_id, list);
      });

      const today = new Date();
      const result: BillingAlert[] = [];

      for (const c of campaigns) {
        const campInvoices = invoicesByCampaign.get(c.id) || [];
        const isSingleInvoice = c.billing_cycle === "DAILY" || !c.billing_cycle;

        if (isSingleInvoice) {
          // Single-invoice logic
          const finalized = campInvoices.filter(isFinalized);
          const drafts = campInvoices.filter(isDraft);
          const cancelled = campInvoices.filter(isCancelled);

          let alertType: AlertType | null = null;
          if (finalized.length > 0) continue; // covered
          if (drafts.length > 0) alertType = "draft_only";
          else if (cancelled.length > 0) alertType = "cancelled_needs_regen";
          else alertType = "no_invoice";

          if (alertType) {
            result.push({
              campaign_id: c.id,
              campaign_name: c.campaign_name || c.id,
              client_name: c.client_name || "Unknown",
              start_date: c.start_date,
              end_date: c.end_date,
              billing_cycle: c.billing_cycle,
              finalized_count: finalized.length,
              draft_count: drafts.length,
              alert_type: alertType,
              missed_periods: [],
            });
          }
        } else {
          // MONTHLY — period-aware logic
          const periods = generateBillingPeriods(c.start_date, c.end_date);
          const finalizedInvoices = campInvoices.filter(isFinalized);
          const draftInvoices = campInvoices.filter(isDraft);
          const cancelledInvoices = campInvoices.filter(isCancelled);

          // Only check periods up to current month
          const relevantPeriods = periods.filter(
            (p) => isBefore(p.periodStart, today) || isSameMonth(p.periodStart, today)
          );

          const missedPeriods: MissedPeriodInfo[] = [];
          let coveredCount = 0;
          let hasCancelledOnly = false;

          for (const period of relevantPeriods) {
            const covered = finalizedInvoices.some((inv) => invoiceCoversMonth(inv, period.monthKey));
            if (covered) {
              coveredCount++;
            } else {
              // Check if past month (ended before today) — missed
              const periodEndDate = endOfMonth(new Date(period.monthKey + "-01"));
              const isPast = isBefore(periodEndDate, today);

              if (isPast) {
                // Check if only cancelled exists for this period
                const hasCancelled = cancelledInvoices.some((inv) => invoiceCoversMonth(inv, period.monthKey));
                if (hasCancelled) hasCancelledOnly = true;

                missedPeriods.push({
                  monthKey: period.monthKey,
                  label: period.label,
                });
              }
            }
          }

          if (coveredCount === relevantPeriods.length) continue; // fully covered

          let alertType: AlertType;
          if (finalizedInvoices.length === 0 && draftInvoices.length === 0 && cancelledInvoices.length === 0) {
            alertType = "no_invoice";
          } else if (finalizedInvoices.length === 0 && draftInvoices.length > 0) {
            alertType = "draft_only";
          } else if (finalizedInvoices.length === 0 && hasCancelledOnly) {
            alertType = "cancelled_needs_regen";
          } else if (missedPeriods.length > 0) {
            alertType = "missed_period";
          } else {
            alertType = "partially_invoiced";
          }

          result.push({
            campaign_id: c.id,
            campaign_name: c.campaign_name || c.id,
            client_name: c.client_name || "Unknown",
            start_date: c.start_date,
            end_date: c.end_date,
            billing_cycle: c.billing_cycle,
            finalized_count: finalizedInvoices.length,
            draft_count: draftInvoices.length,
            alert_type: alertType,
            missed_periods: missedPeriods,
          });
        }
      }

      // Sort by priority
      const priority: Record<AlertType, number> = {
        no_invoice: 0,
        cancelled_needs_regen: 1,
        missed_period: 2,
        draft_only: 3,
        partially_invoiced: 4,
      };
      result.sort((a, b) => priority[a.alert_type] - priority[b.alert_type]);
      setAlerts(result);
    } catch (err) {
      console.error("Error loading billing alerts:", err);
    } finally {
      setLoading(false);
    }
  };

  // Summary counts
  const noInvoice = alerts.filter((a) => a.alert_type === "no_invoice").length;
  const draftOnly = alerts.filter((a) => a.alert_type === "draft_only").length;
  const missed = alerts.filter((a) => a.alert_type === "missed_period").length;
  const cancelledRegen = alerts.filter((a) => a.alert_type === "cancelled_needs_regen").length;
  const partial = alerts.filter((a) => a.alert_type === "partially_invoiced").length;

  const alertBadge = (type: AlertType) => {
    switch (type) {
      case "no_invoice":
        return <Badge variant="destructive" className="text-xs">No Invoice</Badge>;
      case "draft_only":
        return <Badge variant="outline" className="text-xs border-amber-400 text-amber-700 dark:text-amber-400">Draft Only</Badge>;
      case "partially_invoiced":
        return <Badge variant="outline" className="text-xs border-blue-400 text-blue-700 dark:text-blue-400">Partial</Badge>;
      case "cancelled_needs_regen":
        return <Badge variant="outline" className="text-xs border-orange-400 text-orange-700 dark:text-orange-400">Cancelled – Regen</Badge>;
      case "missed_period":
        return <Badge variant="destructive" className="text-xs bg-rose-600">Missed Period</Badge>;
    }
  };

  const billingModeBadge = (cycle: string | null) => {
    if (cycle === "MONTHLY") return <Badge variant="secondary" className="text-[10px] px-1">Monthly</Badge>;
    return <Badge variant="secondary" className="text-[10px] px-1">Single</Badge>;
  };

  if (loading) return <Skeleton className="h-48 w-full" />;
  if (alerts.length === 0) return null;

  return (
    <Card className="border-amber-200 dark:border-amber-800">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-500" />
            Running Campaigns – Invoice Pending
          </CardTitle>
          <Badge variant="secondary" className="text-xs">
            {alerts.length} action{alerts.length !== 1 ? "s" : ""} needed
          </Badge>
        </div>
        <div className="flex flex-wrap gap-3 text-xs text-muted-foreground pt-1">
          <span className="text-muted-foreground">{runningCount} running</span>
          {noInvoice > 0 && <span className="text-red-600 dark:text-red-400">● {noInvoice} no invoice</span>}
          {draftOnly > 0 && <span className="text-amber-600 dark:text-amber-400">● {draftOnly} draft pending</span>}
          {missed > 0 && <span className="text-rose-600 dark:text-rose-400">● {missed} missed period</span>}
          {cancelledRegen > 0 && <span className="text-orange-600 dark:text-orange-400">● {cancelledRegen} needs regen</span>}
          {partial > 0 && <span className="text-blue-600 dark:text-blue-400">● {partial} partially invoiced</span>}
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2 max-h-[360px] overflow-y-auto">
          {alerts.map((a) => (
            <div
              key={a.campaign_id}
              className="flex items-start justify-between gap-2 py-2.5 px-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium text-sm truncate max-w-[200px]">{a.campaign_name}</span>
                  {alertBadge(a.alert_type)}
                  {billingModeBadge(a.billing_cycle)}
                </div>
                <div className="text-xs text-muted-foreground mt-0.5">
                  {a.client_name} • {format(new Date(a.start_date), "dd MMM")} – {format(new Date(a.end_date), "dd MMM yyyy")}
                </div>
                {a.missed_periods.length > 0 && (
                  <div className="flex items-center gap-1 mt-1 flex-wrap">
                    <CalendarX className="h-3 w-3 text-rose-500 shrink-0" />
                    <span className="text-[11px] text-rose-600 dark:text-rose-400">
                      Missed: {a.missed_periods.map((p) => p.label).join(", ")}
                    </span>
                  </div>
                )}
              </div>
              <div className="flex gap-1 shrink-0 pt-0.5">
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 px-2 text-xs"
                  onClick={() => navigate(`/admin/campaigns/${a.campaign_id}`)}
                >
                  <Eye className="h-3 w-3 mr-1" /> View
                </Button>
                {a.alert_type === "draft_only" ? (
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 px-2 text-xs"
                    onClick={() => navigate(`/admin/invoices?campaign_id=${a.campaign_id}&status=Draft`)}
                  >
                    <FileWarning className="h-3 w-3 mr-1" /> Open Draft
                  </Button>
                ) : a.alert_type === "cancelled_needs_regen" ? (
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 px-2 text-xs border-orange-300 text-orange-700 hover:bg-orange-50"
                    onClick={() => navigate(`/admin/campaigns/${a.campaign_id}?tab=billing`)}
                  >
                    <RefreshCw className="h-3 w-3 mr-1" /> Regenerate
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 px-2 text-xs"
                    onClick={() => navigate(`/admin/campaigns/${a.campaign_id}?tab=billing`)}
                  >
                    <FilePlus className="h-3 w-3 mr-1" /> Invoice
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

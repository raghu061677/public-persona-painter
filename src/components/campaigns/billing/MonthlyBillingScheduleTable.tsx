import { useState, useMemo } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { formatCurrency } from "@/utils/mediaAssets";
import { format } from "date-fns";
import { FileText, Eye, Loader2, Plus, CalendarDays } from "lucide-react";
 import { BillingPeriodInfo, CampaignTotalsResult, CampaignAsset, calculatePeriodAmountAssetWise, calculatePeriodAmountFromTotals } from "@/utils/computeCampaignTotals";
import { BillingStatusBadge, BillingStatus, mapInvoiceStatusToBillingStatus } from "./BillingStatusBadge";
import { cn } from "@/lib/utils";
import type { CampaignChargeItem } from "./charges/useCampaignChargeItems";

interface InvoiceRecord {
  id: string;
  invoice_period_start: string;
  invoice_period_end: string;
  billing_month?: string | null;
  total_amount: number;
  status: string;
  due_date: string;
}

interface MonthlyBillingScheduleTableProps {
  periods: BillingPeriodInfo[];
   totals: CampaignTotalsResult;
  campaignAssets?: CampaignAsset[];
  existingInvoices: InvoiceRecord[];
  onGenerateInvoice: (period: BillingPeriodInfo, includePrinting: boolean, includeMounting: boolean) => void;
  onViewInvoice: (invoiceId: string) => void;
  isGenerating?: boolean;
  printingBilled?: boolean;
  mountingBilled?: boolean;
  /** Per-month one-time/ad-hoc charge rows from campaign_charge_items. */
  chargeItems?: CampaignChargeItem[];
}

export function MonthlyBillingScheduleTable({
  periods,
   totals,
  campaignAssets,
  existingInvoices,
  onGenerateInvoice,
  onViewInvoice,
  isGenerating = false,
  printingBilled = false,
  mountingBilled = false,
  chargeItems = [],
}: MonthlyBillingScheduleTableProps) {
  const [selectedOneTimeCharges, setSelectedOneTimeCharges] = useState<{
    [monthKey: string]: { printing: boolean; mounting: boolean };
  }>({});

  /**
   * Group pending (uninvoiced) charges per month so the schedule never invents
   * recurring printing/mounting numbers. Display lines stay in the recurring
   * cycle; only charges actually assigned to a month show up there.
   */
  const pendingByMonth = useMemo(() => {
    const map = new Map<
      string,
      { printing: number; mounting: number; chargeIds: string[] }
    >();
    for (const it of chargeItems) {
      if (it.is_invoiced) continue;
      const key = it.billing_month_key;
      if (!key) continue;
      const cur = map.get(key) || { printing: 0, mounting: 0, chargeIds: [] };
      const amt = Number(it.amount || 0);
      if (it.charge_type === "printing" || it.charge_type === "reprinting") {
        cur.printing += amt;
      } else if (it.charge_type === "mounting" || it.charge_type === "remounting") {
        cur.mounting += amt;
      } else {
        // misc — bucket into printing column for now (visual only)
        cur.printing += amt;
      }
      cur.chargeIds.push(it.id);
      map.set(key, cur);
    }
    return map;
  }, [chargeItems]);

  // Check if one-time charges have been applied to any invoice
  const oneTimeChargesApplied = existingInvoices.some(inv => {
    // Check if invoice includes one-time charges (would need to check items)
    return false; // Placeholder - would need invoice items check
  });

   // Find invoice for a specific period - match by billing_month key to avoid timezone issues
   const getInvoiceForPeriod = (period: BillingPeriodInfo): InvoiceRecord | undefined => {
    return existingInvoices.filter(inv => !['Cancelled', 'Void'].includes(inv.status)).find(inv => {
      // Primary match: billing_month (e.g. "2024-03") === monthKey
      if (inv.billing_month) {
        return inv.billing_month === period.monthKey;
      }
      // Fallback: compare date strings directly (avoid timezone issues with getTime())
      const periodStartStr = `${period.periodStart.getFullYear()}-${String(period.periodStart.getMonth() + 1).padStart(2, '0')}-${String(period.periodStart.getDate()).padStart(2, '0')}`;
      return inv.invoice_period_start === periodStartStr;
    });
  };

  // Get one-time charge selection for a period — defaults to ON only when a
  // pending charge exists for that month. Months with no assignment show no charges.
  const getChargeSelection = (monthKey: string) => {
    const pending = pendingByMonth.get(monthKey);
    const defaults = {
      printing: !!(pending && pending.printing > 0),
      mounting: !!(pending && pending.mounting > 0),
    };
    return selectedOneTimeCharges[monthKey] ?? defaults;
  };

  // Toggle one-time charge
  const toggleCharge = (monthKey: string, chargeType: 'printing' | 'mounting') => {
    setSelectedOneTimeCharges(prev => ({
      ...prev,
      [monthKey]: {
        ...getChargeSelection(monthKey),
        [chargeType]: !getChargeSelection(monthKey)[chargeType],
      },
    }));
  };

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50">
            <TableHead className="w-[140px]">
              <div className="flex items-center gap-1">
                <CalendarDays className="h-4 w-4" />
                Month
              </div>
            </TableHead>
            <TableHead>Period</TableHead>
            <TableHead className="text-right">Client Approved Amount</TableHead>
            <TableHead className="text-center">One-Time Charges</TableHead>
            <TableHead className="text-right">GST</TableHead>
            <TableHead className="text-right">Total</TableHead>
            <TableHead className="w-[100px]">Status</TableHead>
            <TableHead className="w-[120px] text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {periods.map((period) => {
            const invoice = getInvoiceForPeriod(period);
            const hasInvoice = !!invoice;
            const selection = getChargeSelection(period.monthKey);
            const pending = pendingByMonth.get(period.monthKey);
            const monthPrinting = pending?.printing || 0;
            const monthMounting = pending?.mounting || 0;
            const printingForRow = selection.printing ? monthPrinting : 0;
            const mountingForRow = selection.mounting ? monthMounting : 0;
             // Use asset-wise calculation when campaignAssets available (matches actual invoice generation)
             const amounts = campaignAssets && campaignAssets.length > 0
               ? calculatePeriodAmountAssetWise(
                   period,
                   campaignAssets,
                   totals,
                   false,
                   false,
                 )
               : calculatePeriodAmountFromTotals(
                   period,
                   totals,
                   false,
                   false,
                 );
            // Recompute totals using only this month's pending charges
            const subtotal = amounts.baseRent + printingForRow + mountingForRow;
            const gstAmount = totals.gstRate > 0 ? Math.round(subtotal * totals.gstRate) / 100 : 0;
            const grandTotal = Math.round((subtotal + gstAmount) * 100) / 100;

            const isDraftInvoice = hasInvoice && invoice.status === 'Draft';
            const isLockedInvoice = hasInvoice && !isDraftInvoice;

            const status: BillingStatus = hasInvoice
              ? (isDraftInvoice ? 'not_invoiced' : mapInvoiceStatusToBillingStatus(invoice.status, invoice.due_date))
              : 'not_invoiced';

            const isCurrentPeriod = period.isCurrentMonth;
            const isPaid = status === 'paid';

            return (
              <TableRow 
                key={period.monthKey}
                className={cn(
                  isCurrentPeriod && "bg-primary/5 ring-1 ring-inset ring-primary/20",
                  isPaid && "opacity-70"
                )}
              >
                {/* Month */}
                <TableCell className="font-medium">
                  <div className="flex items-center gap-2">
                    {period.label}
                    {isCurrentPeriod && (
                      <Badge variant="outline" className="text-xs bg-primary/10 text-primary">
                        Current
                      </Badge>
                    )}
                  </div>
                </TableCell>

                {/* Period */}
                <TableCell className="text-sm text-muted-foreground">
                  {format(period.periodStart, "dd MMM")} → {format(period.periodEnd, "dd MMM yyyy")}
                  {period.proRataFactor < 1 && (
                    <span className="ml-1 text-xs text-amber-600">
                      ({Math.round(period.proRataFactor * 100)}% pro-rata)
                    </span>
                  )}
                </TableCell>

                {/* Base Rent */}
                <TableCell className="text-right font-medium">
                  {formatCurrency(amounts.baseRent)}
                </TableCell>

                {/* One-Time Charges */}
                <TableCell>
                <div className="flex items-center justify-center gap-4">
                       {monthPrinting > 0 && (
                        <label className="flex items-center gap-1.5 text-xs cursor-pointer">
                          <Checkbox
                            checked={selection.printing}
                            onCheckedChange={() => toggleCharge(period.monthKey, 'printing')}
                          />
                          <span>Printing {formatCurrency(monthPrinting)}</span>
                        </label>
                      )}
                       {monthMounting > 0 && (
                        <label className="flex items-center gap-1.5 text-xs cursor-pointer">
                          <Checkbox
                            checked={selection.mounting}
                            onCheckedChange={() => toggleCharge(period.monthKey, 'mounting')}
                          />
                          <span>Mounting {formatCurrency(monthMounting)}</span>
                        </label>
                      )}
                       {monthPrinting === 0 && monthMounting === 0 && (
                        <span className="text-muted-foreground text-xs">—</span>
                      )}
                    </div>
                </TableCell>

                {/* GST */}
                <TableCell className="text-right text-sm">
                   {totals.gstRate > 0 ? formatCurrency(gstAmount) : "—"}
                </TableCell>

                {/* Total */}
                <TableCell className="text-right font-semibold">
                  {formatCurrency(grandTotal)}
                </TableCell>

                {/* Status */}
                <TableCell>
                  <div className="flex items-center gap-1">
                    <BillingStatusBadge status={status} />
                    {hasInvoice && invoice.status === 'Draft' && (
                      <Badge variant="outline" className="text-[10px] px-1">Draft</Badge>
                    )}
                  </div>
                </TableCell>

                {/* Actions */}
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-1">
                    {hasInvoice ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onViewInvoice(invoice.id)}
                      >
                        <Eye className="mr-1 h-4 w-4" />
                        View
                      </Button>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onGenerateInvoice(period, selection.printing && !printingBilled, selection.mounting && !mountingBilled)}
                        disabled={isGenerating}
                      >
                        {isGenerating ? (
                          <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                        ) : (
                          <Plus className="mr-1 h-4 w-4" />
                        )}
                        Generate
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
  );
}

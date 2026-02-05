import { useState } from "react";
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
 import { BillingPeriodInfo, CampaignTotalsResult, calculatePeriodAmountFromTotals } from "@/utils/computeCampaignTotals";
import { BillingStatusBadge, BillingStatus, mapInvoiceStatusToBillingStatus } from "./BillingStatusBadge";
import { cn } from "@/lib/utils";

interface InvoiceRecord {
  id: string;
  invoice_period_start: string;
  invoice_period_end: string;
  total_amount: number;
  status: string;
  due_date: string;
}

interface MonthlyBillingScheduleTableProps {
  periods: BillingPeriodInfo[];
   totals: CampaignTotalsResult;
  existingInvoices: InvoiceRecord[];
  onGenerateInvoice: (period: BillingPeriodInfo, includePrinting: boolean, includeMounting: boolean) => void;
  onViewInvoice: (invoiceId: string) => void;
  isGenerating?: boolean;
  printingBilled?: boolean;
  mountingBilled?: boolean;
}

export function MonthlyBillingScheduleTable({
  periods,
   totals,
  existingInvoices,
  onGenerateInvoice,
  onViewInvoice,
  isGenerating = false,
  printingBilled = false,
  mountingBilled = false,
}: MonthlyBillingScheduleTableProps) {
  const [selectedOneTimeCharges, setSelectedOneTimeCharges] = useState<{
    [monthKey: string]: { printing: boolean; mounting: boolean };
  }>({});

  // Check if one-time charges have been applied to any invoice
  const oneTimeChargesApplied = existingInvoices.some(inv => {
    // Check if invoice includes one-time charges (would need to check items)
    return false; // Placeholder - would need invoice items check
  });

   // Find invoice for a specific period
   const getInvoiceForPeriod = (period: BillingPeriodInfo): InvoiceRecord | undefined => {
    return existingInvoices.find(inv => {
      const invStart = new Date(inv.invoice_period_start);
      const invEnd = new Date(inv.invoice_period_end);
      return (
        invStart.getTime() === period.periodStart.getTime() &&
        invEnd.getTime() === period.periodEnd.getTime()
      );
    });
  };

  // Get one-time charge selection for a period
  const getChargeSelection = (monthKey: string) => {
    return selectedOneTimeCharges[monthKey] || { printing: false, mounting: false };
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
            <TableHead className="text-right">Base Rent</TableHead>
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
             const amounts = calculatePeriodAmountFromTotals(
              period,
               totals,
               selection.printing && !printingBilled,
               selection.mounting && !mountingBilled
            );

            const status: BillingStatus = hasInvoice
              ? mapInvoiceStatusToBillingStatus(invoice.status, invoice.due_date)
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
                  {!hasInvoice ? (
                    <div className="flex items-center justify-center gap-4">
                       {totals.printingCost > 0 && (
                        <label className="flex items-center gap-1.5 text-xs cursor-pointer">
                          <Checkbox
                            checked={selection.printing}
                            onCheckedChange={() => toggleCharge(period.monthKey, 'printing')}
                            disabled={hasInvoice || printingBilled}
                          />
                          <span className={printingBilled ? 'line-through text-muted-foreground' : ''}>
                            Printing
                          </span>
                          {printingBilled && (
                            <Badge variant="outline" className="text-xs ml-1">Billed</Badge>
                          )}
                        </label>
                      )}
                       {totals.mountingCost > 0 && (
                        <label className="flex items-center gap-1.5 text-xs cursor-pointer">
                          <Checkbox
                            checked={selection.mounting}
                            onCheckedChange={() => toggleCharge(period.monthKey, 'mounting')}
                            disabled={hasInvoice || mountingBilled}
                          />
                          <span className={mountingBilled ? 'line-through text-muted-foreground' : ''}>
                            Mounting
                          </span>
                          {mountingBilled && (
                            <Badge variant="outline" className="text-xs ml-1">Billed</Badge>
                          )}
                        </label>
                      )}
                       {totals.printingCost === 0 && totals.mountingCost === 0 && (
                        <span className="text-muted-foreground text-xs">—</span>
                      )}
                    </div>
                  ) : (
                    <div className="text-center text-xs text-muted-foreground">
                      {amounts.printing > 0 || amounts.mounting > 0 ? (
                        <span className="text-green-600">Included</span>
                      ) : (
                        "—"
                      )}
                    </div>
                  )}
                </TableCell>

                {/* GST */}
                <TableCell className="text-right text-sm">
                   {totals.gstRate > 0 ? formatCurrency(amounts.gstAmount) : "—"}
                </TableCell>

                {/* Total */}
                <TableCell className="text-right font-semibold">
                  {hasInvoice ? formatCurrency(invoice.total_amount) : formatCurrency(amounts.total)}
                </TableCell>

                {/* Status */}
                <TableCell>
                  <BillingStatusBadge status={status} />
                </TableCell>

                {/* Actions */}
                <TableCell className="text-right">
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
                      onClick={() => onGenerateInvoice(period, selection.printing, selection.mounting)}
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
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}

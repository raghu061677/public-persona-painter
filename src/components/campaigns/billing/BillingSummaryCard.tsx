import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/utils/mediaAssets";
import { format } from "date-fns";
import { Calendar, Receipt, CreditCard, Percent } from "lucide-react";

interface BillingSummaryCardProps {
  campaign: {
    campaign_name: string;
    client_name: string;
    start_date: string;
    end_date: string;
    billing_cycle?: string;
  };
  totalMonths: number;
  monthlyBaseRent: number;
  printingTotal: number;
  mountingTotal: number;
  gstPercent: number;
  totalInvoiced: number;
  totalPaid: number;
}

export function BillingSummaryCard({
  campaign,
  totalMonths,
  monthlyBaseRent,
  printingTotal,
  mountingTotal,
  gstPercent,
  totalInvoiced,
  totalPaid,
}: BillingSummaryCardProps) {
  const startDate = new Date(campaign.start_date);
  const endDate = new Date(campaign.end_date);
  const periodLabel = `${format(startDate, "MMM yyyy")} – ${format(endDate, "MMM yyyy")}`;
  const isMonthlyBilling = (campaign.billing_cycle || 'monthly').toLowerCase() === 'monthly';

  return (
    <Card className="border-l-4 border-l-primary">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Receipt className="h-5 w-5 text-primary" />
            Billing Summary
          </div>
          {isMonthlyBilling && (
            <Badge variant="default" className="bg-primary/10 text-primary border-primary/20">
              Monthly Billing
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {/* Campaign Period */}
          <div className="space-y-1">
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Calendar className="h-3 w-3" />
              Campaign Period
            </div>
            <p className="font-medium text-sm">{periodLabel}</p>
          </div>

          {/* Total Months */}
          <div className="space-y-1">
            <div className="text-xs text-muted-foreground">Total Months</div>
            <p className="font-semibold text-lg">{totalMonths}</p>
          </div>

          {/* Monthly Rent */}
          <div className="space-y-1">
            <div className="text-xs text-muted-foreground">Monthly Rent</div>
            <p className="font-semibold">{formatCurrency(monthlyBaseRent)}</p>
          </div>

          {/* GST Rate */}
          <div className="space-y-1">
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Percent className="h-3 w-3" />
              GST Rate
            </div>
            <p className="font-medium">{gstPercent}%</p>
          </div>
        </div>

        {/* One-Time Charges */}
        {(printingTotal > 0 || mountingTotal > 0) && (
          <div className="mt-4 pt-4 border-t">
            <div className="text-xs text-muted-foreground mb-2">One-Time Charges (First Invoice):</div>
            <div className="flex gap-4 text-sm">
              {printingTotal > 0 && (
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">Printing:</span>
                  <span className="font-medium">{formatCurrency(printingTotal)}</span>
                </div>
              )}
              {mountingTotal > 0 && (
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">Mounting:</span>
                  <span className="font-medium">{formatCurrency(mountingTotal)}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Payment Progress */}
        <div className="mt-4 pt-4 border-t">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Payment Progress:</span>
            </div>
            <div className="flex gap-3">
              <span>
                <span className="text-muted-foreground">Invoiced:</span>{" "}
                <span className="font-medium">{formatCurrency(totalInvoiced)}</span>
              </span>
              <span>
                <span className="text-muted-foreground">Paid:</span>{" "}
                <span className="font-medium text-green-600">{formatCurrency(totalPaid)}</span>
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

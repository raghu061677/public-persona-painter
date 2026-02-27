import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { TrendingUp, TrendingDown, Info, ShieldAlert, ShieldCheck, ShieldMinus } from "lucide-react";
import { formatCurrency } from "@/utils/mediaAssets";
import { CampaignProfitability, getMinMarginThreshold } from "@/hooks/useCampaignProfitability";

interface Props {
  profitability: CampaignProfitability;
  companyId?: string;
  isLoading?: boolean;
}

const statusConfig = {
  green: { icon: ShieldCheck, label: "Healthy", borderClass: "border-l-emerald-500", textClass: "text-emerald-600 dark:text-emerald-400", bgClass: "bg-emerald-50 dark:bg-emerald-950" },
  yellow: { icon: ShieldMinus, label: "Watch", borderClass: "border-l-amber-500", textClass: "text-amber-600 dark:text-amber-400", bgClass: "bg-amber-50 dark:bg-amber-950" },
  red: { icon: ShieldAlert, label: "At Risk", borderClass: "border-l-destructive", textClass: "text-destructive", bgClass: "bg-destructive/5" },
};

export function CampaignProfitSummary({ profitability: p, companyId, isLoading }: Props) {
  if (isLoading) {
    return (
      <Card className="border-l-4 border-l-muted shadow-md">
        <CardContent className="pt-4 pb-3 space-y-3">
          {[1,2,3,4].map(i => <div key={i} className="h-5 bg-muted animate-pulse rounded" />)}
        </CardContent>
      </Card>
    );
  }

  const config = statusConfig[p.marginStatus];
  const StatusIcon = config.icon;
  const minMargin = getMinMarginThreshold(companyId);

  return (
    <Card className={`border-l-4 ${config.borderClass} shadow-md`}>
      <CardHeader className="pb-2">
        <CardTitle className={`text-base flex items-center justify-between ${config.textClass}`}>
          <span className="flex items-center gap-2">
            <StatusIcon className="h-4 w-4" />
            Profitability
          </span>
          <Badge variant={p.marginStatus === "green" ? "default" : p.marginStatus === "yellow" ? "secondary" : "destructive"} className="text-xs">
            {config.label} ({p.marginPercent.toFixed(1)}%)
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <TooltipProvider>
          <div className="space-y-2 text-sm">
            {/* Revenue */}
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-1 text-muted-foreground">
                <TrendingUp className="h-3.5 w-3.5" />
                <span>Revenue</span>
                <Tooltip>
                  <TooltipTrigger><Info className="h-3 w-3" /></TooltipTrigger>
                  <TooltipContent>
                    {p.invoiceRevenue > 0
                      ? `From ${p.invoiceRevenue > 0 ? "invoices" : "booking value"}: ${formatCurrency(p.revenue)}`
                      : `Booking value (no invoices yet): ${formatCurrency(p.bookingRevenue)}`}
                  </TooltipContent>
                </Tooltip>
              </div>
              <span className="font-medium text-emerald-600">{formatCurrency(p.revenue)}</span>
            </div>

            {/* Direct Costs Breakdown */}
            {p.mountingCost > 0 && (
              <div className="flex justify-between items-center pl-4">
                <span className="text-muted-foreground text-xs">Mounting</span>
                <span className="text-xs">- {formatCurrency(p.mountingCost)}</span>
              </div>
            )}
            {p.printingCost > 0 && (
              <div className="flex justify-between items-center pl-4">
                <span className="text-muted-foreground text-xs">Printing</span>
                <span className="text-xs">- {formatCurrency(p.printingCost)}</span>
              </div>
            )}
            {p.unmountingCost > 0 && (
              <div className="flex justify-between items-center pl-4">
                <span className="text-muted-foreground text-xs">Unmounting</span>
                <span className="text-xs">- {formatCurrency(p.unmountingCost)}</span>
              </div>
            )}
            {p.otherCosts > 0 && (
              <div className="flex justify-between items-center pl-4">
                <span className="text-muted-foreground text-xs">Other</span>
                <span className="text-xs">- {formatCurrency(p.otherCosts)}</span>
              </div>
            )}

            {/* Total Direct Costs */}
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-1 text-muted-foreground">
                <TrendingDown className="h-3.5 w-3.5" />
                <span>Direct Costs</span>
              </div>
              <span className="font-medium text-destructive">- {formatCurrency(p.directCosts)}</span>
            </div>

            {/* Net Profit */}
            <div className="flex justify-between items-center pt-2 border-t border-border">
              <span className="font-semibold">Net Profit</span>
              <span className={`font-bold ${p.netProfit >= 0 ? "text-emerald-600" : "text-destructive"}`}>
                {formatCurrency(p.netProfit)}
              </span>
            </div>

            {/* Margin */}
            <div className="flex justify-between items-center">
              <span className="font-semibold">Margin</span>
              <span className={`font-bold ${config.textClass}`}>
                {p.marginPercent.toFixed(1)}%
              </span>
            </div>

            {p.marginStatus === "red" && (
              <p className="text-xs text-destructive mt-1">
                ⚠ Below minimum threshold ({minMargin}%). Invoice generation may be restricted.
              </p>
            )}
          </div>
        </TooltipProvider>
      </CardContent>
    </Card>
  );
}

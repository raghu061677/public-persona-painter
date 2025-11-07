import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/utils/mediaAssets";
import { AlertCircle, TrendingUp } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface PlanSummaryCardProps {
  selectedCount: number;
  duration: number;
  subtotal: number;
  discount: number;
  netTotal: number;
  gstPercent: number;
  gstAmount: number;
  grandTotal: number;
  profitMargin?: number;
  baseRent?: number;
}

export function PlanSummaryCard({
  selectedCount,
  duration,
  subtotal,
  discount,
  netTotal,
  gstPercent,
  gstAmount,
  grandTotal,
  profitMargin,
  baseRent,
}: PlanSummaryCardProps) {
  const marginPercent = baseRent ? ((netTotal - baseRent) / baseRent) * 100 : 0;
  const isLowMargin = marginPercent < 10;

  return (
    <Card className="sticky top-6 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-200 bg-gradient-to-br from-background to-muted/20">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center justify-between text-lg font-semibold text-slate-700 dark:text-slate-200">
          <span>Plan Summary</span>
          <TrendingUp className="h-5 w-5 text-primary" />
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid grid-cols-2 gap-4 pb-4 border-b">
          <div className="text-center p-3 rounded-lg bg-primary/5">
            <p className="text-xs text-muted-foreground mb-1">Assets</p>
            <p className="text-3xl font-bold text-primary">{selectedCount}</p>
          </div>
          <div className="text-center p-3 rounded-lg bg-blue-50 dark:bg-blue-950/20">
            <p className="text-xs text-muted-foreground mb-1">Duration</p>
            <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">{duration}</p>
            <p className="text-xs text-muted-foreground">days</p>
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-sm text-slate-600 dark:text-slate-400">Subtotal</span>
            <span className="font-semibold text-base">{formatCurrency(subtotal)}</span>
          </div>
          
          {discount > 0 && (
            <div className="flex justify-between items-center text-blue-600 dark:text-blue-400">
              <span className="text-sm font-medium">Discount</span>
              <span className="font-semibold text-base">-{formatCurrency(discount)}</span>
            </div>
          )}
          
          <div className="flex justify-between items-center">
            <span className="text-sm text-slate-600 dark:text-slate-400">Net Total</span>
            <span className="font-semibold text-base">{formatCurrency(netTotal)}</span>
          </div>
          
          <div className="flex justify-between items-center">
            <span className="text-sm text-slate-600 dark:text-slate-400">GST ({gstPercent}%)</span>
            <span className="font-semibold text-base text-slate-500">{formatCurrency(gstAmount)}</span>
          </div>
          
          <div className="flex justify-between items-center pt-4 border-t-2 border-primary/20">
            <span className="font-semibold text-lg text-slate-700 dark:text-slate-200">Grand Total</span>
            <span className="font-bold text-2xl text-primary">{formatCurrency(grandTotal)}</span>
          </div>
        </div>

        {baseRent && baseRent > 0 && (
          <div className="pt-4 border-t">
            <div className="flex justify-between items-center p-3 rounded-lg bg-green-50 dark:bg-green-950/20">
              <div>
                <p className="text-xs text-muted-foreground mb-1">Profit Margin</p>
                <span className={`text-2xl font-bold ${isLowMargin ? 'text-destructive' : 'text-green-600 dark:text-green-400'}`}>
                  {marginPercent.toFixed(1)}%
                </span>
              </div>
              {isLowMargin && (
                <AlertCircle className="h-5 w-5 text-destructive" />
              )}
            </div>
            {isLowMargin && (
              <Alert variant="destructive" className="mt-3">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="text-xs">
                  Low profit margin. Consider revising pricing.
                </AlertDescription>
              </Alert>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

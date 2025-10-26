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
    <Card className="sticky top-6">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Plan Summary</span>
          <TrendingUp className="h-5 w-5 text-primary" />
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4 pb-4 border-b">
          <div>
            <p className="text-sm text-muted-foreground">Assets</p>
            <p className="text-2xl font-bold">{selectedCount}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Duration</p>
            <p className="text-2xl font-bold">{duration} days</p>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex justify-between">
            <span className="text-sm text-muted-foreground">Subtotal</span>
            <span className="font-medium">{formatCurrency(subtotal)}</span>
          </div>
          
          {discount > 0 && (
            <div className="flex justify-between text-red-600">
              <span className="text-sm">Discount</span>
              <span className="font-medium">-{formatCurrency(discount)}</span>
            </div>
          )}
          
          <div className="flex justify-between">
            <span className="text-sm text-muted-foreground">Net Total</span>
            <span className="font-medium">{formatCurrency(netTotal)}</span>
          </div>
          
          <div className="flex justify-between">
            <span className="text-sm text-muted-foreground">GST ({gstPercent}%)</span>
            <span className="font-medium">{formatCurrency(gstAmount)}</span>
          </div>
          
          <div className="flex justify-between pt-3 border-t">
            <span className="font-semibold text-lg">Grand Total</span>
            <span className="font-bold text-xl text-primary">{formatCurrency(grandTotal)}</span>
          </div>
        </div>

        {baseRent && baseRent > 0 && (
          <div className="pt-4 border-t">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium">Profit Margin</span>
              <span className={`text-lg font-bold ${isLowMargin ? 'text-destructive' : 'text-green-600'}`}>
                {marginPercent.toFixed(1)}%
              </span>
            </div>
            {isLowMargin && (
              <Alert variant="destructive" className="mt-2">
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

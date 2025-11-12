import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/utils/mediaAssets";
import { AlertCircle, TrendingUp, Download } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";

interface PlanSummaryCardProps {
  selectedCount: number;
  duration: number;
  displayCost: number;
  printingCost: number;
  mountingCost: number;
  subtotal: number;
  discount: number;
  netTotal: number;
  profit: number;
  gstPercent: number;
  gstAmount: number;
  grandTotal: number;
  baseRent?: number;
  withCard?: boolean;
}

export function PlanSummaryCard({
  selectedCount,
  duration,
  displayCost,
  printingCost,
  mountingCost,
  subtotal,
  discount,
  netTotal,
  profit,
  gstPercent,
  gstAmount,
  grandTotal,
  baseRent,
  withCard = true,
}: PlanSummaryCardProps) {
  const profitPercent = netTotal > 0 ? (profit / netTotal) * 100 : 0;
  const isLowMargin = profitPercent < 10;
  
  const exportSummary = () => {
    const data = {
      display_cost: displayCost,
      printing_cost: printingCost,
      mounting_cost: mountingCost,
      subtotal,
      discount: -discount,
      net_total: netTotal,
      profit,
      gst: gstAmount,
      grand_total: grandTotal,
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'financial-summary.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  const content = (
    <div className="space-y-6">
        {/* KPI Section */}
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

        {/* Cost Breakdown */}
        <div className="space-y-3">
          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Cost Breakdown</h4>
          
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Display Cost</span>
            <span className="font-semibold">{formatCurrency(displayCost)}</span>
          </div>
          
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Printing Cost</span>
            <span className="font-semibold">{formatCurrency(printingCost)}</span>
          </div>
          
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Mounting Cost</span>
            <span className="font-semibold">{formatCurrency(mountingCost)}</span>
          </div>
          
          <div className="flex justify-between items-center pt-2 border-t">
            <span className="text-sm font-medium">Subtotal</span>
            <span className="font-semibold text-base">{formatCurrency(subtotal)}</span>
          </div>
        </div>

        {/* Adjustments */}
        <div className="space-y-3 pt-2 border-t">
          {discount > 0 && (
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-destructive">Discount</span>
              <span className="font-semibold text-destructive">-{formatCurrency(discount)}</span>
            </div>
          )}
          
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium">Net Total</span>
            <span className="font-semibold text-base">{formatCurrency(netTotal)}</span>
          </div>
          
          {profit > 0 && (
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-green-600 dark:text-green-400">Profit</span>
              <span className="font-semibold text-green-600 dark:text-green-400">{formatCurrency(profit)}</span>
            </div>
          )}
        </div>

        {/* Tax & Total */}
        <div className="space-y-3 pt-2 border-t">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium">GST ({gstPercent}%)</span>
            <span className="font-semibold">{formatCurrency(gstAmount)}</span>
          </div>
          
          <div className="flex justify-between items-center pt-4 border-t-2 border-primary/20">
            <span className="font-bold text-lg">Grand Total</span>
            <span className="font-bold text-2xl text-primary">{formatCurrency(grandTotal)}</span>
          </div>
        </div>

        {/* Profit Visualization */}
        {profit > 0 && (
          <div className="pt-4 border-t space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-xs font-medium text-muted-foreground">Profit Margin</span>
              <span className={`text-sm font-bold ${isLowMargin ? 'text-destructive' : 'text-green-600 dark:text-green-400'}`}>
                {profitPercent.toFixed(1)}%
              </span>
            </div>
            <Progress 
              value={profitPercent} 
              className={`h-2 ${isLowMargin ? '[&>div]:bg-destructive' : '[&>div]:bg-green-600'}`}
            />
            {isLowMargin && (
              <Alert variant="destructive" className="py-2">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="text-xs">
                  Low profit margin. Consider revising pricing.
                </AlertDescription>
              </Alert>
            )}
          </div>
        )}
    </div>
  );
  
  if (!withCard) {
    return content;
  }

  return (
    <Card className="sticky top-6 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-200 bg-gradient-to-br from-background to-muted/20 border-l-4 border-l-primary">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center justify-between text-lg font-semibold">
          <span className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            Financial Summary
          </span>
          <Button 
            variant="ghost" 
            size="sm"
            onClick={exportSummary}
            className="h-8 w-8 p-0"
          >
            <Download className="h-4 w-4" />
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {content}
      </CardContent>
    </Card>
  );
}

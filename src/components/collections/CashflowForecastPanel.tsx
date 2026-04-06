import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatINR } from "@/utils/finance";
import { TrendingUp, TrendingDown, Calendar, IndianRupee } from "lucide-react";
import { ForecastBucket } from "@/hooks/useCashflowForecast";

interface Props {
  buckets: ForecastBucket[];
  totalExpected: number;
  riskAdjusted: number;
  isLoading?: boolean;
}

export function CashflowForecastPanel({ buckets, totalExpected, riskAdjusted, isLoading }: Props) {
  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6 text-center text-muted-foreground">Loading forecast...</CardContent>
      </Card>
    );
  }

  const confidence = totalExpected > 0 ? Math.round((riskAdjusted / totalExpected) * 100) : 0;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-emerald-600" />
            Cashflow Forecast
          </CardTitle>
          <Badge variant="outline" className="text-xs">
            {confidence}% confidence
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-3 gap-3">
          {buckets.map((b) => (
            <div key={b.label} className="p-3 rounded-lg border bg-muted/30">
              <div className="flex items-center gap-1.5 mb-1">
                <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-xs font-medium text-muted-foreground">{b.label}</span>
              </div>
              <p className="text-lg font-bold">{formatINR(b.expected)}</p>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-[10px] text-muted-foreground">{b.invoiceCount} invoices</span>
                {b.promised > 0 && (
                  <Badge className="text-[9px] bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                    {formatINR(b.promised)} promised
                  </Badge>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between pt-2 border-t text-sm">
          <div className="flex items-center gap-1.5">
            <IndianRupee className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-muted-foreground">Risk-Adjusted Estimate</span>
          </div>
          <span className="font-semibold">{formatINR(riskAdjusted)}</span>
        </div>
      </CardContent>
    </Card>
  );
}

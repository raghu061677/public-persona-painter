import { ReactNode } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { cn } from "@/lib/utils";

interface KPITile {
  label: string;
  value: string | number;
  icon: ReactNode;
  trend?: {
    value: number;
    direction: 'up' | 'down' | 'neutral';
  };
  subLabel?: string;
  color?: 'default' | 'success' | 'warning' | 'danger' | 'info';
}

interface ReportKPICardsProps {
  kpis: KPITile[];
  className?: string;
  columns?: 3 | 4 | 5 | 6;
}

const colorClasses = {
  default: "text-foreground",
  success: "text-emerald-600",
  warning: "text-amber-600",
  danger: "text-red-600",
  info: "text-blue-600",
};

const trendColors = {
  up: "text-emerald-600 bg-emerald-50",
  down: "text-red-600 bg-red-50",
  neutral: "text-muted-foreground bg-muted",
};

export function ReportKPICards({ 
  kpis, 
  className,
  columns = 4 
}: ReportKPICardsProps) {
  const gridCols = {
    3: "md:grid-cols-3",
    4: "md:grid-cols-4",
    5: "md:grid-cols-5",
    6: "md:grid-cols-6",
  };

  return (
    <div className={cn(
      "grid gap-4 grid-cols-2",
      gridCols[columns],
      className
    )}>
      {kpis.map((kpi, index) => (
        <Card key={index} className="relative overflow-hidden">
          <CardContent className="pt-6">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className="text-sm font-medium text-muted-foreground">
                  {kpi.label}
                </p>
                <div className="flex items-baseline gap-2 mt-2">
                  <p className={cn(
                    "text-2xl font-bold",
                    colorClasses[kpi.color || 'default']
                  )}>
                    {typeof kpi.value === 'number' 
                      ? kpi.value.toLocaleString() 
                      : kpi.value}
                  </p>
                  {kpi.trend && (
                    <span className={cn(
                      "inline-flex items-center gap-0.5 text-xs font-medium px-1.5 py-0.5 rounded-full",
                      trendColors[kpi.trend.direction]
                    )}>
                      {kpi.trend.direction === 'up' && <TrendingUp className="h-3 w-3" />}
                      {kpi.trend.direction === 'down' && <TrendingDown className="h-3 w-3" />}
                      {kpi.trend.direction === 'neutral' && <Minus className="h-3 w-3" />}
                      {Math.abs(kpi.trend.value)}%
                    </span>
                  )}
                </div>
                {kpi.subLabel && (
                  <p className="text-xs text-muted-foreground mt-1">
                    {kpi.subLabel}
                  </p>
                )}
              </div>
              <div className={cn(
                "p-2 rounded-lg bg-muted/50",
                colorClasses[kpi.color || 'default']
              )}>
                {kpi.icon}
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

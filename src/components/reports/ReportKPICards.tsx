import { ReactNode } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

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

const colorConfig = {
  default: {
    text: "text-foreground",
    iconBg: "bg-muted text-muted-foreground",
    gradient: "from-muted/50 to-transparent",
    border: "border-border/50",
  },
  success: {
    text: "text-emerald-700 dark:text-emerald-400",
    iconBg: "bg-emerald-100 text-emerald-600 dark:bg-emerald-900/50 dark:text-emerald-400",
    gradient: "from-emerald-50 to-transparent dark:from-emerald-950/30 dark:to-transparent",
    border: "border-emerald-200/60 dark:border-emerald-800/40",
  },
  warning: {
    text: "text-amber-700 dark:text-amber-400",
    iconBg: "bg-amber-100 text-amber-600 dark:bg-amber-900/50 dark:text-amber-400",
    gradient: "from-amber-50 to-transparent dark:from-amber-950/30 dark:to-transparent",
    border: "border-amber-200/60 dark:border-amber-800/40",
  },
  danger: {
    text: "text-rose-700 dark:text-rose-400",
    iconBg: "bg-rose-100 text-rose-600 dark:bg-rose-900/50 dark:text-rose-400",
    gradient: "from-rose-50 to-transparent dark:from-rose-950/30 dark:to-transparent",
    border: "border-rose-200/60 dark:border-rose-800/40",
  },
  info: {
    text: "text-blue-700 dark:text-blue-400",
    iconBg: "bg-blue-100 text-blue-600 dark:bg-blue-900/50 dark:text-blue-400",
    gradient: "from-blue-50 to-transparent dark:from-blue-950/30 dark:to-transparent",
    border: "border-blue-200/60 dark:border-blue-800/40",
  },
};

const trendColors = {
  up: "text-emerald-600 bg-emerald-50 dark:bg-emerald-900/40",
  down: "text-rose-600 bg-rose-50 dark:bg-rose-900/40",
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
      {kpis.map((kpi, index) => {
        const colors = colorConfig[kpi.color || 'default'];
        return (
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 16, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.4, delay: index * 0.08, ease: "easeOut" }}
          >
            <Card className={cn(
              "relative overflow-hidden border transition-shadow duration-300 hover:shadow-md",
              colors.border
            )}>
              {/* Gradient background overlay */}
              <div className={cn(
                "absolute inset-0 bg-gradient-to-br opacity-60 pointer-events-none",
                colors.gradient
              )} />
              <CardContent className="pt-6 relative z-10">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-muted-foreground">
                      {kpi.label}
                    </p>
                    <div className="flex items-baseline gap-2 mt-2">
                      <motion.p
                        className={cn("text-2xl font-bold", colors.text)}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.5, delay: index * 0.08 + 0.2 }}
                      >
                        {typeof kpi.value === 'number' 
                          ? kpi.value.toLocaleString() 
                          : kpi.value}
                      </motion.p>
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
                  <motion.div
                    className={cn("p-2.5 rounded-xl", colors.iconBg)}
                    whileHover={{ scale: 1.1, rotate: 5 }}
                    transition={{ type: "spring", stiffness: 300 }}
                  >
                    {kpi.icon}
                  </motion.div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        );
      })}
    </div>
  );
}

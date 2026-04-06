import { Card, CardContent } from "@/components/ui/card";
import { formatINR } from "@/utils/finance";
import { CollectionMetrics } from "@/hooks/useCollectionMetrics";
import { TrendingUp, Clock, Target, Percent } from "lucide-react";

interface Props {
  metrics: CollectionMetrics;
  isLoading: boolean;
}

export function CollectionPerformanceCards({ metrics, isLoading }: Props) {
  if (isLoading) return null;

  const cards = [
    {
      label: "Collection Rate",
      value: `${metrics.collectionRate}%`,
      sub: `${formatINR(metrics.totalCollected)} of ${formatINR(metrics.totalInvoiced)}`,
      icon: Percent,
      color: metrics.collectionRate >= 80 ? "text-emerald-600" : metrics.collectionRate >= 60 ? "text-amber-600" : "text-red-600",
    },
    {
      label: "Avg Collection Days",
      value: `${metrics.avgCollectionDays}d`,
      sub: "Invoice to first payment",
      icon: Clock,
      color: metrics.avgCollectionDays <= 30 ? "text-emerald-600" : metrics.avgCollectionDays <= 60 ? "text-amber-600" : "text-red-600",
    },
    {
      label: "Follow-up Effectiveness",
      value: `${metrics.followupEffectiveness}%`,
      sub: `${metrics.resolvedAfterFollowup} of ${metrics.activeFollowups} resolved`,
      icon: Target,
      color: metrics.followupEffectiveness >= 60 ? "text-emerald-600" : "text-amber-600",
    },
    {
      label: "Non-Overdue Rate",
      value: `${metrics.overdueReduction}%`,
      sub: "Active invoices on-time",
      icon: TrendingUp,
      color: metrics.overdueReduction >= 70 ? "text-emerald-600" : "text-amber-600",
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {cards.map((c) => (
        <Card key={c.label}>
          <CardContent className="p-3">
            <div className="flex items-center gap-2 mb-1">
              <c.icon className={`h-4 w-4 ${c.color}`} />
              <span className="text-[11px] text-muted-foreground">{c.label}</span>
            </div>
            <p className={`text-xl font-bold ${c.color}`}>{c.value}</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">{c.sub}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

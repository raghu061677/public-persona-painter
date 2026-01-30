import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatINR } from "@/utils/finance";
import { 
  Receipt, 
  CreditCard, 
  CheckCircle2, 
  AlertCircle,
  Percent,
  TrendingUp
} from "lucide-react";
import type { ExpenseStats } from "@/types/expenses";

interface ExpenseKPICardsProps {
  stats: ExpenseStats;
  loading?: boolean;
}

export function ExpenseKPICards({ stats, loading }: ExpenseKPICardsProps) {
  const cards = [
    {
      title: "Total Expenses",
      value: formatINR(stats.total_expenses),
      subtitle: `${stats.count} entries`,
      icon: Receipt,
      color: "text-blue-600",
      bgColor: "bg-blue-50",
    },
    {
      title: "Unpaid Amount",
      value: formatINR(stats.unpaid_amount),
      subtitle: "Pending payment",
      icon: AlertCircle,
      color: "text-amber-600",
      bgColor: "bg-amber-50",
    },
    {
      title: "Paid Amount",
      value: formatINR(stats.paid_amount),
      subtitle: "Settled",
      icon: CheckCircle2,
      color: "text-green-600",
      bgColor: "bg-green-50",
    },
    {
      title: "GST Total",
      value: formatINR(stats.gst_total),
      subtitle: "Input tax",
      icon: Percent,
      color: "text-purple-600",
      bgColor: "bg-purple-50",
    },
    {
      title: "TDS Total",
      value: formatINR(stats.tds_total),
      subtitle: "Deducted at source",
      icon: CreditCard,
      color: "text-rose-600",
      bgColor: "bg-rose-50",
    },
    {
      title: "Top Category",
      value: stats.top_category || "N/A",
      subtitle: formatINR(stats.top_category_amount),
      icon: TrendingUp,
      color: "text-indigo-600",
      bgColor: "bg-indigo-50",
    },
  ];

  if (loading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {[...Array(6)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader className="pb-2">
              <div className="h-4 bg-muted rounded w-24" />
            </CardHeader>
            <CardContent>
              <div className="h-7 bg-muted rounded w-20 mb-1" />
              <div className="h-3 bg-muted rounded w-16" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
      {cards.map((card, index) => (
        <Card key={index} className="hover:shadow-md transition-shadow">
          <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-xs font-medium text-muted-foreground">
              {card.title}
            </CardTitle>
            <div className={`p-2 rounded-lg ${card.bgColor}`}>
              <card.icon className={`h-4 w-4 ${card.color}`} />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold truncate">{card.value}</div>
            <p className="text-xs text-muted-foreground truncate">{card.subtitle}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

import { Card, CardContent } from "@/components/ui/card";
import { formatINR } from "@/utils/finance";
import { DollarSign, AlertTriangle, TrendingUp, FileText } from "lucide-react";

interface FinanceKPIProps {
  totalReceivables: number;
  overdueAmount: number;
  collectedThisMonth: number;
  outstandingCount: number;
}

export function FinanceKPICards({ totalReceivables, overdueAmount, collectedThisMonth, outstandingCount }: FinanceKPIProps) {
  const cards = [
    {
      title: "Total Receivables",
      value: formatINR(totalReceivables),
      icon: DollarSign,
      border: "border-l-amber-500",
      iconBg: "bg-amber-500/10 text-amber-600",
    },
    {
      title: "Overdue Amount",
      value: formatINR(overdueAmount),
      icon: AlertTriangle,
      border: "border-l-red-500",
      iconBg: "bg-red-500/10 text-red-600",
    },
    {
      title: "Collected This Month",
      value: formatINR(collectedThisMonth),
      icon: TrendingUp,
      border: "border-l-green-500",
      iconBg: "bg-green-500/10 text-green-600",
    },
    {
      title: "Outstanding Invoices",
      value: String(outstandingCount),
      icon: FileText,
      border: "border-l-blue-500",
      iconBg: "bg-blue-500/10 text-blue-600",
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((c) => {
        const Icon = c.icon;
        return (
          <Card key={c.title} className={`border-l-4 ${c.border}`}>
            <CardContent className="pt-5 pb-4">
              <div className="flex items-center justify-between mb-1">
                <p className="text-sm font-medium text-muted-foreground">{c.title}</p>
                <div className={`rounded-full p-2 ${c.iconBg}`}>
                  <Icon className="h-4 w-4" />
                </div>
              </div>
              <p className="text-2xl font-bold">{c.value}</p>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

import { Card, CardContent } from "@/components/ui/card";
import { DollarSign, AlertTriangle, Flame, Bell } from "lucide-react";
import { formatINR } from "@/utils/finance";

interface CollectionKPIs {
  totalOutstanding: number;
  totalOverdue: number;
  highPriorityCount: number;
  followupsDueToday: number;
}

export function CollectionKPICards({ kpis }: { kpis: CollectionKPIs }) {
  const cards = [
    { label: "Total Outstanding", value: formatINR(kpis.totalOutstanding), icon: DollarSign, color: "text-blue-600" },
    { label: "Total Overdue", value: formatINR(kpis.totalOverdue), icon: AlertTriangle, color: "text-red-600" },
    { label: "High Priority", value: String(kpis.highPriorityCount), icon: Flame, color: "text-orange-600" },
    { label: "Follow-ups Due Today", value: String(kpis.followupsDueToday), icon: Bell, color: "text-amber-600" },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((c) => (
        <Card key={c.label}>
          <CardContent className="p-4 flex items-center gap-3">
            <div className={`p-2 rounded-lg bg-muted ${c.color}`}>
              <c.icon className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">{c.label}</p>
              <p className="text-lg font-bold">{c.value}</p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

import { Card, CardContent } from "@/components/ui/card";
import {
  Layers,
  ShieldCheck,
  MapPin,
  TrendingUp,
  Lightbulb,
  Calendar,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/utils/mediaAssets";

interface SummaryCardsProps {
  totalAssets: number;
  availableAssets: number;
  bookedAssets: number;
  uniqueCities: number;
  litAssets: number;
  newThisMonth: number;
  totalValue: number;
}

export function SummaryCards({
  totalAssets,
  availableAssets,
  bookedAssets,
  uniqueCities,
  litAssets,
  newThisMonth,
  totalValue,
}: SummaryCardsProps) {
  const cards = [
    {
      title: "Total Assets",
      value: totalAssets,
      icon: Layers,
      color: "text-blue-600",
      bgColor: "bg-blue-50 dark:bg-blue-950/20",
    },
    {
      title: "Available",
      value: availableAssets,
      icon: ShieldCheck,
      color: "text-green-600",
      bgColor: "bg-green-50 dark:bg-green-950/20",
    },
    {
      title: "Booked",
      value: bookedAssets,
      icon: Calendar,
      color: "text-purple-600",
      bgColor: "bg-purple-50 dark:bg-purple-950/20",
    },
    {
      title: "Cities",
      value: uniqueCities,
      icon: MapPin,
      color: "text-orange-600",
      bgColor: "bg-orange-50 dark:bg-orange-950/20",
    },
    {
      title: "Lit Assets",
      value: litAssets,
      icon: Lightbulb,
      color: "text-yellow-600",
      bgColor: "bg-yellow-50 dark:bg-yellow-950/20",
    },
    {
      title: "New This Month",
      value: newThisMonth,
      icon: TrendingUp,
      color: "text-indigo-600",
      bgColor: "bg-indigo-50 dark:bg-indigo-950/20",
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <Card key={card.title} className="overflow-hidden">
            <CardContent className="p-3">
              <div className="flex items-start justify-between mb-2">
                <div className={cn("p-2 rounded-lg", card.bgColor)}>
                  <Icon className={cn("h-4 w-4", card.color)} />
                </div>
              </div>
              <div className="space-y-1">
                <p className="text-2xl font-bold">{card.value}</p>
                <p className="text-xs text-muted-foreground">{card.title}</p>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

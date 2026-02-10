import { useMemo } from "react";
import { FileText, IndianRupee, CheckCircle, Clock, HelpCircle } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface PlansSummaryBarProps {
  plans: any[];
}

function formatINRCompact(n: number): string {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);
}

export function PlansSummaryBar({ plans }: PlansSummaryBarProps) {
  const stats = useMemo(() => {
    let totalValue = 0, approvedValue = 0, draftSentValue = 0;
    for (const plan of plans) {
      const amt = Number(plan.grand_total || plan.total_amount) || 0;
      const status = (plan.status || "").toLowerCase();
      if (status === "rejected" || status === "cancelled") continue;
      totalValue += amt;
      if (status === "approved" || status === "converted") approvedValue += amt;
      if (status === "draft" || status === "sent" || status === "pending") draftSentValue += amt;
    }
    return { count: plans.length, totalValue, approvedValue, draftSentValue };
  }, [plans]);

  const tiles = [
    { label: "Plans Shown", value: String(stats.count), icon: FileText, hint: "Total plans matching current filters" },
    { label: "Total Value", value: formatINRCompact(stats.totalValue), icon: IndianRupee, hint: "Sum of grand_total for all non-rejected plans" },
    { label: "Approved Value", value: formatINRCompact(stats.approvedValue), icon: CheckCircle, hint: "Sum where status is Approved or Converted" },
    { label: "Draft + Sent", value: formatINRCompact(stats.draftSentValue), icon: Clock, hint: "Sum where status is Draft, Sent, or Pending" },
  ];

  return (
    <TooltipProvider delayDuration={200}>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        {tiles.map((t) => (
          <div key={t.label} className="flex items-center gap-3 rounded-lg border bg-card px-4 py-3">
            <t.icon className="h-4 w-4 text-muted-foreground shrink-0" />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1">
                <span className="text-xs text-muted-foreground truncate">{t.label}</span>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <HelpCircle className="h-3 w-3 text-muted-foreground/50 shrink-0" />
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-[200px]"><p className="text-xs">{t.hint}</p></TooltipContent>
                </Tooltip>
              </div>
              <p className="text-sm font-semibold truncate">{t.value}</p>
            </div>
          </div>
        ))}
      </div>
    </TooltipProvider>
  );
}

import { useMemo } from "react";
import { FileText, IndianRupee, Clock, CheckCircle, HelpCircle } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface ExpensesSummaryBarProps {
  expenses: any[];
}

function formatINRCompact(n: number): string {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);
}

export function ExpensesSummaryBar({ expenses }: ExpensesSummaryBarProps) {
  const stats = useMemo(() => {
    let total = 0, pending = 0, paid = 0;
    for (const exp of expenses) {
      const amt = Number(exp.total_amount || exp.amount) || 0;
      if (exp.payment_status === "Cancelled" || exp.approval_status === "Cancelled") continue;
      total += amt;
      if (exp.payment_status === "Paid") paid += amt;
      else if (exp.payment_status === "Pending") pending += amt;
    }
    return { count: expenses.length, total, pending, paid };
  }, [expenses]);

  const tiles = [
    { label: "Expenses Shown", value: String(stats.count), icon: FileText, hint: "Total expenses matching current filters" },
    { label: "Total Expenses", value: formatINRCompact(stats.total), icon: IndianRupee, hint: "Sum of total_amount for all non-cancelled expenses" },
    { label: "Pending Amount", value: formatINRCompact(stats.pending), icon: Clock, hint: "Sum where payment_status is Pending" },
    { label: "Paid Amount", value: formatINRCompact(stats.paid), icon: CheckCircle, hint: "Sum where payment_status is Paid" },
  ];

  return (
    <TooltipProvider delayDuration={200}>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
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

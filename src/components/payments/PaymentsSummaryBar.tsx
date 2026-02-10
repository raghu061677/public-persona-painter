import { useMemo } from "react";
import { FileText, AlertTriangle, Clock, IndianRupee } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { HelpCircle } from "lucide-react";

interface PaymentsSummaryBarProps {
  invoices: any[];
}

function formatINRCompact(n: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(n);
}

function todayStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function PaymentsSummaryBar({ invoices }: PaymentsSummaryBarProps) {
  const stats = useMemo(() => {
    const today = todayStr();
    const sevenDaysLater = (() => {
      const d = new Date();
      d.setDate(d.getDate() + 7);
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    })();

    let totalOutstanding = 0;
    let overdueOutstanding = 0;
    let dueSoon = 0;
    let paidAmount = 0;

    for (const inv of invoices) {
      const status = (inv.status || "").toLowerCase();
      if (status === "cancelled") continue;

      const bal = Number(inv.balance_due) || 0;
      const total = Number(inv.total_amount) || 0;

      totalOutstanding += bal;

      if (status === "paid") {
        paidAmount += total;
        continue;
      }

      if (bal <= 0) continue;

      const dueDate = inv.due_date ? String(inv.due_date).substring(0, 10) : null;
      if (dueDate) {
        if (dueDate < today) {
          overdueOutstanding += bal;
        } else if (dueDate <= sevenDaysLater) {
          dueSoon += bal;
        }
      }
    }

    return {
      count: invoices.length,
      totalOutstanding,
      overdueOutstanding,
      dueSoon,
      paidAmount,
    };
  }, [invoices]);

  const tiles = [
    {
      label: "Records Shown",
      value: String(stats.count),
      icon: FileText,
      hint: "Total payment records matching current filters",
    },
    {
      label: "Total Outstanding",
      value: formatINRCompact(stats.totalOutstanding),
      icon: IndianRupee,
      hint: "Sum of balance_due for all non-cancelled records",
    },
    {
      label: "Overdue",
      value: formatINRCompact(stats.overdueOutstanding),
      icon: AlertTriangle,
      hint: "Balance due where due date has passed and payment is pending",
    },
    {
      label: "Due Soon (7d)",
      value: formatINRCompact(stats.dueSoon),
      icon: Clock,
      hint: "Balance due within the next 7 days",
    },
  ];

  return (
    <TooltipProvider delayDuration={200}>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {tiles.map((t) => (
          <div
            key={t.label}
            className="flex items-center gap-3 rounded-lg border bg-card px-4 py-3"
          >
            <t.icon className="h-4 w-4 text-muted-foreground shrink-0" />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1">
                <span className="text-xs text-muted-foreground truncate">{t.label}</span>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <HelpCircle className="h-3 w-3 text-muted-foreground/50 shrink-0" />
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-[200px]">
                    <p className="text-xs">{t.hint}</p>
                  </TooltipContent>
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

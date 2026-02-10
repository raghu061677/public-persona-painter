import { useMemo } from "react";
import { FileText, IndianRupee, AlertTriangle, CheckCircle, HelpCircle } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface PowerBillsSummaryBarProps {
  bills: any[];
}

function formatINRCompact(n: number): string {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);
}

function todayStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function PowerBillsSummaryBar({ bills }: PowerBillsSummaryBarProps) {
  const stats = useMemo(() => {
    const today = todayStr();
    let totalPayable = 0, overduePayable = 0, paidTotal = 0;

    for (const bill of bills) {
      const amt = Number(bill.bill_amount) || 0;
      const status = bill.payment_status || "Pending";

      if (status === "Paid") {
        paidTotal += Number(bill.paid_amount) || amt;
      } else {
        totalPayable += amt;
        const dueDate = bill.due_date ? String(bill.due_date).substring(0, 10) : null;
        if (status === "Overdue" || (dueDate && dueDate < today)) {
          overduePayable += amt;
        }
      }
    }
    return { count: bills.length, totalPayable, overduePayable, paidTotal };
  }, [bills]);

  const tiles = [
    { label: "Bills Shown", value: String(stats.count), icon: FileText, hint: "Total bills matching current filters" },
    { label: "Total Payable", value: formatINRCompact(stats.totalPayable), icon: IndianRupee, hint: "Sum of bill_amount for Pending + Overdue bills" },
    { label: "Overdue Payable", value: formatINRCompact(stats.overduePayable), icon: AlertTriangle, hint: "Sum where payment is overdue or past due date" },
    { label: "Paid (Filtered)", value: formatINRCompact(stats.paidTotal), icon: CheckCircle, hint: "Sum of paid_amount for Paid bills in current view" },
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

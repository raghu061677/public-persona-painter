import { format, startOfMonth, endOfMonth, addDays, subMonths } from "date-fns";
import { cn } from "@/lib/utils";
import type { PowerBillFilters } from "./PowerBillAdvancedFilters";

interface PowerBillQuickChipsProps {
  filters: PowerBillFilters;
  onFiltersChange: (filters: PowerBillFilters) => void;
  onOpenAdvanced: () => void;
}

const STATUS_CHIPS: { label: string; value: string[] | undefined }[] = [
  { label: "All", value: undefined },
  { label: "Pending", value: ["Pending"] },
  { label: "Overdue", value: ["Overdue"] },
  { label: "Paid", value: ["Paid"] },
];

export function PowerBillQuickChips({ filters, onFiltersChange, onOpenAdvanced }: PowerBillQuickChipsProps) {
  const now = new Date();

  const isStatusActive = (v: string[] | undefined) => {
    if (!v) return !filters.status || filters.status.length === 0;
    return filters.status?.length === v.length && v.every(x => filters.status?.includes(x));
  };

  const chipClass = (active: boolean) =>
    cn("px-3 py-1 rounded-full text-xs font-medium border transition-all",
      active ? "bg-primary text-primary-foreground border-primary" : "bg-card text-muted-foreground border-border hover:border-primary/50 hover:text-foreground");

  const handleThisMonth = () => {
    onFiltersChange({ ...filters, month: format(now, "yyyy-MM"), duration_days: undefined });
  };
  const handleLastMonth = () => {
    onFiltersChange({ ...filters, month: format(subMonths(now, 1), "yyyy-MM"), duration_days: undefined });
  };
  const handleDueDuration = (days: number) => {
    const from = format(now, "yyyy-MM-dd");
    const to = format(addDays(now, days), "yyyy-MM-dd");
    onFiltersChange({ ...filters, due_between: { from, to }, duration_days: days, month: undefined });
  };

  const isThisMonth = filters.month === format(now, "yyyy-MM");
  const isLastMonth = filters.month === format(subMonths(now, 1), "yyyy-MM");

  return (
    <div className="space-y-2 mb-4">
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="text-xs text-muted-foreground font-medium mr-1">Status:</span>
        {STATUS_CHIPS.map(chip => (
          <button key={chip.label} onClick={() => onFiltersChange({ ...filters, status: chip.value })} className={chipClass(isStatusActive(chip.value))}>{chip.label}</button>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="text-xs text-muted-foreground font-medium mr-1">Period:</span>
        <button onClick={handleThisMonth} className={chipClass(isThisMonth)}>This Month</button>
        <button onClick={handleLastMonth} className={chipClass(isLastMonth)}>Last Month</button>
        {[7, 15].map(d => (
          <button key={d} onClick={() => handleDueDuration(d)} className={chipClass(filters.duration_days === d)}>Due {d}d</button>
        ))}
        <button onClick={onOpenAdvanced} className="px-3 py-1 rounded-full text-xs font-medium border border-dashed border-border text-muted-foreground hover:border-primary/50 hover:text-foreground transition-all">Custom…</button>
      </div>
    </div>
  );
}

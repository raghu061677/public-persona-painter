import { X, RotateCcw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { PeriodKey } from "@/components/common/DatePeriodFilter";

interface PlanFilterPillsProps {
  filterStatus: string;
  datePeriod: PeriodKey;
  fyFilter: string;
  searchTerm: string;
  viewMode: string;
  onClearStatus: () => void;
  onClearDatePeriod: () => void;
  onClearFY: () => void;
  onClearSearch: () => void;
  onClearAll: () => void;
}

export function PlanFilterPills({
  filterStatus,
  datePeriod,
  fyFilter,
  searchTerm,
  viewMode,
  onClearStatus,
  onClearDatePeriod,
  onClearFY,
  onClearSearch,
  onClearAll,
}: PlanFilterPillsProps) {
  const pills: { label: string; onClear: () => void }[] = [];

  if (filterStatus) {
    pills.push({ label: `Status: ${filterStatus}`, onClear: onClearStatus });
  }
  if (datePeriod && datePeriod !== "all") {
    const labels: Record<string, string> = {
      current_month: "Current Month",
      last_month: "Last Month",
      last_3_months: "Last 3 Months",
      this_fy: "This FY",
      last_fy: "Last FY",
      custom: "Custom Range",
    };
    pills.push({ label: `Period: ${labels[datePeriod] || datePeriod}`, onClear: onClearDatePeriod });
  }
  if (fyFilter && fyFilter !== "all") {
    pills.push({ label: `FY: ${fyFilter}`, onClear: onClearFY });
  }
  if (searchTerm) {
    pills.push({ label: `Search: "${searchTerm}"`, onClear: onClearSearch });
  }

  if (pills.length === 0) return null;

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {pills.map((pill) => (
        <Badge
          key={pill.label}
          variant="secondary"
          className="gap-1 pr-1 text-xs font-normal"
        >
          {pill.label}
          <button
            onClick={pill.onClear}
            className="ml-0.5 rounded-full p-0.5 hover:bg-muted-foreground/20"
          >
            <X className="h-3 w-3" />
          </button>
        </Badge>
      ))}
      {pills.length > 1 && (
        <Button variant="ghost" size="sm" onClick={onClearAll} className="h-6 text-xs gap-1 px-2">
          <RotateCcw className="h-3 w-3" />
          Clear All
        </Button>
      )}
    </div>
  );
}

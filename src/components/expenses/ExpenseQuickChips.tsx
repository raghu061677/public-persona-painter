import { format, startOfMonth, endOfMonth, addDays, subMonths, subDays } from "date-fns";
import { cn } from "@/lib/utils";
import type { ExpenseFilters } from "./ExpenseAdvancedFilters";
import type { ListViewPreset } from "@/hooks/useListViewPreset";

interface ExpenseQuickChipsProps {
  filters: ExpenseFilters;
  onFiltersChange: (filters: ExpenseFilters) => void;
  presets: ListViewPreset[];
  activePreset: ListViewPreset | null;
  onPresetSelect: (preset: ListViewPreset) => void;
  onOpenAdvanced: () => void;
}

const STATUS_CHIPS: { label: string; value: string[] | undefined }[] = [
  { label: "All", value: undefined },
  { label: "Pending", value: ["Pending"] },
  { label: "Paid", value: ["Paid"] },
];

const CATEGORY_CHIPS = ["Printing", "Mounting", "Transport", "Other"];

const PRESET_NAMES = ["Vendor Payables", "Printing Spend", "Campaign Spend"];

export function ExpenseQuickChips({
  filters,
  onFiltersChange,
  presets,
  activePreset,
  onPresetSelect,
  onOpenAdvanced,
}: ExpenseQuickChipsProps) {
  const now = new Date();

  const isStatusActive = (v: string[] | undefined) => {
    if (!v) return !filters.payment_status || filters.payment_status.length === 0;
    return (
      filters.payment_status?.length === v.length &&
      v.every((x) => filters.payment_status?.includes(x))
    );
  };

  const isCategoryActive = (c: string) => {
    return filters.category?.length === 1 && filters.category[0] === c;
  };

  const chipClass = (active: boolean) =>
    cn(
      "px-3 py-1 rounded-full text-xs font-medium border transition-all",
      active
        ? "bg-primary text-primary-foreground border-primary"
        : "bg-card text-muted-foreground border-border hover:border-primary/50 hover:text-foreground"
    );

  const handleThisMonth = () => {
    const from = format(startOfMonth(now), "yyyy-MM-dd");
    const to = format(endOfMonth(now), "yyyy-MM-dd");
    onFiltersChange({
      ...filters,
      date_between: { from, to },
      month: format(now, "yyyy-MM"),
      duration_days: undefined,
    });
  };

  const handleLastMonth = () => {
    const prev = subMonths(now, 1);
    const from = format(startOfMonth(prev), "yyyy-MM-dd");
    const to = format(endOfMonth(prev), "yyyy-MM-dd");
    onFiltersChange({
      ...filters,
      date_between: { from, to },
      month: format(prev, "yyyy-MM"),
      duration_days: undefined,
    });
  };

  const handleDuration = (days: number) => {
    const from = format(subDays(now, days), "yyyy-MM-dd");
    const to = format(now, "yyyy-MM-dd");
    onFiltersChange({
      ...filters,
      date_between: { from, to },
      duration_days: days,
      month: undefined,
    });
  };

  const isThisMonth = filters.month === format(now, "yyyy-MM");
  const isLastMonth = filters.month === format(subMonths(now, 1), "yyyy-MM");

  const specialPresets = presets.filter((p) => PRESET_NAMES.includes(p.preset_name));

  return (
    <div className="space-y-2 mb-4">
      {/* Row 1: Payment Status */}
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="text-xs text-muted-foreground font-medium mr-1">Status:</span>
        {STATUS_CHIPS.map((chip) => (
          <button
            key={chip.label}
            onClick={() => onFiltersChange({ ...filters, payment_status: chip.value })}
            className={chipClass(isStatusActive(chip.value))}
          >
            {chip.label}
          </button>
        ))}
      </div>

      {/* Row 2: Category */}
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="text-xs text-muted-foreground font-medium mr-1">Category:</span>
        <button
          onClick={() => onFiltersChange({ ...filters, category: undefined })}
          className={chipClass(!filters.category || filters.category.length === 0)}
        >
          All
        </button>
        {CATEGORY_CHIPS.map((c) => (
          <button
            key={c}
            onClick={() => onFiltersChange({ ...filters, category: [c] })}
            className={chipClass(isCategoryActive(c))}
          >
            {c}
          </button>
        ))}
      </div>

      {/* Row 3: Time */}
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="text-xs text-muted-foreground font-medium mr-1">Period:</span>
        <button onClick={handleThisMonth} className={chipClass(isThisMonth)}>
          This Month
        </button>
        <button onClick={handleLastMonth} className={chipClass(isLastMonth)}>
          Last Month
        </button>
        {[15, 30].map((d) => (
          <button
            key={d}
            onClick={() => handleDuration(d)}
            className={chipClass(filters.duration_days === d)}
          >
            Last {d}d
          </button>
        ))}
        <button
          onClick={onOpenAdvanced}
          className="px-3 py-1 rounded-full text-xs font-medium border border-dashed border-border text-muted-foreground hover:border-primary/50 hover:text-foreground transition-all"
        >
          Custom…
        </button>
      </div>

      {/* Row 4: Preset Chips */}
      {specialPresets.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-xs text-muted-foreground font-medium mr-1">Views:</span>
          {specialPresets.map((preset) => (
            <button
              key={preset.id}
              onClick={() => onPresetSelect(preset)}
              className={cn(
                "px-3 py-1 rounded-full text-xs font-medium border transition-all",
                activePreset?.id === preset.id
                  ? "bg-accent text-accent-foreground border-accent"
                  : "bg-card text-muted-foreground border-border hover:border-accent/50 hover:text-foreground"
              )}
            >
              {preset.preset_name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

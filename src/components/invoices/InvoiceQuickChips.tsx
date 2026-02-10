import { format, startOfMonth, endOfMonth, addDays, subMonths } from "date-fns";
import { cn } from "@/lib/utils";
import type { InvoiceFilters } from "./InvoiceAdvancedFilters";
import type { ListViewPreset } from "@/hooks/useListViewPreset";

interface InvoiceQuickChipsProps {
  filters: InvoiceFilters;
  onFiltersChange: (filters: InvoiceFilters) => void;
  presets: ListViewPreset[];
  activePreset: ListViewPreset | null;
  onPresetSelect: (preset: ListViewPreset) => void;
  onOpenAdvanced: () => void;
}

const STATUS_CHIPS: { label: string; value: string[] | undefined; special?: string }[] = [
  { label: "All", value: undefined },
  { label: "Overdue", value: ["Overdue"] },
  { label: "Unpaid", value: ["Sent", "Partial", "Overdue"] },
  { label: "Paid", value: ["Paid"] },
];

const PRESET_NAMES = ["Finance Follow-up", "Client Statement", "GST Summary"];

export function InvoiceQuickChips({
  filters,
  onFiltersChange,
  presets,
  activePreset,
  onPresetSelect,
  onOpenAdvanced,
}: InvoiceQuickChipsProps) {
  const now = new Date();

  const isStatusActive = (chipValue: string[] | undefined) => {
    if (!chipValue) return !filters.status || filters.status.length === 0;
    return (
      filters.status?.length === chipValue.length &&
      chipValue.every((v) => filters.status?.includes(v))
    );
  };

  const handleStatusChip = (value: string[] | undefined) => {
    onFiltersChange({ ...filters, status: value });
  };

  // "Due Soon" = due in next 7 days, unpaid
  const handleDueSoon = () => {
    const from = format(now, "yyyy-MM-dd");
    const to = format(addDays(now, 7), "yyyy-MM-dd");
    onFiltersChange({
      ...filters,
      status: ["Sent", "Partial", "Overdue"],
      due_between: { from, to },
      duration_days: 7,
      month: undefined,
    });
  };

  const isDueSoon =
    filters.duration_days === 7 &&
    filters.status?.includes("Sent");

  const handleThisMonth = () => {
    const from = format(startOfMonth(now), "yyyy-MM-dd");
    const to = format(endOfMonth(now), "yyyy-MM-dd");
    onFiltersChange({
      ...filters,
      invoice_between: { from, to },
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
      invoice_between: { from, to },
      month: format(prev, "yyyy-MM"),
      duration_days: undefined,
    });
  };

  const handleDueDuration = (days: number) => {
    const from = format(now, "yyyy-MM-dd");
    const to = format(addDays(now, days), "yyyy-MM-dd");
    onFiltersChange({
      ...filters,
      due_between: { from, to },
      duration_days: days,
      month: undefined,
    });
  };

  const isThisMonth = filters.month === format(now, "yyyy-MM");
  const isLastMonth = filters.month === format(subMonths(now, 1), "yyyy-MM");

  const specialPresets = presets.filter((p) => PRESET_NAMES.includes(p.preset_name));

  const chipClass = (active: boolean) =>
    cn(
      "px-3 py-1 rounded-full text-xs font-medium border transition-all",
      active
        ? "bg-primary text-primary-foreground border-primary"
        : "bg-card text-muted-foreground border-border hover:border-primary/50 hover:text-foreground"
    );

  return (
    <div className="space-y-2 mb-4">
      {/* Row 1: Status */}
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="text-xs text-muted-foreground font-medium mr-1">Status:</span>
        {STATUS_CHIPS.map((chip) => (
          <button
            key={chip.label}
            onClick={() => handleStatusChip(chip.value)}
            className={chipClass(isStatusActive(chip.value))}
          >
            {chip.label}
          </button>
        ))}
        <button
          onClick={handleDueSoon}
          className={chipClass(isDueSoon)}
        >
          Due Soon
        </button>
      </div>

      {/* Row 2: Time */}
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
            onClick={() => handleDueDuration(d)}
            className={chipClass(filters.duration_days === d && !isDueSoon)}
          >
            Due {d}d
          </button>
        ))}
        <button
          onClick={onOpenAdvanced}
          className="px-3 py-1 rounded-full text-xs font-medium border border-dashed border-border text-muted-foreground hover:border-primary/50 hover:text-foreground transition-all"
        >
          Custom…
        </button>
      </div>

      {/* Row 3: Preset Chips */}
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

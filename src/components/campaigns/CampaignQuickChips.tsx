import { format, startOfMonth, endOfMonth, addDays } from "date-fns";
import { cn } from "@/lib/utils";
import type { CampaignFilters } from "./CampaignAdvancedFilters";
import type { ListViewPreset } from "@/hooks/useListViewPreset";

interface CampaignQuickChipsProps {
  filters: CampaignFilters;
  onFiltersChange: (filters: CampaignFilters) => void;
  presets: ListViewPreset[];
  activePreset: ListViewPreset | null;
  onPresetSelect: (preset: ListViewPreset) => void;
  onOpenAdvanced: () => void;
}

const STATUS_CHIPS = [
  { label: "All", value: undefined as string[] | undefined },
  { label: "Running", value: ["Running"] },
  { label: "Upcoming", value: ["Upcoming"] },
  { label: "Completed", value: ["Completed"] },
];

const PRESET_NAMES = ["Finance View", "Ops View", "Client Share View"];

export function CampaignQuickChips({
  filters,
  onFiltersChange,
  presets,
  activePreset,
  onPresetSelect,
  onOpenAdvanced,
}: CampaignQuickChipsProps) {
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

  const handleDuration = (days: number) => {
    const from = format(now, "yyyy-MM-dd");
    const to = format(addDays(now, days), "yyyy-MM-dd");
    onFiltersChange({
      ...filters,
      date_between: { from, to },
      duration_days: days,
      month: undefined,
    });
  };

  const isThisMonth = filters.month === format(now, "yyyy-MM");
  const isDuration = (d: number) => filters.duration_days === d;

  const specialPresets = presets.filter((p) => PRESET_NAMES.includes(p.preset_name));

  return (
    <div className="space-y-2 mb-4">
      {/* Row 1: Status */}
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="text-xs text-muted-foreground font-medium mr-1">Status:</span>
        {STATUS_CHIPS.map((chip) => (
          <button
            key={chip.label}
            onClick={() => handleStatusChip(chip.value)}
            className={cn(
              "px-3 py-1 rounded-full text-xs font-medium border transition-all",
              isStatusActive(chip.value)
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-card text-muted-foreground border-border hover:border-primary/50 hover:text-foreground"
            )}
          >
            {chip.label}
          </button>
        ))}
      </div>

      {/* Row 2: Time */}
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="text-xs text-muted-foreground font-medium mr-1">Time:</span>
        <button
          onClick={handleThisMonth}
          className={cn(
            "px-3 py-1 rounded-full text-xs font-medium border transition-all",
            isThisMonth
              ? "bg-primary text-primary-foreground border-primary"
              : "bg-card text-muted-foreground border-border hover:border-primary/50 hover:text-foreground"
          )}
        >
          This Month
        </button>
        {[15, 30].map((d) => (
          <button
            key={d}
            onClick={() => handleDuration(d)}
            className={cn(
              "px-3 py-1 rounded-full text-xs font-medium border transition-all",
              isDuration(d)
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-card text-muted-foreground border-border hover:border-primary/50 hover:text-foreground"
            )}
          >
            Next {d} Days
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

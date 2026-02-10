import { useState, useEffect } from "react";
import { format, startOfMonth, endOfMonth, addDays } from "date-fns";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DateRangeFilter } from "@/components/common/date-range-filter";
import { SlidersHorizontal, X } from "lucide-react";
import type { DateRange } from "react-day-picker";

const CAMPAIGN_STATUSES = ["Draft", "Upcoming", "Running", "Completed", "Cancelled", "Archived"];
const DURATION_QUICK = [
  { label: "7 days", value: 7 },
  { label: "15 days", value: 15 },
  { label: "30 days", value: 30 },
  { label: "60 days", value: 60 },
  { label: "90 days", value: 90 },
];

export interface CampaignFilters {
  status?: string[];
  amount_min?: number;
  date_between?: { from: string; to: string };
  city_contains?: string;
  month?: string;
  duration_days?: number;
}

interface CampaignAdvancedFiltersProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  filters: CampaignFilters;
  onApply: (filters: CampaignFilters) => void;
  onReset: () => void;
}

export function CampaignAdvancedFilters({
  open,
  onOpenChange,
  filters,
  onApply,
  onReset,
}: CampaignAdvancedFiltersProps) {
  const [local, setLocal] = useState<CampaignFilters>({});

  useEffect(() => {
    if (open) setLocal({ ...filters });
  }, [open, filters]);

  const toggleStatus = (status: string) => {
    const current = local.status || [];
    const next = current.includes(status)
      ? current.filter((s) => s !== status)
      : [...current, status];
    setLocal({ ...local, status: next.length > 0 ? next : undefined });
  };

  const dateRange: DateRange | undefined =
    local.date_between
      ? { from: new Date(local.date_between.from), to: new Date(local.date_between.to) }
      : undefined;

  const handleDateChange = (range: DateRange | undefined) => {
    if (range?.from && range?.to) {
      setLocal({
        ...local,
        date_between: { from: format(range.from, "yyyy-MM-dd"), to: format(range.to, "yyyy-MM-dd") },
        month: undefined,
        duration_days: undefined,
      });
    } else {
      setLocal({ ...local, date_between: undefined });
    }
  };

  const handleMonthChange = (month: string) => {
    if (month === "none") {
      setLocal({ ...local, month: undefined });
      return;
    }
    const now = new Date();
    let target: Date;
    if (month === "current") target = now;
    else if (month === "last") target = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    else if (month === "next") target = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    else target = new Date(month + "-01");

    const mStart = startOfMonth(target);
    const mEnd = endOfMonth(target);
    setLocal({
      ...local,
      month: format(mStart, "yyyy-MM"),
      date_between: { from: format(mStart, "yyyy-MM-dd"), to: format(mEnd, "yyyy-MM-dd") },
      duration_days: undefined,
    });
  };

  const handleDuration = (days: number) => {
    const today = new Date();
    setLocal({
      ...local,
      duration_days: days,
      date_between: { from: format(today, "yyyy-MM-dd"), to: format(addDays(today, days), "yyyy-MM-dd") },
      month: undefined,
    });
  };

  const handleApply = () => {
    onApply(local);
    onOpenChange(false);
  };

  const handleReset = () => {
    setLocal({});
    onReset();
    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-[380px] sm:w-[420px] overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <SlidersHorizontal className="h-5 w-5" />
            Advanced Filters
          </SheetTitle>
        </SheetHeader>

        <div className="space-y-6 py-4">
          {/* Status Multi-Select */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Status</Label>
            <div className="flex flex-wrap gap-2">
              {CAMPAIGN_STATUSES.map((s) => (
                <label
                  key={s}
                  className="flex items-center gap-1.5 cursor-pointer"
                >
                  <Checkbox
                    checked={(local.status || []).includes(s)}
                    onCheckedChange={() => toggleStatus(s)}
                  />
                  <span className="text-sm">{s}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Amount Min */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Amount Greater Than</Label>
            <Input
              type="number"
              placeholder="e.g. 50000"
              value={local.amount_min || ""}
              onChange={(e) =>
                setLocal({ ...local, amount_min: e.target.value ? Number(e.target.value) : undefined })
              }
              className="h-9"
            />
          </div>

          {/* Date Range */}
          <DateRangeFilter
            label="Campaign Period (Overlap)"
            value={dateRange}
            onChange={handleDateChange}
            placeholder="Select date range"
          />

          {/* Quick Month Selector */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Quick Month</Label>
            <Select
              value={local.month || "none"}
              onValueChange={handleMonthChange}
            >
              <SelectTrigger className="h-9">
                <SelectValue placeholder="Select month" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                <SelectItem value="current">Current Month</SelectItem>
                <SelectItem value="last">Last Month</SelectItem>
                <SelectItem value="next">Next Month</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Duration Quick Buttons */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Duration (from today)</Label>
            <div className="flex flex-wrap gap-2">
              {DURATION_QUICK.map((d) => (
                <Button
                  key={d.value}
                  variant={local.duration_days === d.value ? "default" : "outline"}
                  size="sm"
                  onClick={() => handleDuration(d.value)}
                  className="text-xs"
                >
                  {d.label}
                </Button>
              ))}
            </div>
          </div>

          {/* City Contains */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">City Contains</Label>
            <Input
              placeholder="e.g. Hyderabad"
              value={local.city_contains || ""}
              onChange={(e) =>
                setLocal({ ...local, city_contains: e.target.value || undefined })
              }
              className="h-9"
            />
          </div>
        </div>

        <SheetFooter className="flex gap-2 pt-4 border-t">
          <Button variant="outline" size="sm" onClick={handleReset} className="gap-1">
            <X className="h-3.5 w-3.5" />
            Reset
          </Button>
          <Button size="sm" onClick={handleApply}>
            Apply Filters
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

/** Active filter pills component */
export function CampaignFilterPills({
  filters,
  onClear,
  onClearAll,
}: {
  filters: CampaignFilters;
  onClear: (key: keyof CampaignFilters) => void;
  onClearAll: () => void;
}) {
  const pills: { key: keyof CampaignFilters; label: string }[] = [];

  if (filters.status?.length) {
    pills.push({ key: "status", label: `Status: ${filters.status.join(", ")}` });
  }
  if (filters.amount_min) {
    pills.push({ key: "amount_min", label: `Amount > ₹${filters.amount_min.toLocaleString("en-IN")}` });
  }
  if (filters.date_between) {
    pills.push({ key: "date_between", label: `Period: ${filters.date_between.from} → ${filters.date_between.to}` });
  }
  if (filters.city_contains) {
    pills.push({ key: "city_contains", label: `City: ${filters.city_contains}` });
  }
  if (filters.month) {
    pills.push({ key: "month", label: `Month: ${filters.month}` });
  }
  if (filters.duration_days) {
    pills.push({ key: "duration_days", label: `Next ${filters.duration_days} days` });
  }

  if (pills.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-2 mb-3">
      <span className="text-xs text-muted-foreground font-medium">Active:</span>
      {pills.map((p) => (
        <Badge
          key={p.key}
          variant="secondary"
          className="gap-1 text-xs cursor-pointer hover:bg-destructive/10"
          onClick={() => onClear(p.key)}
        >
          {p.label}
          <X className="h-3 w-3" />
        </Badge>
      ))}
      <button
        className="text-xs text-destructive hover:underline ml-1"
        onClick={onClearAll}
      >
        Clear all
      </button>
    </div>
  );
}

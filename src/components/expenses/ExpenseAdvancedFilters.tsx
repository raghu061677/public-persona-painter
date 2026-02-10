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

const PAYMENT_STATUSES = ["Pending", "Paid", "Cancelled"];
const CATEGORIES = ["Printing", "Mounting", "Transport", "Electricity", "Other"];
const DURATION_QUICK = [
  { label: "7 days", value: 7 },
  { label: "15 days", value: 15 },
  { label: "30 days", value: 30 },
  { label: "60 days", value: 60 },
  { label: "90 days", value: 90 },
];

export interface ExpenseFilters {
  payment_status?: string[];
  category?: string[];
  vendor_contains?: string;
  amount_min?: number;
  gst_percent?: number;
  date_between?: { from: string; to: string };
  month?: string;
  duration_days?: number;
  campaign_contains?: string;
  asset_contains?: string;
}

interface ExpenseAdvancedFiltersProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  filters: ExpenseFilters;
  onApply: (filters: ExpenseFilters) => void;
  onReset: () => void;
}

export function ExpenseAdvancedFilters({
  open,
  onOpenChange,
  filters,
  onApply,
  onReset,
}: ExpenseAdvancedFiltersProps) {
  const [local, setLocal] = useState<ExpenseFilters>({});

  useEffect(() => {
    if (open) setLocal({ ...filters });
  }, [open, filters]);

  const toggleStatus = (s: string) => {
    const cur = local.payment_status || [];
    const next = cur.includes(s) ? cur.filter((x) => x !== s) : [...cur, s];
    setLocal({ ...local, payment_status: next.length > 0 ? next : undefined });
  };

  const toggleCategory = (c: string) => {
    const cur = local.category || [];
    const next = cur.includes(c) ? cur.filter((x) => x !== c) : [...cur, c];
    setLocal({ ...local, category: next.length > 0 ? next : undefined });
  };

  const dateRange: DateRange | undefined = local.date_between
    ? { from: new Date(local.date_between.from + "T12:00:00"), to: new Date(local.date_between.to + "T12:00:00") }
    : undefined;

  const handleDateChange = (range: DateRange | undefined) => {
    if (range?.from && range?.to) {
      setLocal({
        ...local,
        date_between: { from: format(range.from, "yyyy-MM-dd"), to: format(range.to, "yyyy-MM-dd") },
        duration_days: undefined,
      });
    } else {
      setLocal({ ...local, date_between: undefined });
    }
  };

  const handleMonthChange = (month: string) => {
    if (month === "none") {
      setLocal({ ...local, month: undefined, date_between: undefined });
      return;
    }
    const now = new Date();
    let target: Date;
    if (month === "current") target = now;
    else if (month === "last") target = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    else target = new Date(month + "-01T12:00:00");

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

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-[380px] sm:w-[420px] overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <SlidersHorizontal className="h-5 w-5" />
            Advanced Expense Filters
          </SheetTitle>
        </SheetHeader>

        <div className="space-y-6 py-4">
          {/* Payment Status */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Payment Status</Label>
            <div className="flex flex-wrap gap-2">
              {PAYMENT_STATUSES.map((s) => (
                <label key={s} className="flex items-center gap-1.5 cursor-pointer">
                  <Checkbox
                    checked={(local.payment_status || []).includes(s)}
                    onCheckedChange={() => toggleStatus(s)}
                  />
                  <span className="text-sm">{s}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Category */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Category</Label>
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map((c) => (
                <label key={c} className="flex items-center gap-1.5 cursor-pointer">
                  <Checkbox
                    checked={(local.category || []).includes(c)}
                    onCheckedChange={() => toggleCategory(c)}
                  />
                  <span className="text-sm">{c}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Vendor */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Vendor Contains</Label>
            <Input
              placeholder="e.g. ABC Printers"
              value={local.vendor_contains || ""}
              onChange={(e) => setLocal({ ...local, vendor_contains: e.target.value || undefined })}
              className="h-9"
            />
          </div>

          {/* Amount */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Amount Greater Than</Label>
            <Input
              type="number"
              placeholder="e.g. 5000"
              value={local.amount_min || ""}
              onChange={(e) =>
                setLocal({ ...local, amount_min: e.target.value ? Number(e.target.value) : undefined })
              }
              className="h-9"
            />
          </div>

          {/* Expense Date Range */}
          <DateRangeFilter
            label="Expense Date Between"
            value={dateRange}
            onChange={handleDateChange}
            placeholder="Select date range"
          />

          {/* Quick Month */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Quick Month (Expense Date)</Label>
            <Select value={local.month || "none"} onValueChange={handleMonthChange}>
              <SelectTrigger className="h-9">
                <SelectValue placeholder="Select month" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                <SelectItem value="current">Current Month</SelectItem>
                <SelectItem value="last">Last Month</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Duration */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Last N Days (from today)</Label>
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

          {/* Campaign Contains */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Campaign ID Contains</Label>
            <Input
              placeholder="e.g. CMP-2026"
              value={local.campaign_contains || ""}
              onChange={(e) => setLocal({ ...local, campaign_contains: e.target.value || undefined })}
              className="h-9"
            />
          </div>

          {/* Asset Contains */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Asset ID Contains</Label>
            <Input
              placeholder="e.g. HYD-BSQ"
              value={local.asset_contains || ""}
              onChange={(e) => setLocal({ ...local, asset_contains: e.target.value || undefined })}
              className="h-9"
            />
          </div>
        </div>

        <SheetFooter className="flex gap-2 pt-4 border-t">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setLocal({});
              onReset();
              onOpenChange(false);
            }}
            className="gap-1"
          >
            <X className="h-3.5 w-3.5" />
            Reset
          </Button>
          <Button
            size="sm"
            onClick={() => {
              onApply(local);
              onOpenChange(false);
            }}
          >
            Apply Filters
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

/** Active filter pills for expenses */
export function ExpenseFilterPills({
  filters,
  onClear,
  onClearAll,
}: {
  filters: ExpenseFilters;
  onClear: (key: keyof ExpenseFilters) => void;
  onClearAll: () => void;
}) {
  const pills: { key: keyof ExpenseFilters; label: string }[] = [];

  if (filters.payment_status?.length) {
    pills.push({ key: "payment_status", label: `Status: ${filters.payment_status.join(", ")}` });
  }
  if (filters.category?.length) {
    pills.push({ key: "category", label: `Category: ${filters.category.join(", ")}` });
  }
  if (filters.vendor_contains) {
    pills.push({ key: "vendor_contains", label: `Vendor: ${filters.vendor_contains}` });
  }
  if (filters.amount_min) {
    pills.push({ key: "amount_min", label: `Amount > ₹${filters.amount_min.toLocaleString("en-IN")}` });
  }
  if (filters.date_between) {
    pills.push({ key: "date_between", label: `Date: ${filters.date_between.from} → ${filters.date_between.to}` });
  }
  if (filters.month) {
    pills.push({ key: "month", label: `Month: ${filters.month}` });
  }
  if (filters.duration_days) {
    pills.push({ key: "duration_days", label: `Last ${filters.duration_days}d` });
  }
  if (filters.campaign_contains) {
    pills.push({ key: "campaign_contains", label: `Campaign: ${filters.campaign_contains}` });
  }
  if (filters.asset_contains) {
    pills.push({ key: "asset_contains", label: `Asset: ${filters.asset_contains}` });
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
      <button className="text-xs text-destructive hover:underline ml-1" onClick={onClearAll}>
        Clear all
      </button>
    </div>
  );
}

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

const PAYMENT_STATUSES = ["Paid", "Partial", "Pending", "Overdue", "Sent", "Cancelled"];
const DURATION_QUICK = [
  { label: "7 days", value: 7 },
  { label: "15 days", value: 15 },
  { label: "30 days", value: 30 },
  { label: "60 days", value: 60 },
  { label: "90 days", value: 90 },
];

export interface PaymentFilters {
  status?: string[];
  total_min?: number;
  balance_min?: number;
  due_between?: { from: string; to: string };
  invoice_between?: { from: string; to: string };
  client_contains?: string;
  campaign_contains?: string;
  month?: string;
  duration_days?: number;
}

interface PaymentAdvancedFiltersProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  filters: PaymentFilters;
  onApply: (filters: PaymentFilters) => void;
  onReset: () => void;
}

export function PaymentAdvancedFilters({
  open,
  onOpenChange,
  filters,
  onApply,
  onReset,
}: PaymentAdvancedFiltersProps) {
  const [local, setLocal] = useState<PaymentFilters>({});

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

  const dueRange: DateRange | undefined =
    local.due_between
      ? { from: new Date(local.due_between.from + "T12:00:00"), to: new Date(local.due_between.to + "T12:00:00") }
      : undefined;

  const invoiceRange: DateRange | undefined =
    local.invoice_between
      ? { from: new Date(local.invoice_between.from + "T12:00:00"), to: new Date(local.invoice_between.to + "T12:00:00") }
      : undefined;

  const handleDueChange = (range: DateRange | undefined) => {
    if (range?.from && range?.to) {
      setLocal({
        ...local,
        due_between: { from: format(range.from, "yyyy-MM-dd"), to: format(range.to, "yyyy-MM-dd") },
        duration_days: undefined,
      });
    } else {
      setLocal({ ...local, due_between: undefined });
    }
  };

  const handleInvoiceDateChange = (range: DateRange | undefined) => {
    if (range?.from && range?.to) {
      setLocal({
        ...local,
        invoice_between: { from: format(range.from, "yyyy-MM-dd"), to: format(range.to, "yyyy-MM-dd") },
        month: undefined,
      });
    } else {
      setLocal({ ...local, invoice_between: undefined });
    }
  };

  const handleMonthChange = (month: string) => {
    if (month === "none") {
      setLocal({ ...local, month: undefined, invoice_between: undefined });
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
      invoice_between: { from: format(mStart, "yyyy-MM-dd"), to: format(mEnd, "yyyy-MM-dd") },
      duration_days: undefined,
    });
  };

  const handleDuration = (days: number) => {
    const today = new Date();
    setLocal({
      ...local,
      duration_days: days,
      due_between: { from: format(today, "yyyy-MM-dd"), to: format(addDays(today, days), "yyyy-MM-dd") },
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
            Advanced Payment Filters
          </SheetTitle>
        </SheetHeader>

        <div className="space-y-6 py-4">
          {/* Status */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Status</Label>
            <div className="flex flex-wrap gap-2">
              {PAYMENT_STATUSES.map((s) => (
                <label key={s} className="flex items-center gap-1.5 cursor-pointer">
                  <Checkbox
                    checked={(local.status || []).includes(s)}
                    onCheckedChange={() => toggleStatus(s)}
                  />
                  <span className="text-sm">{s}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Amount */}
          <div className="space-y-3">
            <div className="space-y-2">
              <Label className="text-sm font-medium">Total Amount Greater Than</Label>
              <Input
                type="number"
                placeholder="e.g. 50000"
                value={local.total_min || ""}
                onChange={(e) =>
                  setLocal({ ...local, total_min: e.target.value ? Number(e.target.value) : undefined })
                }
                className="h-9"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium">Balance Due Greater Than</Label>
              <Input
                type="number"
                placeholder="e.g. 10000"
                value={local.balance_min || ""}
                onChange={(e) =>
                  setLocal({ ...local, balance_min: e.target.value ? Number(e.target.value) : undefined })
                }
                className="h-9"
              />
            </div>
          </div>

          {/* Due Date Range */}
          <DateRangeFilter
            label="Due Date Between"
            value={dueRange}
            onChange={handleDueChange}
            placeholder="Select due date range"
          />

          {/* Invoice Date Range */}
          <DateRangeFilter
            label="Invoice Date Between"
            value={invoiceRange}
            onChange={handleInvoiceDateChange}
            placeholder="Select invoice date range"
          />

          {/* Client */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Client Contains</Label>
            <Input
              placeholder="e.g. Matrix"
              value={local.client_contains || ""}
              onChange={(e) =>
                setLocal({ ...local, client_contains: e.target.value || undefined })
              }
              className="h-9"
            />
          </div>

          {/* Quick Month */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Quick Month (Invoice Date)</Label>
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
            <Label className="text-sm font-medium">Due Within (from today)</Label>
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

/** Active filter pills for payments */
export function PaymentFilterPills({
  filters,
  onClear,
  onClearAll,
}: {
  filters: PaymentFilters;
  onClear: (key: keyof PaymentFilters) => void;
  onClearAll: () => void;
}) {
  const pills: { key: keyof PaymentFilters; label: string }[] = [];

  if (filters.status?.length) {
    pills.push({ key: "status", label: `Status: ${filters.status.join(", ")}` });
  }
  if (filters.total_min) {
    pills.push({ key: "total_min", label: `Amount > ₹${filters.total_min.toLocaleString("en-IN")}` });
  }
  if (filters.balance_min) {
    pills.push({ key: "balance_min", label: `Balance > ₹${filters.balance_min.toLocaleString("en-IN")}` });
  }
  if (filters.due_between) {
    pills.push({ key: "due_between", label: `Due: ${filters.due_between.from} → ${filters.due_between.to}` });
  }
  if (filters.invoice_between) {
    pills.push({ key: "invoice_between", label: `Invoice: ${filters.invoice_between.from} → ${filters.invoice_between.to}` });
  }
  if (filters.client_contains) {
    pills.push({ key: "client_contains", label: `Client: ${filters.client_contains}` });
  }
  if (filters.campaign_contains) {
    pills.push({ key: "campaign_contains", label: `Campaign: ${filters.campaign_contains}` });
  }
  if (filters.month) {
    pills.push({ key: "month", label: `Month: ${filters.month}` });
  }
  if (filters.duration_days) {
    pills.push({ key: "duration_days", label: `Due within ${filters.duration_days} days` });
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

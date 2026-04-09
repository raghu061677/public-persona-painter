import { useState, useMemo } from "react";
import { format, startOfMonth, endOfMonth, subMonths } from "date-fns";
import { CalendarRange } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { getFinancialYear, getFYRange } from "@/utils/finance";
import type { DateRange } from "react-day-picker";

export interface DatePeriodValue {
  from: string;
  to: string;
  label: string;
}

type PeriodKey = "current_month" | "last_month" | "last_3_months" | "this_fy" | "last_fy" | "custom" | "all";

interface DatePeriodFilterProps {
  value: PeriodKey;
  customRange?: DateRange;
  onChange: (period: PeriodKey, range: DatePeriodValue | undefined, customRange?: DateRange) => void;
  className?: string;
}

function getPeriodRange(key: PeriodKey): DatePeriodValue | undefined {
  const now = new Date();
  switch (key) {
    case "current_month": {
      const s = startOfMonth(now);
      const e = endOfMonth(now);
      return { from: format(s, "yyyy-MM-dd"), to: format(e, "yyyy-MM-dd"), label: "Current Month" };
    }
    case "last_month": {
      const s = startOfMonth(subMonths(now, 1));
      const e = endOfMonth(subMonths(now, 1));
      return { from: format(s, "yyyy-MM-dd"), to: format(e, "yyyy-MM-dd"), label: "Last Month" };
    }
    case "last_3_months": {
      const s = startOfMonth(subMonths(now, 2));
      const e = endOfMonth(now);
      return { from: format(s, "yyyy-MM-dd"), to: format(e, "yyyy-MM-dd"), label: "Last 3 Months" };
    }
    case "this_fy": {
      const fy = getFYRange(now);
      return { from: format(fy.start, "yyyy-MM-dd"), to: format(fy.end, "yyyy-MM-dd"), label: `FY ${fy.label}` };
    }
    case "last_fy": {
      const lastYear = new Date(now.getFullYear() - 1, now.getMonth(), 1);
      const fy = getFYRange(lastYear);
      return { from: format(fy.start, "yyyy-MM-dd"), to: format(fy.end, "yyyy-MM-dd"), label: `FY ${fy.label}` };
    }
    case "all":
    default:
      return undefined;
  }
}

export function DatePeriodFilter({ value, customRange, onChange, className }: DatePeriodFilterProps) {
  const [showCalendar, setShowCalendar] = useState(false);
  const [tempRange, setTempRange] = useState<DateRange | undefined>(customRange);

  const handleChange = (key: string) => {
    const period = key as PeriodKey;
    if (period === "custom") {
      setShowCalendar(true);
      return;
    }
    setShowCalendar(false);
    onChange(period, getPeriodRange(period));
  };

  const applyCustomRange = () => {
    if (tempRange?.from && tempRange?.to) {
      onChange("custom", {
        from: format(tempRange.from, "yyyy-MM-dd"),
        to: format(tempRange.to, "yyyy-MM-dd"),
        label: `${format(tempRange.from, "dd MMM")} – ${format(tempRange.to, "dd MMM yyyy")}`,
      }, tempRange);
      setShowCalendar(false);
    }
  };

  const displayLabel = useMemo(() => {
    if (value === "custom" && customRange?.from && customRange?.to) {
      return `${format(customRange.from, "dd MMM")} – ${format(customRange.to, "dd MMM")}`;
    }
    const labels: Record<PeriodKey, string> = {
      current_month: "Current Month",
      last_month: "Last Month",
      last_3_months: "Last 3 Months",
      this_fy: `This FY`,
      last_fy: `Last FY`,
      custom: "Custom Range",
      all: "All Time",
    };
    return labels[value] || "All Time";
  }, [value, customRange]);

  return (
    <div className={className}>
      <Popover open={showCalendar} onOpenChange={setShowCalendar}>
        <div className="flex items-center gap-0">
          <Select value={value} onValueChange={handleChange}>
            <SelectTrigger className="h-9 w-[160px] gap-1.5">
              <CalendarRange className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              <SelectValue>{displayLabel}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Time</SelectItem>
              <SelectItem value="current_month">Current Month</SelectItem>
              <SelectItem value="last_month">Last Month</SelectItem>
              <SelectItem value="last_3_months">Last 3 Months</SelectItem>
              <SelectItem value="this_fy">This FY ({getFinancialYear()})</SelectItem>
              <SelectItem value="last_fy">Last FY</SelectItem>
              <SelectItem value="custom">Custom Range…</SelectItem>
            </SelectContent>
          </Select>
          <PopoverTrigger asChild>
            <span />
          </PopoverTrigger>
        </div>
        <PopoverContent className="w-auto p-0 bg-popover z-[9999]" align="start">
          <Calendar
            initialFocus
            mode="range"
            defaultMonth={tempRange?.from}
            selected={tempRange}
            onSelect={setTempRange}
            numberOfMonths={2}
            className={cn("p-3 pointer-events-auto")}
          />
          <div className="p-3 border-t flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => setShowCalendar(false)}>Cancel</Button>
            <Button size="sm" onClick={applyCustomRange} disabled={!tempRange?.from || !tempRange?.to}>Apply</Button>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}

export { getPeriodRange };
export type { PeriodKey };

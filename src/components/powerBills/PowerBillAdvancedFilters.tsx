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

const STATUSES = ["Paid", "Pending", "Overdue"];
const DURATION_QUICK = [
  { label: "7 days", value: 7 },
  { label: "15 days", value: 15 },
  { label: "30 days", value: 30 },
  { label: "60 days", value: 60 },
  { label: "90 days", value: 90 },
];

export interface PowerBillFilters {
  status?: string[];
  amount_min?: number;
  month?: string;
  due_between?: { from: string; to: string };
  duration_days?: number;
  asset_contains?: string;
  service_contains?: string;
}

interface PowerBillAdvancedFiltersProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  filters: PowerBillFilters;
  onApply: (filters: PowerBillFilters) => void;
  onReset: () => void;
}

export function PowerBillAdvancedFilters({ open, onOpenChange, filters, onApply, onReset }: PowerBillAdvancedFiltersProps) {
  const [local, setLocal] = useState<PowerBillFilters>({});

  useEffect(() => { if (open) setLocal({ ...filters }); }, [open, filters]);

  const toggleStatus = (s: string) => {
    const cur = local.status || [];
    const next = cur.includes(s) ? cur.filter(x => x !== s) : [...cur, s];
    setLocal({ ...local, status: next.length > 0 ? next : undefined });
  };

  const dueRange: DateRange | undefined = local.due_between
    ? { from: new Date(local.due_between.from + "T12:00:00"), to: new Date(local.due_between.to + "T12:00:00") }
    : undefined;

  const handleDueChange = (range: DateRange | undefined) => {
    if (range?.from && range?.to) {
      setLocal({ ...local, due_between: { from: format(range.from, "yyyy-MM-dd"), to: format(range.to, "yyyy-MM-dd") }, duration_days: undefined });
    } else {
      setLocal({ ...local, due_between: undefined });
    }
  };

  const handleMonthChange = (month: string) => {
    if (month === "none") { setLocal({ ...local, month: undefined }); return; }
    const now = new Date();
    let target: Date;
    if (month === "current") target = now;
    else if (month === "last") target = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    else target = new Date(month + "-01T12:00:00");
    setLocal({ ...local, month: format(startOfMonth(target), "yyyy-MM"), duration_days: undefined });
  };

  const handleDuration = (days: number) => {
    const today = new Date();
    setLocal({ ...local, duration_days: days, due_between: { from: format(today, "yyyy-MM-dd"), to: format(addDays(today, days), "yyyy-MM-dd") }, month: undefined });
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-[380px] sm:w-[420px] overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2"><SlidersHorizontal className="h-5 w-5" />Advanced Power Bill Filters</SheetTitle>
        </SheetHeader>
        <div className="space-y-6 py-4">
          <div className="space-y-2">
            <Label className="text-sm font-medium">Payment Status</Label>
            <div className="flex flex-wrap gap-2">
              {STATUSES.map(s => (
                <label key={s} className="flex items-center gap-1.5 cursor-pointer">
                  <Checkbox checked={(local.status || []).includes(s)} onCheckedChange={() => toggleStatus(s)} />
                  <span className="text-sm">{s}</span>
                </label>
              ))}
            </div>
          </div>
          <div className="space-y-2">
            <Label className="text-sm font-medium">Bill Amount Greater Than</Label>
            <Input type="number" placeholder="e.g. 5000" value={local.amount_min || ""} onChange={e => setLocal({ ...local, amount_min: e.target.value ? Number(e.target.value) : undefined })} className="h-9" />
          </div>
          <div className="space-y-2">
            <Label className="text-sm font-medium">Bill Month</Label>
            <Select value={local.month || "none"} onValueChange={handleMonthChange}>
              <SelectTrigger className="h-9"><SelectValue placeholder="Select month" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                <SelectItem value="current">Current Month</SelectItem>
                <SelectItem value="last">Last Month</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <DateRangeFilter label="Due Date Between" value={dueRange} onChange={handleDueChange} placeholder="Select due date range" />
          <div className="space-y-2">
            <Label className="text-sm font-medium">Due Within (from today)</Label>
            <div className="flex flex-wrap gap-2">
              {DURATION_QUICK.map(d => (
                <Button key={d.value} variant={local.duration_days === d.value ? "default" : "outline"} size="sm" onClick={() => handleDuration(d.value)} className="text-xs">{d.label}</Button>
              ))}
            </div>
          </div>
          <div className="space-y-2">
            <Label className="text-sm font-medium">Asset ID Contains</Label>
            <Input placeholder="e.g. HYD-BSQ" value={local.asset_contains || ""} onChange={e => setLocal({ ...local, asset_contains: e.target.value || undefined })} className="h-9" />
          </div>
          <div className="space-y-2">
            <Label className="text-sm font-medium">Service Number Contains</Label>
            <Input placeholder="e.g. 123456" value={local.service_contains || ""} onChange={e => setLocal({ ...local, service_contains: e.target.value || undefined })} className="h-9" />
          </div>
        </div>
        <SheetFooter className="flex gap-2 pt-4 border-t">
          <Button variant="outline" size="sm" onClick={() => { setLocal({}); onReset(); onOpenChange(false); }} className="gap-1"><X className="h-3.5 w-3.5" />Reset</Button>
          <Button size="sm" onClick={() => { onApply(local); onOpenChange(false); }}>Apply Filters</Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

export function PowerBillFilterPills({ filters, onClear, onClearAll }: { filters: PowerBillFilters; onClear: (key: keyof PowerBillFilters) => void; onClearAll: () => void; }) {
  const pills: { key: keyof PowerBillFilters; label: string }[] = [];
  if (filters.status?.length) pills.push({ key: "status", label: `Status: ${filters.status.join(", ")}` });
  if (filters.amount_min) pills.push({ key: "amount_min", label: `Amount > ₹${filters.amount_min.toLocaleString("en-IN")}` });
  if (filters.month) pills.push({ key: "month", label: `Month: ${filters.month}` });
  if (filters.due_between) pills.push({ key: "due_between", label: `Due: ${filters.due_between.from} → ${filters.due_between.to}` });
  if (filters.duration_days) pills.push({ key: "duration_days", label: `Due within ${filters.duration_days}d` });
  if (filters.asset_contains) pills.push({ key: "asset_contains", label: `Asset: ${filters.asset_contains}` });
  if (filters.service_contains) pills.push({ key: "service_contains", label: `Service: ${filters.service_contains}` });
  if (pills.length === 0) return null;
  return (
    <div className="flex flex-wrap items-center gap-2 mb-3">
      <span className="text-xs text-muted-foreground font-medium">Active:</span>
      {pills.map(p => (
        <Badge key={p.key} variant="secondary" className="gap-1 text-xs cursor-pointer hover:bg-destructive/10" onClick={() => onClear(p.key)}>{p.label}<X className="h-3 w-3" /></Badge>
      ))}
      <button className="text-xs text-destructive hover:underline ml-1" onClick={onClearAll}>Clear all</button>
    </div>
  );
}

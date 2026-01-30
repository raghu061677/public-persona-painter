import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Badge } from "@/components/ui/badge";
import { 
  Search, 
  Calendar as CalendarIcon, 
  X, 
  Filter,
  RotateCcw
} from "lucide-react";
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, startOfQuarter, endOfQuarter, startOfYear, endOfYear, subMonths } from "date-fns";
import type { ExpenseFilters, ExpenseCategory, CostCenter, AllocationType, ApprovalStatus, PaymentStatus } from "@/types/expenses";
import { cn } from "@/lib/utils";

interface ExpenseFiltersBarProps {
  filters: ExpenseFilters;
  onFiltersChange: (filters: ExpenseFilters) => void;
  categories: ExpenseCategory[];
  costCenters: CostCenter[];
}

const datePresets = [
  { label: "Today", getValue: () => ({ from: new Date(), to: new Date() }) },
  { label: "This Week", getValue: () => ({ from: startOfWeek(new Date()), to: endOfWeek(new Date()) }) },
  { label: "This Month", getValue: () => ({ from: startOfMonth(new Date()), to: endOfMonth(new Date()) }) },
  { label: "Last Month", getValue: () => ({ from: startOfMonth(subMonths(new Date(), 1)), to: endOfMonth(subMonths(new Date(), 1)) }) },
  { label: "This Quarter", getValue: () => ({ from: startOfQuarter(new Date()), to: endOfQuarter(new Date()) }) },
  { label: "This FY", getValue: () => {
    const now = new Date();
    const month = now.getMonth();
    const year = month >= 3 ? now.getFullYear() : now.getFullYear() - 1;
    return { from: new Date(year, 3, 1), to: new Date(year + 1, 2, 31) };
  }},
];

const allocationTypes: AllocationType[] = ['General', 'Campaign', 'Plan', 'Asset'];
const approvalStatuses: ApprovalStatus[] = ['Draft', 'Submitted', 'Approved', 'Rejected', 'Paid'];
const paymentStatuses: PaymentStatus[] = ['Unpaid', 'Partially Paid', 'Paid'];

export function ExpenseFiltersBar({ 
  filters, 
  onFiltersChange, 
  categories, 
  costCenters 
}: ExpenseFiltersBarProps) {
  const activeFiltersCount = [
    filters.category_id,
    filters.cost_center_id,
    filters.allocation_type,
    filters.approval_status,
    filters.payment_status,
    filters.search,
  ].filter(Boolean).length;

  const resetFilters = () => {
    onFiltersChange({
      dateRange: { from: startOfMonth(new Date()), to: endOfMonth(new Date()) },
      category_id: null,
      cost_center_id: null,
      vendor_id: null,
      allocation_type: null,
      approval_status: null,
      payment_status: null,
      search: '',
    });
  };

  return (
    <div className="bg-card border rounded-lg p-4 space-y-4 sticky top-0 z-10">
      {/* Search and Date Range Row */}
      <div className="flex flex-wrap gap-3 items-center">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search expense no, vendor, invoice..."
            value={filters.search}
            onChange={(e) => onFiltersChange({ ...filters, search: e.target.value })}
            className="pl-10"
          />
          {filters.search && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6"
              onClick={() => onFiltersChange({ ...filters, search: '' })}
            >
              <X className="h-3 w-3" />
            </Button>
          )}
        </div>

        {/* Date Range Picker */}
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className="min-w-[240px] justify-start">
              <CalendarIcon className="mr-2 h-4 w-4" />
              {filters.dateRange.from && filters.dateRange.to ? (
                <>
                  {format(filters.dateRange.from, "dd MMM")} - {format(filters.dateRange.to, "dd MMM yyyy")}
                </>
              ) : (
                "Select date range"
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <div className="flex">
              <div className="border-r p-2 space-y-1">
                {datePresets.map((preset) => (
                  <Button
                    key={preset.label}
                    variant="ghost"
                    size="sm"
                    className="w-full justify-start"
                    onClick={() => onFiltersChange({ ...filters, dateRange: preset.getValue() })}
                  >
                    {preset.label}
                  </Button>
                ))}
              </div>
              <Calendar
                mode="range"
                selected={{ from: filters.dateRange.from || undefined, to: filters.dateRange.to || undefined }}
                onSelect={(range) => onFiltersChange({ 
                  ...filters, 
                  dateRange: { from: range?.from || null, to: range?.to || null }
                })}
                numberOfMonths={2}
              />
            </div>
          </PopoverContent>
        </Popover>

        {/* Reset Button */}
        {activeFiltersCount > 0 && (
          <Button variant="ghost" size="sm" onClick={resetFilters}>
            <RotateCcw className="mr-2 h-4 w-4" />
            Reset ({activeFiltersCount})
          </Button>
        )}
      </div>

      {/* Filter Dropdowns Row */}
      <div className="flex flex-wrap gap-3">
        {/* Category Filter */}
        <Select
          value={filters.category_id || "all"}
          onValueChange={(value) => onFiltersChange({ 
            ...filters, 
            category_id: value === "all" ? null : value 
          })}
        >
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {categories.map((cat) => (
              <SelectItem key={cat.id} value={cat.id}>
                <div className="flex items-center gap-2">
                  <div 
                    className="w-2 h-2 rounded-full" 
                    style={{ backgroundColor: cat.color }} 
                  />
                  {cat.name}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Cost Center Filter */}
        <Select
          value={filters.cost_center_id || "all"}
          onValueChange={(value) => onFiltersChange({ 
            ...filters, 
            cost_center_id: value === "all" ? null : value 
          })}
        >
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Cost Center" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Cost Centers</SelectItem>
            {costCenters.map((cc) => (
              <SelectItem key={cc.id} value={cc.id}>
                {cc.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Allocation Type Filter */}
        <Select
          value={filters.allocation_type || "all"}
          onValueChange={(value) => onFiltersChange({ 
            ...filters, 
            allocation_type: value === "all" ? null : value as AllocationType 
          })}
        >
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Allocation" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            {allocationTypes.map((type) => (
              <SelectItem key={type} value={type}>{type}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Approval Status Filter */}
        <Select
          value={filters.approval_status || "all"}
          onValueChange={(value) => onFiltersChange({ 
            ...filters, 
            approval_status: value === "all" ? null : value as ApprovalStatus 
          })}
        >
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Approval" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            {approvalStatuses.map((status) => (
              <SelectItem key={status} value={status}>{status}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Payment Status Filter */}
        <Select
          value={filters.payment_status || "all"}
          onValueChange={(value) => onFiltersChange({ 
            ...filters, 
            payment_status: value === "all" ? null : value as PaymentStatus 
          })}
        >
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Payment" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Payments</SelectItem>
            {paymentStatuses.map((status) => (
              <SelectItem key={status} value={status}>{status}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}

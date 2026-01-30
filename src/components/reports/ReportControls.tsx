import { useState, useEffect, useMemo } from "react";
import { format } from "date-fns";
import { DateRange } from "react-day-picker";
import {
  Search,
  Filter,
  Save,
  Share2,
  RotateCcw,
  ChevronDown,
  Columns,
  Calendar,
  ArrowUpDown,
  X,
  Check,
  Bookmark,
  Link2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
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
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { DATE_PRESETS, SavedView, SortConfig } from "./types";
import { useToast } from "@/hooks/use-toast";

interface DateTypeOption {
  value: string;
  label: string;
}

interface FilterOption {
  value: string;
  label: string;
  count?: number;
}

interface ColumnConfig {
  key: string;
  label: string;
  default: boolean;
}

interface ReportControlsProps {
  // Report identity
  reportKey: string;
  reportTitle?: string;

  // Date config
  dateTypes: DateTypeOption[];
  selectedDateType: string;
  onDateTypeChange: (type: string) => void;
  dateRange: DateRange | undefined;
  onDateRangeChange: (range: DateRange | undefined) => void;

  // Comparison mode
  showComparison?: boolean;
  comparisonEnabled?: boolean;
  onComparisonChange?: (enabled: boolean) => void;

  // Search
  searchValue: string;
  onSearchChange: (value: string) => void;
  searchPlaceholder?: string;

  // Filters
  filters?: {
    cities?: FilterOption[];
    areas?: FilterOption[];
    mediaTypes?: FilterOption[];
    statuses?: FilterOption[];
    clients?: FilterOption[];
  };
  selectedFilters: {
    cities: string[];
    areas: string[];
    mediaTypes: string[];
    statuses: string[];
    clients: string[];
  };
  onFilterChange: (filterType: string, values: string[]) => void;

  // Value range
  showValueRange?: boolean;
  minValue?: number;
  maxValue?: number;
  onValueRangeChange?: (min: number | undefined, max: number | undefined) => void;

  // Sorting
  sortOptions: { value: string; label: string }[];
  sortConfig: SortConfig;
  onSortChange: (config: SortConfig) => void;

  // Columns
  columns?: ColumnConfig[];
  visibleColumns?: string[];
  onColumnsChange?: (columns: string[]) => void;

  // Actions
  onApply: () => void;
  onReset: () => void;
  loading?: boolean;
}

export function ReportControls({
  reportKey,
  reportTitle,
  dateTypes,
  selectedDateType,
  onDateTypeChange,
  dateRange,
  onDateRangeChange,
  showComparison = false,
  comparisonEnabled = false,
  onComparisonChange,
  searchValue,
  onSearchChange,
  searchPlaceholder = "Search...",
  filters = {},
  selectedFilters,
  onFilterChange,
  showValueRange = false,
  minValue,
  maxValue,
  onValueRangeChange,
  sortOptions,
  sortConfig,
  onSortChange,
  columns = [],
  visibleColumns = [],
  onColumnsChange,
  onApply,
  onReset,
  loading = false,
}: ReportControlsProps) {
  const { toast } = useToast();
  const [savedViews, setSavedViews] = useState<SavedView[]>([]);
  const [saveViewDialogOpen, setSaveViewDialogOpen] = useState(false);
  const [viewName, setViewName] = useState("");

  // Load saved views from localStorage
  useEffect(() => {
    const saved = localStorage.getItem(`report-views-${reportKey}`);
    if (saved) {
      try {
        setSavedViews(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to parse saved views:", e);
      }
    }
  }, [reportKey]);

  // Count active filters
  const activeFilterCount = useMemo(() => {
    return (
      selectedFilters.cities.length +
      selectedFilters.areas.length +
      selectedFilters.mediaTypes.length +
      selectedFilters.statuses.length +
      selectedFilters.clients.length
    );
  }, [selectedFilters]);

  // Save current view
  const handleSaveView = () => {
    if (!viewName.trim()) return;

    const newView: SavedView = {
      id: crypto.randomUUID(),
      name: viewName.trim(),
      filters: {
        search: searchValue,
        cities: selectedFilters.cities,
        areas: selectedFilters.areas,
        mediaTypes: selectedFilters.mediaTypes,
        statuses: selectedFilters.statuses,
        clientTypes: selectedFilters.clients,
      },
      dateConfig: {
        dateType: selectedDateType,
        dateOptions: dateTypes,
        startDate: dateRange?.from,
        endDate: dateRange?.to,
      },
      sortConfig,
      visibleColumns,
      createdAt: new Date(),
    };

    const updated = [...savedViews, newView];
    setSavedViews(updated);
    localStorage.setItem(`report-views-${reportKey}`, JSON.stringify(updated));
    setSaveViewDialogOpen(false);
    setViewName("");
    toast({ title: "View saved", description: `"${viewName}" has been saved` });
  };

  // Generate share link
  const handleShareLink = () => {
    const params = new URLSearchParams();
    params.set("dateType", selectedDateType);
    if (dateRange?.from) params.set("from", dateRange.from.toISOString());
    if (dateRange?.to) params.set("to", dateRange.to.toISOString());
    if (searchValue) params.set("q", searchValue);
    if (selectedFilters.cities.length) params.set("cities", selectedFilters.cities.join(","));
    if (selectedFilters.areas.length) params.set("areas", selectedFilters.areas.join(","));
    if (selectedFilters.mediaTypes.length) params.set("types", selectedFilters.mediaTypes.join(","));
    if (selectedFilters.statuses.length) params.set("statuses", selectedFilters.statuses.join(","));
    params.set("sort", `${sortConfig.field}:${sortConfig.direction}`);

    const url = `${window.location.origin}${window.location.pathname}?${params.toString()}`;
    navigator.clipboard.writeText(url);
    toast({ title: "Link copied", description: "Share URL has been copied to clipboard" });
  };

  // Delete saved view
  const handleDeleteView = (viewId: string) => {
    const updated = savedViews.filter(v => v.id !== viewId);
    setSavedViews(updated);
    localStorage.setItem(`report-views-${reportKey}`, JSON.stringify(updated));
    toast({ title: "View deleted" });
  };

  return (
    <div className="sticky top-0 z-20 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
      <div className="p-4 space-y-4">
        {/* Row 1: Date Type + Date Range + Presets + Comparison */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Date Type Selector */}
          <div className="flex items-center gap-2">
            <Label className="text-sm text-muted-foreground whitespace-nowrap">Filter By:</Label>
            <Select value={selectedDateType} onValueChange={onDateTypeChange}>
              <SelectTrigger className="w-[180px] h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {dateTypes.map((dt) => (
                  <SelectItem key={dt.value} value={dt.value}>
                    {dt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Date Range Picker */}
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "h-9 min-w-[240px] justify-start text-left font-normal",
                  !dateRange && "text-muted-foreground"
                )}
              >
                <Calendar className="mr-2 h-4 w-4" />
                {dateRange?.from ? (
                  dateRange.to ? (
                    <>
                      {format(dateRange.from, "MMM dd, yyyy")} -{" "}
                      {format(dateRange.to, "MMM dd, yyyy")}
                    </>
                  ) : (
                    format(dateRange.from, "MMM dd, yyyy")
                  )
                ) : (
                  <span>Select date range</span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <div className="flex">
                {/* Presets */}
                <div className="border-r p-3 space-y-1">
                  <p className="text-xs font-medium text-muted-foreground mb-2">Quick Select</p>
                  {DATE_PRESETS.map((preset) => (
                    <Button
                      key={preset.label}
                      variant="ghost"
                      size="sm"
                      className="w-full justify-start text-sm"
                      onClick={() => {
                        const { from, to } = preset.getValue();
                        onDateRangeChange({ from, to });
                      }}
                    >
                      {preset.label}
                    </Button>
                  ))}
                </div>
                {/* Calendar */}
                <CalendarComponent
                  initialFocus
                  mode="range"
                  defaultMonth={dateRange?.from}
                  selected={dateRange}
                  onSelect={onDateRangeChange}
                  numberOfMonths={2}
                  className="p-3 pointer-events-auto"
                />
              </div>
            </PopoverContent>
          </Popover>

          {/* Comparison Toggle */}
          {showComparison && onComparisonChange && (
            <Button
              variant={comparisonEnabled ? "default" : "outline"}
              size="sm"
              onClick={() => onComparisonChange(!comparisonEnabled)}
              className="h-9"
            >
              <ArrowUpDown className="h-4 w-4 mr-1" />
              Compare
            </Button>
          )}

          <Separator orientation="vertical" className="h-8" />

          {/* Search */}
          <div className="relative flex-1 min-w-[200px] max-w-[320px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={searchValue}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder={searchPlaceholder}
              className="pl-10 h-9"
            />
            {searchValue && (
              <Button
                variant="ghost"
                size="sm"
                className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0"
                onClick={() => onSearchChange("")}
              >
                <X className="h-3 w-3" />
              </Button>
            )}
          </div>
        </div>

        {/* Row 2: Filters + Sorting + Column Settings + Actions */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Multi-select Filters */}
          {Object.entries(filters).map(([key, options]) => {
            if (!options || options.length === 0) return null;
            const selectedValues = selectedFilters[key as keyof typeof selectedFilters] || [];
            const label = key.charAt(0).toUpperCase() + key.slice(1);

            return (
              <Popover key={key}>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className="h-9">
                    {label}
                    {selectedValues.length > 0 && (
                      <Badge variant="secondary" className="ml-2 h-5 px-1.5">
                        {selectedValues.length}
                      </Badge>
                    )}
                    <ChevronDown className="ml-1 h-3 w-3" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[220px] p-2" align="start">
                  <div className="space-y-1 max-h-[280px] overflow-auto">
                    {options.map((opt) => (
                      <div
                        key={opt.value}
                        className="flex items-center gap-2 p-2 hover:bg-muted rounded cursor-pointer"
                        onClick={() => {
                          const newValues = selectedValues.includes(opt.value)
                            ? selectedValues.filter((v) => v !== opt.value)
                            : [...selectedValues, opt.value];
                          onFilterChange(key, newValues);
                        }}
                      >
                        <Checkbox checked={selectedValues.includes(opt.value)} />
                        <span className="flex-1 text-sm">{opt.label}</span>
                        {opt.count !== undefined && (
                          <span className="text-xs text-muted-foreground">{opt.count}</span>
                        )}
                      </div>
                    ))}
                  </div>
                  {selectedValues.length > 0 && (
                    <>
                      <Separator className="my-2" />
                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-full"
                        onClick={() => onFilterChange(key, [])}
                      >
                        Clear {label}
                      </Button>
                    </>
                  )}
                </PopoverContent>
              </Popover>
            );
          })}

          {/* Active Filter Badges */}
          {activeFilterCount > 0 && (
            <div className="flex items-center gap-1">
              <Badge variant="secondary" className="gap-1">
                <Filter className="h-3 w-3" />
                {activeFilterCount} filters
              </Badge>
            </div>
          )}

          <Separator orientation="vertical" className="h-8" />

          {/* Sorting */}
          <div className="flex items-center gap-2">
            <Label className="text-sm text-muted-foreground whitespace-nowrap">Sort:</Label>
            <Select
              value={sortConfig.field}
              onValueChange={(v) => onSortChange({ ...sortConfig, field: v })}
            >
              <SelectTrigger className="w-[150px] h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {sortOptions.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              size="icon"
              className="h-9 w-9"
              onClick={() =>
                onSortChange({
                  ...sortConfig,
                  direction: sortConfig.direction === "asc" ? "desc" : "asc",
                })
              }
            >
              <ArrowUpDown className="h-4 w-4" />
            </Button>
          </div>

          {/* Column Settings */}
          {columns.length > 0 && onColumnsChange && (
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="h-9">
                  <Columns className="h-4 w-4 mr-1" />
                  Columns
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[220px] p-2" align="end">
                <div className="space-y-1 max-h-[300px] overflow-auto">
                  {columns.map((col) => (
                    <div
                      key={col.key}
                      className="flex items-center gap-2 p-2 hover:bg-muted rounded cursor-pointer"
                      onClick={() => {
                        const newCols = visibleColumns.includes(col.key)
                          ? visibleColumns.filter((c) => c !== col.key)
                          : [...visibleColumns, col.key];
                        onColumnsChange(newCols);
                      }}
                    >
                      <Checkbox checked={visibleColumns.includes(col.key)} />
                      <span className="text-sm">{col.label}</span>
                    </div>
                  ))}
                </div>
              </PopoverContent>
            </Popover>
          )}

          <div className="flex-1" />

          {/* Saved Views */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-9">
                <Bookmark className="h-4 w-4 mr-1" />
                Views
                {savedViews.length > 0 && (
                  <Badge variant="secondary" className="ml-1 h-5 px-1.5">
                    {savedViews.length}
                  </Badge>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-[200px]">
              <DropdownMenuItem onClick={() => onReset()}>
                <Check className="h-4 w-4 mr-2" />
                Default View
              </DropdownMenuItem>
              {savedViews.length > 0 && <DropdownMenuSeparator />}
              {savedViews.map((view) => (
                <DropdownMenuItem
                  key={view.id}
                  className="flex items-center justify-between"
                >
                  <span className="truncate">{view.name}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0 hover:bg-destructive/10"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteView(view.id);
                    }}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </DropdownMenuItem>
              ))}
              <DropdownMenuSeparator />
              <Dialog open={saveViewDialogOpen} onOpenChange={setSaveViewDialogOpen}>
                <DialogTrigger asChild>
                  <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                    <Save className="h-4 w-4 mr-2" />
                    Save Current View
                  </DropdownMenuItem>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Save View</DialogTitle>
                    <DialogDescription>
                      Save your current filters and settings for quick access later.
                    </DialogDescription>
                  </DialogHeader>
                  <Input
                    placeholder="View name..."
                    value={viewName}
                    onChange={(e) => setViewName(e.target.value)}
                  />
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setSaveViewDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button onClick={handleSaveView} disabled={!viewName.trim()}>
                      Save View
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Share Link */}
          <Button variant="outline" size="sm" className="h-9" onClick={handleShareLink}>
            <Link2 className="h-4 w-4 mr-1" />
            Share
          </Button>

          {/* Reset */}
          <Button variant="outline" size="sm" className="h-9" onClick={onReset}>
            <RotateCcw className="h-4 w-4 mr-1" />
            Reset
          </Button>

          {/* Apply */}
          <Button size="sm" className="h-9" onClick={onApply} disabled={loading}>
            {loading ? "Loading..." : "Apply"}
          </Button>
        </div>
      </div>
    </div>
  );
}

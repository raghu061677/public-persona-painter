import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Filter, X, LayoutList, ChevronDown } from "lucide-react";
import ColumnVisibilityButton from "./column-visibility-button";
import { TableDensity } from "@/hooks/use-table-density";
import { FilterPresets } from "./filter-presets";
import { GlobalSearch } from "./global-search";
import { TableSettingsPanel } from "./table-settings-panel";
import { TableSettings } from "@/hooks/use-table-settings";
import { DateRangeFilter } from "./date-range-filter";
import { MultiSelectFilter } from "./multi-select-filter";
import { DateRange } from "react-day-picker";

export interface FilterConfig {
  key: string;
  label: string;
  type: "text" | "select" | "multi-select" | "date-range";
  placeholder?: string;
  options?: { value: string; label: string }[] | string[];
}

interface TableFiltersProps {
  filters: FilterConfig[];
  filterValues: Record<string, any>;
  onFilterChange: (key: string, value: any) => void;
  onClearFilters: () => void;
  // Column visibility props
  allColumns: { key: string; label: string }[];
  visibleColumns: string[];
  onColumnVisibilityChange: (keys: string[]) => void;
  onResetColumns: () => void;
  // Density props
  density?: TableDensity;
  onDensityChange?: (density: TableDensity) => void;
  // Filter presets
  tableKey?: string;
  // Global search
  enableGlobalSearch?: boolean;
  searchableData?: any[];
  searchableKeys?: string[];
  onGlobalSearchFilter?: (filtered: any[]) => void;
  // Settings
  settings?: TableSettings;
  onUpdateSettings?: (updates: Partial<TableSettings>) => void;
  onResetSettings?: () => void;
}

export function TableFilters({
  filters,
  filterValues,
  onFilterChange,
  onClearFilters,
  allColumns,
  visibleColumns,
  onColumnVisibilityChange,
  onResetColumns,
  density,
  onDensityChange,
  tableKey,
  enableGlobalSearch = false,
  searchableData = [],
  searchableKeys = [],
  onGlobalSearchFilter,
  settings,
  onUpdateSettings,
  onResetSettings,
}: TableFiltersProps) {
  const hasActiveFilters = Object.values(filterValues).some(v => v !== "");

  return (
    <Collapsible defaultOpen={false}>
      <Card className="border shadow-sm mb-4">
        <CollapsibleTrigger asChild>
          <CardHeader className="p-3 cursor-pointer hover:bg-muted/30 transition-colors group">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-md bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                  <Filter className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-base font-semibold flex items-center gap-2">
                    Filters & Columns
                    {hasActiveFilters && (
                      <span className="inline-flex items-center justify-center px-2 py-0.5 text-xs font-medium bg-primary/10 text-primary rounded-full">
                        {Object.values(filterValues).filter(v => v !== "").length} active
                      </span>
                    )}
                  </CardTitle>
                </div>
              </div>
              <Button variant="ghost" size="sm" className="text-xs gap-1">
                <ChevronDown className="h-4 w-4 transition-transform group-data-[state=open]:rotate-180" />
                Toggle
              </Button>
            </div>
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          {/* Global Search */}
          {enableGlobalSearch && onGlobalSearchFilter && (
            <CardContent className="p-3 sm:p-4 border-t bg-muted/5">
              <GlobalSearch
                data={searchableData}
                searchableKeys={searchableKeys}
                onFilteredData={onGlobalSearchFilter}
              />
            </CardContent>
          )}
          
          <CardContent className="p-3 sm:p-4 border-t bg-muted/5">
            {tableKey && (
              <div className="mb-3 flex justify-end">
                <FilterPresets
                  tableKey={tableKey}
                  currentFilters={filterValues}
                  onApplyPreset={(filters) => {
                    Object.entries(filters).forEach(([key, value]) => {
                      onFilterChange(key, value);
                    });
                  }}
                />
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
              {/* Dynamic Filters */}
              {filters.map((filter) => {
                if (filter.type === "text") {
                  return (
                    <div key={filter.key} className="space-y-1.5">
                      <Label className="text-xs font-medium text-muted-foreground">{filter.label}</Label>
                      <Input
                        placeholder={filter.placeholder || `Search ${filter.label.toLowerCase()}...`}
                        value={filterValues[filter.key] || ""}
                        onChange={(e) => onFilterChange(filter.key, e.target.value)}
                        className="h-9 text-sm"
                      />
                    </div>
                  );
                } else if (filter.type === "select") {
                  return (
                    <div key={filter.key} className="space-y-1.5">
                      <Label className="text-xs font-medium text-muted-foreground">{filter.label}</Label>
                      <Select
                        value={filterValues[filter.key] || ""}
                        onValueChange={(value) => onFilterChange(filter.key, value === "__all__" ? "" : value)}
                      >
                        <SelectTrigger className="h-9 text-sm">
                          <SelectValue placeholder={filter.placeholder || `Select ${filter.label.toLowerCase()}`} />
                        </SelectTrigger>
                        <SelectContent className="bg-popover z-50">
                          <SelectItem value="__all__">All {filter.label}</SelectItem>
                          {filter.options?.map((option) => {
                            const opt = typeof option === 'string' ? { value: option, label: option } : option;
                            return (
                              <SelectItem key={opt.value} value={opt.value}>
                                {opt.label}
                              </SelectItem>
                            );
                          })}
                        </SelectContent>
                      </Select>
                    </div>
                  );
                } else if (filter.type === "multi-select") {
                  const options = filter.options?.map(opt => 
                    typeof opt === 'string' ? opt : opt.value
                  ) || [];
                  return (
                    <MultiSelectFilter
                      key={filter.key}
                      label={filter.label}
                      options={options}
                      value={filterValues[filter.key] || []}
                      onChange={(value) => onFilterChange(filter.key, value)}
                      placeholder={filter.placeholder}
                    />
                  );
                } else if (filter.type === "date-range") {
                  return (
                    <DateRangeFilter
                      key={filter.key}
                      label={filter.label}
                      value={filterValues[filter.key] as DateRange | undefined}
                      onChange={(value) => onFilterChange(filter.key, value)}
                      placeholder={filter.placeholder}
                    />
                  );
                }
                return null;
              })}
            </div>

            {/* Action Buttons Row */}
            <div className="flex items-center gap-2 flex-wrap mt-4 pt-3 border-t">
              {hasActiveFilters && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onClearFilters}
                  className="gap-1.5 h-9 text-xs"
                >
                  <X className="h-3.5 w-3.5" />
                  Clear Filters
                </Button>
              )}
              
              {density && onDensityChange && (
                <Select value={density} onValueChange={onDensityChange}>
                  <SelectTrigger className="w-[130px] h-9 text-xs">
                    <LayoutList className="h-3.5 w-3.5 mr-1.5" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-popover z-50">
                    <SelectItem value="compact">Compact</SelectItem>
                    <SelectItem value="normal">Normal</SelectItem>
                    <SelectItem value="comfortable">Comfortable</SelectItem>
                  </SelectContent>
                </Select>
              )}
              
              {settings && onUpdateSettings && onResetSettings && (
                <TableSettingsPanel
                  settings={settings}
                  onUpdateSettings={onUpdateSettings}
                  onResetSettings={onResetSettings}
                />
              )}
              
              <ColumnVisibilityButton
                allColumns={allColumns}
                visibleKeys={visibleColumns}
                onChange={onColumnVisibilityChange}
                onReset={onResetColumns}
              />
            </div>
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}

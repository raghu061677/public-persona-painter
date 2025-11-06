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
import { Filter, X } from "lucide-react";
import ColumnVisibilityButton from "./column-visibility-button";

export interface FilterConfig {
  key: string;
  label: string;
  type: "text" | "select";
  placeholder?: string;
  options?: { value: string; label: string }[];
}

interface TableFiltersProps {
  filters: FilterConfig[];
  filterValues: Record<string, string>;
  onFilterChange: (key: string, value: string) => void;
  onClearFilters: () => void;
  // Column visibility props
  allColumns: { key: string; label: string }[];
  visibleColumns: string[];
  onColumnVisibilityChange: (keys: string[]) => void;
  onResetColumns: () => void;
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
}: TableFiltersProps) {
  const hasActiveFilters = Object.values(filterValues).some(v => v !== "");

  return (
    <Collapsible defaultOpen>
      <Card className="border-2 mb-4">
        <CollapsibleTrigger asChild>
          <CardHeader className="p-4 cursor-pointer hover:bg-muted/20 transition-colors">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Filter className="h-5 w-5 text-primary" />
                </div>
                <CardTitle className="text-lg font-semibold">
                  Filters & Columns
                  {hasActiveFilters && (
                    <span className="ml-2 text-xs font-normal text-muted-foreground">
                      ({Object.values(filterValues).filter(v => v !== "").length} active)
                    </span>
                  )}
                </CardTitle>
              </div>
              <Button variant="ghost" size="sm">
                Toggle
              </Button>
            </div>
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="p-4 sm:p-6 border-t">
            <div className="flex items-end gap-4 flex-wrap">
              {/* Dynamic Filters */}
              {filters.map((filter) => (
                <div key={filter.key} className="flex-1 min-w-[200px]">
                  <Label className="text-sm font-medium mb-2">{filter.label}</Label>
                  {filter.type === "text" ? (
                    <Input
                      placeholder={filter.placeholder || `Search ${filter.label.toLowerCase()}...`}
                      value={filterValues[filter.key] || ""}
                      onChange={(e) => onFilterChange(filter.key, e.target.value)}
                      className="w-full"
                    />
                  ) : (
                    <Select
                      value={filterValues[filter.key] || ""}
                      onValueChange={(value) => onFilterChange(filter.key, value)}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder={filter.placeholder || `Select ${filter.label.toLowerCase()}`} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">All {filter.label}</SelectItem>
                        {filter.options?.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>
              ))}

              {/* Action Buttons */}
              <div className="flex gap-2">
                {hasActiveFilters && (
                  <Button
                    variant="outline"
                    onClick={onClearFilters}
                    className="gap-2"
                  >
                    <X className="h-4 w-4" />
                    Clear Filters
                  </Button>
                )}
                <ColumnVisibilityButton
                  allColumns={allColumns}
                  visibleKeys={visibleColumns}
                  onChange={onColumnVisibilityChange}
                  onReset={onResetColumns}
                />
              </div>
            </div>
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}

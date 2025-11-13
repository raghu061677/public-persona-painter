import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Filter, MapPin, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface QuickFilterBarProps {
  statusOptions: string[];
  cityOptions: string[];
  selectedStatus?: string;
  selectedCity?: string;
  onStatusChange: (status: string) => void;
  onCityChange: (city: string) => void;
  onClearAll: () => void;
  activeFiltersCount?: number;
}

export function QuickFilterBar({
  statusOptions,
  cityOptions,
  selectedStatus,
  selectedCity,
  onStatusChange,
  onCityChange,
  onClearAll,
  activeFiltersCount = 0,
}: QuickFilterBarProps) {
  const hasActiveFilters = selectedStatus || selectedCity || activeFiltersCount > 0;

  return (
    <Card className="mb-4 shadow-sm border">
      <CardContent className="p-3">
        <div className="flex items-center gap-3 flex-wrap">
          {/* Filter Icon & Label */}
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <Filter className="h-4 w-4" />
            <span>Quick Filters:</span>
          </div>

          {/* Status Chips */}
          <div className="flex items-center gap-2 flex-wrap">
            <Badge
              variant={!selectedStatus ? "default" : "outline"}
              className={cn(
                "cursor-pointer hover:bg-primary/90 transition-colors",
                !selectedStatus && "bg-primary text-primary-foreground"
              )}
              onClick={() => onStatusChange("")}
            >
              All Status
            </Badge>
            {statusOptions.map((status) => (
              <Badge
                key={status}
                variant={selectedStatus === status ? "default" : "outline"}
                className={cn(
                  "cursor-pointer transition-colors",
                  selectedStatus === status
                    ? "bg-primary text-primary-foreground"
                    : "hover:bg-muted"
                )}
                onClick={() => onStatusChange(status)}
              >
                {status}
              </Badge>
            ))}
          </div>

          {/* Divider */}
          <div className="h-6 w-px bg-border" />

          {/* City Dropdown */}
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-muted-foreground" />
            <Select value={selectedCity || "__all__"} onValueChange={(val) => onCityChange(val === "__all__" ? "" : val)}>
              <SelectTrigger className="w-[160px] h-8 text-sm">
                <SelectValue placeholder="All Cities" />
              </SelectTrigger>
              <SelectContent className="bg-popover z-50">
                <SelectItem value="__all__">All Cities</SelectItem>
                {cityOptions.map((city) => (
                  <SelectItem key={city} value={city}>
                    {city}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Clear All Button */}
          {hasActiveFilters && (
            <>
              <div className="h-6 w-px bg-border" />
              <Badge
                variant="secondary"
                className="cursor-pointer hover:bg-destructive/10 hover:text-destructive transition-colors gap-1"
                onClick={onClearAll}
              >
                <X className="h-3 w-3" />
                Clear All
              </Badge>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

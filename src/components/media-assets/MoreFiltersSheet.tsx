import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { DateRangeFilter } from "@/components/common/date-range-filter";
import { DateRange } from "react-day-picker";
import { X } from "lucide-react";

interface MoreFiltersSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  location: string;
  area: string;
  createdRange?: DateRange;
  onLocationChange: (v: string) => void;
  onAreaChange: (v: string) => void;
  onCreatedRangeChange: (v: DateRange | undefined) => void;
  onClearAll: () => void;
}

export function MoreFiltersSheet({
  open,
  onOpenChange,
  location,
  area,
  createdRange,
  onLocationChange,
  onAreaChange,
  onCreatedRangeChange,
  onClearAll,
}: MoreFiltersSheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle>More Filters</SheetTitle>
          <SheetDescription>
            Apply advanced filters to refine the asset list.
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-5 py-6">
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-muted-foreground">
              Location / Landmark
            </Label>
            <Input
              placeholder="Search location..."
              value={location}
              onChange={(e) => onLocationChange(e.target.value)}
              className="h-9 text-sm"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-muted-foreground">
              Area
            </Label>
            <Input
              placeholder="Search area..."
              value={area}
              onChange={(e) => onAreaChange(e.target.value)}
              className="h-9 text-sm"
            />
          </div>

          <DateRangeFilter
            label="Created Date"
            value={createdRange}
            onChange={onCreatedRangeChange}
            placeholder="Pick a date range..."
          />
        </div>

        <SheetFooter className="flex-row justify-between gap-2 sm:justify-between">
          <Button variant="outline" onClick={onClearAll} className="gap-2">
            <X className="h-4 w-4" />
            Clear All
          </Button>
          <Button onClick={() => onOpenChange(false)}>Done</Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

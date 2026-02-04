import { useState, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { AlertTriangle, CalendarDays, CalendarIcon } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { format, differenceInDays } from "date-fns";
import { cn } from "@/lib/utils";
import { computeRentAmount, BillingMode } from "@/utils/perAssetPricing";

interface BulkAssetDatesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  assets: any[];
  selectedAssetIds: Set<string>;
  assetPricing: Record<string, any>;
  onBulkUpdate: (updates: Array<{ assetId: string; field: string; value: any }>) => void;
}

/**
 * Convert Date to YYYY-MM-DD string in local time (no timezone shift)
 */
const toDateOnlyString = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/**
 * Parse YYYY-MM-DD string to local Date at noon (avoids timezone shift)
 */
const parseDateOnly = (dateStr: string): Date => {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day, 12, 0, 0);
};

/**
 * Calculate inclusive days between two dates
 * Formula: (end - start) + 1
 */
const calcInclusiveDays = (startDate: Date, endDate: Date): number => {
  const diffDays = differenceInDays(endDate, startDate);
  return Math.max(1, diffDays + 1);
};

export function BulkAssetDatesDialog({
  open,
  onOpenChange,
  assets,
  selectedAssetIds,
  assetPricing,
  onBulkUpdate,
}: BulkAssetDatesDialogProps) {
  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);
  const [applyMode, setApplyMode] = useState<"selected" | "all">("selected");

  // Determine which assets to apply to
  const targetAssets = useMemo(() => {
    if (applyMode === "all") return assets;
    return assets.filter((a) => selectedAssetIds.has(a.id));
  }, [applyMode, assets, selectedAssetIds]);

  // Preview calculations
  const preview = useMemo(() => {
    if (!startDate || !endDate) return { count: 0, days: 0, details: [] };
    if (endDate < startDate) return { count: 0, days: 0, details: [], error: "End date must be >= Start date" };

    const days = calcInclusiveDays(startDate, endDate);

    const details: Array<{
      id: string;
      code: string;
      currentDays: number;
      newDays: number;
    }> = [];

    targetAssets.forEach((asset) => {
      const pricing = assetPricing[asset.id] || {};
      const currentDays = pricing.booked_days || 30;

      details.push({
        id: asset.id,
        code: asset.media_asset_code || asset.id,
        currentDays,
        newDays: days,
      });
    });

    return { count: details.length, days, details };
  }, [startDate, endDate, targetAssets, assetPricing]);

  const handleApply = () => {
    if (!startDate || !endDate) {
      toast({
        title: "Missing Dates",
        description: "Please select both start and end dates",
        variant: "destructive",
      });
      return;
    }

    if (endDate < startDate) {
      toast({
        title: "Invalid Date Range",
        description: "End date must be on or after start date",
        variant: "destructive",
      });
      return;
    }

    const days = calcInclusiveDays(startDate, endDate);
    const startStr = toDateOnlyString(startDate);
    const endStr = toDateOnlyString(endDate);

    const updates: Array<{ assetId: string; field: string; value: any }> = [];

    targetAssets.forEach((asset) => {
      const pricing = assetPricing[asset.id] || {};
      const negotiatedPrice = pricing.negotiated_price || asset.card_rate || 0;
      const billingMode: BillingMode = pricing.billing_mode || 'PRORATA_30';

      // Update dates
      updates.push({ assetId: asset.id, field: "start_date", value: startStr });
      updates.push({ assetId: asset.id, field: "end_date", value: endStr });
      updates.push({ assetId: asset.id, field: "booked_days", value: days });

      // Recalculate rent
      const rentResult = computeRentAmount(negotiatedPrice, startDate, endDate, billingMode);
      updates.push({ assetId: asset.id, field: "rent_amount", value: rentResult.rent_amount });
      updates.push({ assetId: asset.id, field: "daily_rate", value: rentResult.daily_rate });
    });

    if (updates.length === 0) {
      toast({
        title: "No Updates",
        description: "No assets were updated.",
        variant: "default",
      });
      return;
    }

    onBulkUpdate(updates);

    toast({
      title: "Bulk Dates Updated",
      description: `Updated dates for ${targetAssets.length} asset(s) to ${format(startDate, "dd MMM")} - ${format(endDate, "dd MMM yyyy")} (${days} days)`,
    });

    // Reset and close
    setStartDate(undefined);
    setEndDate(undefined);
    setApplyMode("selected");
    onOpenChange(false);
  };

  const hasError = startDate && endDate && endDate < startDate;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[85vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <CalendarDays className="h-5 w-5" />
            Bulk Update Asset Dates
          </DialogTitle>
          <DialogDescription>
            Apply the same start and end dates to multiple assets. Days will be auto-calculated.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 max-h-[55vh] pr-4">
          <div className="space-y-4 py-4">
            {/* Start Date */}
            <div className="space-y-2">
              <Label>Start Date</Label>
              <Popover modal={true}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !startDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {startDate ? format(startDate, "dd MMM yyyy") : "Select start date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 pointer-events-auto" align="start">
                  <Calendar
                    mode="single"
                    selected={startDate}
                    onSelect={setStartDate}
                    initialFocus
                    className="pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* End Date */}
            <div className="space-y-2">
              <Label>End Date</Label>
              <Popover modal={true}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !endDate && "text-muted-foreground",
                      hasError && "border-destructive"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {endDate ? format(endDate, "dd MMM yyyy") : "Select end date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 pointer-events-auto" align="start">
                  <Calendar
                    mode="single"
                    selected={endDate}
                    onSelect={setEndDate}
                    initialFocus
                    className="pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
              {hasError && (
                <p className="text-sm text-destructive">End date must be on or after start date</p>
              )}
            </div>

            {/* Apply Mode */}
            <div className="space-y-2">
              <Label>Apply to</Label>
              <RadioGroup
                value={applyMode}
                onValueChange={(v) => setApplyMode(v as "selected" | "all")}
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="selected" id="dates-selected" />
                  <Label htmlFor="dates-selected" className="font-normal cursor-pointer">
                    Selected assets only ({selectedAssetIds.size} selected)
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="all" id="dates-all" />
                  <Label htmlFor="dates-all" className="font-normal cursor-pointer">
                    All assets in plan ({assets.length} total)
                  </Label>
                </div>
              </RadioGroup>
            </div>

            {/* Preview */}
            {preview.count > 0 && startDate && endDate && !hasError && (
              <div className="rounded-lg border bg-muted/50 p-3 space-y-3">
                <div className="text-sm font-medium">Preview</div>
                <div className="text-sm text-muted-foreground">
                  Will update <span className="font-semibold text-foreground">{preview.count}</span> asset(s) to{" "}
                  <span className="font-semibold text-foreground">{preview.days} days</span>
                </div>

                {/* Mini table showing first 5 affected assets */}
                {preview.details.length > 0 && (
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left py-1.5 pr-2 font-medium">Asset Code</th>
                          <th className="text-right py-1.5 px-2 font-medium">Current Days</th>
                          <th className="text-right py-1.5 pl-2 font-medium">New Days</th>
                        </tr>
                      </thead>
                      <tbody>
                        {preview.details.slice(0, 5).map((detail) => (
                          <tr key={detail.id} className="border-b border-muted">
                            <td className="py-1.5 pr-2 font-mono">{detail.code}</td>
                            <td className="text-right py-1.5 px-2 text-muted-foreground">{detail.currentDays}</td>
                            <td className="text-right py-1.5 pl-2 text-green-600 font-medium">{detail.newDays}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {preview.details.length > 5 && (
                      <p className="text-xs text-muted-foreground mt-2">
                        ...and {preview.details.length - 5} more
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Warning */}
            <div className="flex items-start gap-2 text-sm text-muted-foreground bg-yellow-50 dark:bg-yellow-950/30 p-3 rounded-lg border border-yellow-200 dark:border-yellow-800">
              <AlertTriangle className="h-4 w-4 text-yellow-600 mt-0.5 flex-shrink-0" />
              <span>
                This will update <strong>ONLY</strong> asset dates and recalculate rent. 
                Printing, mounting, and negotiated rates will not be changed.
              </span>
            </div>
          </div>
        </ScrollArea>

        <DialogFooter className="flex-shrink-0">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleApply} 
            disabled={!startDate || !endDate || preview.count === 0 || !!hasError}
          >
            Apply to {preview.count} Asset(s)
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

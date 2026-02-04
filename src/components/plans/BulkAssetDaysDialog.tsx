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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AlertTriangle, Calendar } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { format, addDays } from "date-fns";
import { computeRentAmount, BillingMode } from "@/utils/perAssetPricing";

interface BulkAssetDaysDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  assets: any[];
  selectedAssetIds: Set<string>;
  assetPricing: Record<string, any>;
  planStartDate?: Date;
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

export function BulkAssetDaysDialog({
  open,
  onOpenChange,
  assets,
  selectedAssetIds,
  assetPricing,
  planStartDate,
  onBulkUpdate,
}: BulkAssetDaysDialogProps) {
  const [days, setDays] = useState<string>("");
  const [applyMode, setApplyMode] = useState<"selected" | "all">("selected");

  // Determine which assets to apply to
  const targetAssets = useMemo(() => {
    if (applyMode === "all") return assets;
    return assets.filter((a) => selectedAssetIds.has(a.id));
  }, [applyMode, assets, selectedAssetIds]);

  // Check which assets have start dates set
  const assetsWithStartDates = useMemo(() => {
    return targetAssets.filter((asset) => {
      const pricing = assetPricing[asset.id] || {};
      return pricing.start_date || planStartDate;
    });
  }, [targetAssets, assetPricing, planStartDate]);

  const assetsWithoutStartDates = useMemo(() => {
    return targetAssets.filter((asset) => {
      const pricing = assetPricing[asset.id] || {};
      return !pricing.start_date && !planStartDate;
    });
  }, [targetAssets, assetPricing, planStartDate]);

  // Preview calculations
  const preview = useMemo(() => {
    const daysNum = parseInt(days) || 0;
    if (daysNum < 1) return { count: 0, details: [] };

    const details: Array<{
      id: string;
      code: string;
      currentDays: number;
      newDays: number;
      startDate: string;
      newEndDate: string;
      hasStartDate: boolean;
    }> = [];

    assetsWithStartDates.forEach((asset) => {
      const pricing = assetPricing[asset.id] || {};
      const currentDays = pricing.booked_days || 30;
      
      // Get start date (asset-level or plan-level)
      const startDateStr = pricing.start_date;
      const startDate = startDateStr ? parseDateOnly(startDateStr) : (planStartDate || new Date());
      
      // Calculate new end date = start + (days - 1) for INCLUSIVE counting
      const newEndDate = addDays(startDate, daysNum - 1);

      details.push({
        id: asset.id,
        code: asset.media_asset_code || asset.id,
        currentDays,
        newDays: daysNum,
        startDate: format(startDate, "dd/MM"),
        newEndDate: format(newEndDate, "dd/MM/yy"),
        hasStartDate: !!startDateStr,
      });
    });

    return { count: details.length, details };
  }, [days, assetsWithStartDates, assetPricing, planStartDate]);

  const handleApply = () => {
    const daysNum = parseInt(days) || 0;
    if (daysNum < 1) {
      toast({
        title: "Invalid Days",
        description: "Please enter a valid number of days (minimum 1)",
        variant: "destructive",
      });
      return;
    }

    if (assetsWithStartDates.length === 0) {
      toast({
        title: "No Start Dates Set",
        description: "All selected assets require a start date to update days",
        variant: "destructive",
      });
      return;
    }

    const updates: Array<{ assetId: string; field: string; value: any }> = [];

    assetsWithStartDates.forEach((asset) => {
      const pricing = assetPricing[asset.id] || {};
      const negotiatedPrice = pricing.negotiated_price || asset.card_rate || 0;
      const billingMode: BillingMode = pricing.billing_mode || 'PRORATA_30';

      // Get start date (asset-level or plan-level)
      const startDateStr = pricing.start_date;
      const startDate = startDateStr ? parseDateOnly(startDateStr) : (planStartDate || new Date());
      
      // Calculate new end date = start + (days - 1) for INCLUSIVE counting
      const newEndDate = addDays(startDate, daysNum - 1);
      const newEndStr = toDateOnlyString(newEndDate);

      // Update end_date and booked_days
      updates.push({ assetId: asset.id, field: "end_date", value: newEndStr });
      updates.push({ assetId: asset.id, field: "booked_days", value: daysNum });

      // Recalculate rent
      const rentResult = computeRentAmount(negotiatedPrice, startDate, newEndDate, billingMode);
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

    const skippedMsg = assetsWithoutStartDates.length > 0 
      ? ` (${assetsWithoutStartDates.length} skipped - no start date)`
      : "";

    toast({
      title: "Bulk Days Updated",
      description: `Updated ${assetsWithStartDates.length} asset(s) to ${daysNum} days${skippedMsg}`,
    });

    // Reset and close
    setDays("");
    setApplyMode("selected");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[85vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Bulk Update Asset Days
          </DialogTitle>
          <DialogDescription>
            Set the same duration (days) for multiple assets. End dates will be recalculated based on each asset's start date.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 max-h-[55vh] pr-4">
          <div className="space-y-4 py-4">
            {/* Days Input */}
            <div className="space-y-2">
              <Label htmlFor="bulkDays">Number of Days (inclusive)</Label>
              <Input
                id="bulkDays"
                type="number"
                min="1"
                max="365"
                value={days}
                onChange={(e) => setDays(e.target.value)}
                placeholder="e.g., 30"
                className="text-lg"
              />
              <p className="text-xs text-muted-foreground">
                Example: 10 days = Start + 9 days = End (inclusive counting)
              </p>
            </div>

            {/* Apply Mode */}
            <div className="space-y-2">
              <Label>Apply to</Label>
              <RadioGroup
                value={applyMode}
                onValueChange={(v) => setApplyMode(v as "selected" | "all")}
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="selected" id="days-selected" />
                  <Label htmlFor="days-selected" className="font-normal cursor-pointer">
                    Selected assets only ({selectedAssetIds.size} selected)
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="all" id="days-all" />
                  <Label htmlFor="days-all" className="font-normal cursor-pointer">
                    All assets in plan ({assets.length} total)
                  </Label>
                </div>
              </RadioGroup>
            </div>

            {/* Warning for assets without start dates */}
            {assetsWithoutStartDates.length > 0 && (
              <div className="flex items-start gap-2 text-sm text-destructive bg-destructive/10 p-3 rounded-lg border border-destructive/30">
                <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <span>
                  <strong>{assetsWithoutStartDates.length} asset(s)</strong> do not have a start date set and will be skipped.
                  Set start dates first or use "Bulk Asset Dates" to set both.
                </span>
              </div>
            )}

            {/* Preview */}
            {preview.count > 0 && days && (
              <div className="rounded-lg border bg-muted/50 p-3 space-y-3">
                <div className="text-sm font-medium">Preview</div>
                <div className="text-sm text-muted-foreground">
                  Will update <span className="font-semibold text-foreground">{preview.count}</span> asset(s) to{" "}
                  <span className="font-semibold text-foreground">{days} days</span>
                </div>

                {/* Mini table showing first 5 affected assets */}
                {preview.details.length > 0 && (
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left py-1.5 pr-2 font-medium">Asset</th>
                          <th className="text-center py-1.5 px-2 font-medium">Start</th>
                          <th className="text-center py-1.5 px-2 font-medium">New End</th>
                          <th className="text-right py-1.5 pl-2 font-medium">Days</th>
                        </tr>
                      </thead>
                      <tbody>
                        {preview.details.slice(0, 5).map((detail) => (
                          <tr key={detail.id} className="border-b border-muted">
                            <td className="py-1.5 pr-2 font-mono text-xs">{detail.code}</td>
                            <td className="text-center py-1.5 px-2">{detail.startDate}</td>
                            <td className="text-center py-1.5 px-2 text-green-600">{detail.newEndDate}</td>
                            <td className="text-right py-1.5 pl-2 font-medium">{detail.newDays}</td>
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

            {/* Info */}
            <div className="flex items-start gap-2 text-sm text-muted-foreground bg-yellow-50 dark:bg-yellow-950/30 p-3 rounded-lg border border-yellow-200 dark:border-yellow-800">
              <AlertTriangle className="h-4 w-4 text-yellow-600 mt-0.5 flex-shrink-0" />
              <span>
                This will update <strong>ONLY</strong> end dates and booked days. Start dates, printing, mounting, and rates will not be changed.
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
            disabled={!days || parseInt(days) < 1 || preview.count === 0}
          >
            Apply to {preview.count} Asset(s)
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

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
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import { DollarSign } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { formatCurrency } from "@/utils/mediaAssets";
import { computeRentAmount, BillingMode } from "@/utils/perAssetPricing";

interface BulkNegotiatedRateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  assets: any[];
  selectedAssetIds: Set<string>;
  assetPricing: Record<string, any>;
  planStartDate?: Date;
  planEndDate?: Date;
  onBulkUpdate: (updates: Array<{ assetId: string; field: string; value: any }>) => void;
}

/**
 * Parse YYYY-MM-DD string to local Date at noon (avoids timezone shift)
 */
const parseDateOnly = (dateStr: string): Date => {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day, 12, 0, 0);
};

export function BulkNegotiatedRateDialog({
  open,
  onOpenChange,
  assets,
  selectedAssetIds,
  assetPricing,
  planStartDate,
  planEndDate,
  onBulkUpdate,
}: BulkNegotiatedRateDialogProps) {
  const [rate, setRate] = useState<string>("");
  const [applyMode, setApplyMode] = useState<"selected" | "all">("selected");
  const [overrideExisting, setOverrideExisting] = useState(false);

  // Determine which assets to apply to
  const targetAssets = useMemo(() => {
    if (applyMode === "all") return assets;
    return assets.filter((a) => selectedAssetIds.has(a.id));
  }, [applyMode, assets, selectedAssetIds]);

  // Preview: show which assets will be affected
  const preview = useMemo(() => {
    const rateNum = parseFloat(rate) || 0;
    if (rateNum <= 0) return { willUpdate: [], willSkip: [] };

    const willUpdate: Array<{
      id: string;
      code: string;
      currentRate: number;
      newRate: number;
      reason: string;
    }> = [];
    const willSkip: Array<{
      id: string;
      code: string;
      currentRate: number;
      reason: string;
    }> = [];

    targetAssets.forEach((asset) => {
      const pricing = assetPricing[asset.id] || {};
      const currentRate = pricing.negotiated_price || 0;
      const hasExistingRate = currentRate > 0;

      if (overrideExisting || !hasExistingRate) {
        willUpdate.push({
          id: asset.id,
          code: asset.media_asset_code || asset.id,
          currentRate,
          newRate: rateNum,
          reason: hasExistingRate ? "Override enabled" : "No existing rate",
        });
      } else {
        willSkip.push({
          id: asset.id,
          code: asset.media_asset_code || asset.id,
          currentRate,
          reason: "Existing rate preserved",
        });
      }
    });

    return { willUpdate, willSkip };
  }, [rate, targetAssets, assetPricing, overrideExisting]);

  const handleApply = () => {
    const rateNum = parseFloat(rate) || 0;
    if (rateNum <= 0) {
      toast({
        title: "Invalid Rate",
        description: "Please enter a valid negotiated rate greater than 0",
        variant: "destructive",
      });
      return;
    }

    if (preview.willUpdate.length === 0) {
      toast({
        title: "No Updates",
        description: "No assets will be updated. Enable override to update existing rates.",
        variant: "destructive",
      });
      return;
    }

    const updates: Array<{ assetId: string; field: string; value: any }> = [];

    preview.willUpdate.forEach(({ id }) => {
      const asset = assets.find((a) => a.id === id);
      if (!asset) return;

      const pricing = assetPricing[id] || {};
      
      // Update negotiated rate
      updates.push({ assetId: id, field: "negotiated_price", value: rateNum });

      // Recalculate rent_amount with the new rate
      const startDate = pricing.start_date 
        ? parseDateOnly(pricing.start_date) 
        : planStartDate || new Date();
      const endDate = pricing.end_date 
        ? parseDateOnly(pricing.end_date) 
        : planEndDate || new Date();
      const billingMode: BillingMode = pricing.billing_mode || "PRORATA_30";

      const rentResult = computeRentAmount(rateNum, startDate, endDate, billingMode);
      updates.push({ assetId: id, field: "rent_amount", value: rentResult.rent_amount });
      updates.push({ assetId: id, field: "daily_rate", value: rentResult.daily_rate });
    });

    onBulkUpdate(updates);
    
    toast({
      title: "Negotiated Rates Updated",
      description: `Updated ${preview.willUpdate.length} asset(s)${preview.willSkip.length > 0 ? `, skipped ${preview.willSkip.length}` : ""}`,
    });

    // Reset and close
    setRate("");
    setApplyMode("selected");
    setOverrideExisting(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Bulk Update Negotiated Rate
          </DialogTitle>
          <DialogDescription>
            Set a negotiated rate (₹/Month) for multiple assets at once.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Rate Input */}
          <div className="space-y-2">
            <Label htmlFor="bulk-rate">Negotiated Rate (₹/Month)</Label>
            <Input
              id="bulk-rate"
              type="number"
              min={0}
              step={100}
              placeholder="e.g., 50000"
              value={rate}
              onChange={(e) => setRate(e.target.value)}
            />
          </div>

          {/* Apply Mode */}
          <div className="space-y-2">
            <Label>Apply to:</Label>
            <RadioGroup
              value={applyMode}
              onValueChange={(val) => setApplyMode(val as "selected" | "all")}
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="selected" id="apply-selected" />
                <Label htmlFor="apply-selected" className="cursor-pointer">
                  Selected assets ({selectedAssetIds.size})
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="all" id="apply-all" />
                <Label htmlFor="apply-all" className="cursor-pointer">
                  All assets in this plan ({assets.length})
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* Override Toggle */}
          <div className="flex items-center justify-between rounded-lg border p-3">
            <div className="space-y-0.5">
              <Label htmlFor="override-toggle">Override existing values</Label>
              <p className="text-xs text-muted-foreground">
                Update assets that already have a negotiated rate
              </p>
            </div>
            <Switch
              id="override-toggle"
              checked={overrideExisting}
              onCheckedChange={setOverrideExisting}
            />
          </div>

          {/* Preview */}
          {parseFloat(rate) > 0 && (
            <div className="rounded-lg border p-3 space-y-2">
              <p className="text-sm font-medium">
                Preview: {preview.willUpdate.length} will update, {preview.willSkip.length} will skip
              </p>
              {preview.willUpdate.length > 0 && (
                <ScrollArea className="max-h-32">
                  <div className="text-xs space-y-1">
                    {preview.willUpdate.slice(0, 5).map((item) => (
                      <div key={item.id} className="flex justify-between text-muted-foreground">
                        <span>{item.code}</span>
                        <span>
                          {item.currentRate > 0 && (
                            <span className="line-through mr-1">{formatCurrency(item.currentRate)}</span>
                          )}
                          → {formatCurrency(item.newRate)}
                        </span>
                      </div>
                    ))}
                    {preview.willUpdate.length > 5 && (
                      <p className="text-muted-foreground">
                        ... and {preview.willUpdate.length - 5} more
                      </p>
                    )}
                  </div>
                </ScrollArea>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleApply} disabled={!rate || parseFloat(rate) <= 0}>
            Apply to {preview.willUpdate.length} Asset(s)
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

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
import { Checkbox } from "@/components/ui/checkbox";
import { AlertTriangle, Printer } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { getAssetSqft, calculatePrintingCost } from "@/utils/effectivePricing";

interface BulkPrintingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  assets: any[];
  selectedAssetIds: Set<string>;
  assetPricing: Record<string, any>;
  onBulkUpdate: (updates: Array<{ assetId: string; field: string; value: any }>) => void;
}

export function BulkPrintingDialog({
  open,
  onOpenChange,
  assets,
  selectedAssetIds,
  assetPricing,
  onBulkUpdate,
}: BulkPrintingDialogProps) {
  const [printingRate, setPrintingRate] = useState("");
  const [applyMode, setApplyMode] = useState<"selected" | "all">("selected");
  const [overrideExisting, setOverrideExisting] = useState(false);
  const [autoRecalculate, setAutoRecalculate] = useState(true);

  // Determine which assets to apply to
  const targetAssets = useMemo(() => {
    if (applyMode === "all") return assets;
    return assets.filter((a) => selectedAssetIds.has(a.id));
  }, [applyMode, assets, selectedAssetIds]);

  // Preview calculations
  const preview = useMemo(() => {
    const rate = parseFloat(printingRate) || 0;
    if (rate <= 0) return { count: 0, totalCost: 0, details: [] };

    const details: Array<{
      id: string;
      code: string;
      sqft: number;
      cost: number;
      hasExisting: boolean;
    }> = [];

    let totalCost = 0;
    targetAssets.forEach((asset) => {
      const pricing = assetPricing[asset.id] || {};
      const hasExisting = (pricing.printing_rate || 0) > 0;

      // Skip if not overriding existing
      if (hasExisting && !overrideExisting) return;

      const sqft = getAssetSqft(asset);
      const result = calculatePrintingCost(asset, rate);
      const cost = autoRecalculate ? result.cost : rate * sqft;

      details.push({
        id: asset.id,
        code: asset.media_asset_code || asset.id,
        sqft,
        cost,
        hasExisting,
      });
      totalCost += cost;
    });

    return { count: details.length, totalCost, details };
  }, [printingRate, targetAssets, assetPricing, overrideExisting, autoRecalculate]);

  const handleApply = () => {
    const rate = parseFloat(printingRate) || 0;
    if (rate <= 0) {
      toast({
        title: "Invalid Rate",
        description: "Please enter a valid printing rate per SQFT",
        variant: "destructive",
      });
      return;
    }

    const updates: Array<{ assetId: string; field: string; value: any }> = [];

    targetAssets.forEach((asset) => {
      const pricing = assetPricing[asset.id] || {};
      const hasExisting = (pricing.printing_rate || 0) > 0;

      // Skip if not overriding existing
      if (hasExisting && !overrideExisting) return;

      const result = calculatePrintingCost(asset, rate);

      // Update printing_rate
      updates.push({ assetId: asset.id, field: "printing_rate", value: rate });
      // Update printing_charges (calculated cost)
      updates.push({ assetId: asset.id, field: "printing_charges", value: result.cost });
    });

    if (updates.length === 0) {
      toast({
        title: "No Updates",
        description: "No assets were updated. Check if you need to enable 'Override existing'.",
        variant: "default",
      });
      return;
    }

    onBulkUpdate(updates);

    toast({
      title: "Bulk Printing Updated",
      description: `Updated printing for ${updates.length / 2} assets at ₹${rate}/sqft`,
    });

    // Reset and close
    setPrintingRate("");
    setApplyMode("selected");
    setOverrideExisting(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Printer className="h-5 w-5" />
            Bulk Printing Update
          </DialogTitle>
          <DialogDescription>
            Apply printing rate to multiple assets. Only printing fields will be updated.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Printing Rate Input */}
          <div className="space-y-2">
            <Label htmlFor="printingRate">Printing Rate per SQFT (₹)</Label>
            <Input
              id="printingRate"
              type="number"
              min="0"
              step="0.5"
              value={printingRate}
              onChange={(e) => setPrintingRate(e.target.value)}
              placeholder="e.g., 17"
              className="text-lg"
            />
          </div>

          {/* Apply Mode */}
          <div className="space-y-2">
            <Label>Apply to</Label>
            <RadioGroup
              value={applyMode}
              onValueChange={(v) => setApplyMode(v as "selected" | "all")}
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="selected" id="selected" />
                <Label htmlFor="selected" className="font-normal cursor-pointer">
                  Selected assets only ({selectedAssetIds.size} selected)
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="all" id="all" />
                <Label htmlFor="all" className="font-normal cursor-pointer">
                  All assets in plan ({assets.length} total)
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* Override existing */}
          <div className="flex items-center space-x-2">
            <Checkbox
              id="overrideExisting"
              checked={overrideExisting}
              onCheckedChange={(v) => setOverrideExisting(!!v)}
            />
            <Label htmlFor="overrideExisting" className="font-normal cursor-pointer">
              Override existing printing values
            </Label>
          </div>

          {/* Auto-recalculate */}
          <div className="flex items-center space-x-2">
            <Checkbox
              id="autoRecalculate"
              checked={autoRecalculate}
              onCheckedChange={(v) => setAutoRecalculate(!!v)}
            />
            <Label htmlFor="autoRecalculate" className="font-normal cursor-pointer">
              Auto-calculate cost (SQFT × Rate)
            </Label>
          </div>

          {/* Preview */}
          {preview.count > 0 && (
            <div className="rounded-lg border bg-muted/50 p-3 space-y-3">
              <div className="text-sm font-medium">Preview</div>
              <div className="text-sm text-muted-foreground">
                Will update <span className="font-semibold text-foreground">{preview.count}</span> asset(s)
              </div>
              
              {/* Mini table showing first 5 affected assets */}
              {preview.details.length > 0 && (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-1.5 pr-2 font-medium">Asset Code</th>
                        <th className="text-right py-1.5 px-2 font-medium">SQFT</th>
                        <th className="text-right py-1.5 pl-2 font-medium">New Cost</th>
                      </tr>
                    </thead>
                    <tbody>
                      {preview.details.slice(0, 5).map((detail) => (
                        <tr key={detail.id} className="border-b border-muted">
                          <td className="py-1.5 pr-2 font-mono">{detail.code}</td>
                          <td className="text-right py-1.5 px-2">{detail.sqft.toLocaleString('en-IN')}</td>
                          <td className="text-right py-1.5 pl-2 text-green-600 font-medium">
                            ₹{detail.cost.toLocaleString("en-IN", { maximumFractionDigits: 2 })}
                          </td>
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
              
              <div className="text-sm pt-2 border-t">
                Total printing cost:{" "}
                <span className="font-semibold text-green-600 dark:text-green-400">
                  ₹{preview.totalCost.toLocaleString("en-IN", { maximumFractionDigits: 2 })}
                </span>
              </div>
            </div>
          )}

          {/* Warning */}
          <div className="flex items-start gap-2 text-sm text-muted-foreground bg-yellow-50 dark:bg-yellow-950/30 p-3 rounded-lg border border-yellow-200 dark:border-yellow-800">
            <AlertTriangle className="h-4 w-4 text-yellow-600 mt-0.5 flex-shrink-0" />
            <span>
              This will update <strong>ONLY</strong> printing rate and cost. Rates, dates, and other fields
              will not be changed.
            </span>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleApply} disabled={!printingRate || preview.count === 0}>
            Apply to {preview.count} Asset(s)
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

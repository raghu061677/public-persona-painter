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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertTriangle, Hammer } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { getAssetSqft, calculateMountingCost } from "@/utils/effectivePricing";

interface BulkMountingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  assets: any[];
  selectedAssetIds: Set<string>;
  assetPricing: Record<string, any>;
  onBulkUpdate: (updates: Array<{ assetId: string; field: string; value: any }>) => void;
}

export function BulkMountingDialog({
  open,
  onOpenChange,
  assets,
  selectedAssetIds,
  assetPricing,
  onBulkUpdate,
}: BulkMountingDialogProps) {
  const [mountingValue, setMountingValue] = useState("");
  const [mountingMode, setMountingMode] = useState<"sqft" | "fixed">("sqft");
  const [applyMode, setApplyMode] = useState<"selected" | "all">("selected");
  const [overrideExisting, setOverrideExisting] = useState(false);

  // Determine which assets to apply to
  const targetAssets = useMemo(() => {
    if (applyMode === "all") return assets;
    return assets.filter((a) => selectedAssetIds.has(a.id));
  }, [applyMode, assets, selectedAssetIds]);

  // Preview calculations
  const preview = useMemo(() => {
    const value = parseFloat(mountingValue) || 0;
    if (value <= 0) return { count: 0, totalCost: 0, details: [] };

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
      const hasExisting = (pricing.mounting_rate || 0) > 0;

      // Skip if not overriding existing
      if (hasExisting && !overrideExisting) return;

      const sqft = getAssetSqft(asset);
      let cost: number;
      
      if (mountingMode === "fixed") {
        cost = value;
      } else {
        const result = calculateMountingCost(asset, value);
        cost = result.cost;
      }

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
  }, [mountingValue, mountingMode, targetAssets, assetPricing, overrideExisting]);

  const handleApply = () => {
    const value = parseFloat(mountingValue) || 0;
    if (value <= 0) {
      toast({
        title: "Invalid Value",
        description: "Please enter a valid mounting cost/rate",
        variant: "destructive",
      });
      return;
    }

    const updates: Array<{ assetId: string; field: string; value: any }> = [];

    targetAssets.forEach((asset) => {
      const pricing = assetPricing[asset.id] || {};
      const hasExisting = (pricing.mounting_rate || 0) > 0;

      // Skip if not overriding existing
      if (hasExisting && !overrideExisting) return;

      let cost: number;
      if (mountingMode === "fixed") {
        cost = value;
      } else {
        const result = calculateMountingCost(asset, value);
        cost = result.cost;
      }

      // Update mounting_mode
      updates.push({ assetId: asset.id, field: "mounting_mode", value: mountingMode });
      // Update mounting_rate
      updates.push({ assetId: asset.id, field: "mounting_rate", value });
      // Update mounting_charges (calculated cost)
      updates.push({ assetId: asset.id, field: "mounting_charges", value: cost });
    });

    if (updates.length === 0) {
      toast({
        title: "No Updates",
        description: "No assets were updated. Check if you need to enable 'Override existing'.",
        variant: "default",
      });
      return;
    }

    // Each asset gets 3 updates (mode, rate, charges)
    const assetCount = updates.length / 3;
    onBulkUpdate(updates);

    toast({
      title: "Bulk Mounting Updated",
      description: `Updated mounting for ${assetCount} assets (${mountingMode === "fixed" ? "Fixed" : "Per Sqft"})`,
    });

    // Reset and close
    setMountingValue("");
    setMountingMode("sqft");
    setApplyMode("selected");
    setOverrideExisting(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Hammer className="h-5 w-5" />
            Bulk Mounting Update
          </DialogTitle>
          <DialogDescription>
            Apply mounting cost to multiple assets. Only mounting fields will be updated.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Mounting Mode Selection */}
          <div className="space-y-2">
            <Label>Mounting Cost Type</Label>
            <Select value={mountingMode} onValueChange={(v) => setMountingMode(v as "sqft" | "fixed")}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="sqft">Per SQFT (₹/sqft)</SelectItem>
                <SelectItem value="fixed">Fixed Cost (₹)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Mounting Value Input */}
          <div className="space-y-2">
            <Label htmlFor="mountingValue">
              {mountingMode === "fixed" ? "Mounting Cost per Asset (₹)" : "Mounting Rate per SQFT (₹)"}
            </Label>
            <Input
              id="mountingValue"
              type="number"
              min="0"
              step="0.5"
              value={mountingValue}
              onChange={(e) => setMountingValue(e.target.value)}
              placeholder={mountingMode === "fixed" ? "e.g., 5000" : "e.g., 12"}
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
                <RadioGroupItem value="selected" id="m-selected" />
                <Label htmlFor="m-selected" className="font-normal cursor-pointer">
                  Selected assets only ({selectedAssetIds.size} selected)
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="all" id="m-all" />
                <Label htmlFor="m-all" className="font-normal cursor-pointer">
                  All assets in plan ({assets.length} total)
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* Override existing */}
          <div className="flex items-center space-x-2">
            <Checkbox
              id="m-overrideExisting"
              checked={overrideExisting}
              onCheckedChange={(v) => setOverrideExisting(!!v)}
            />
            <Label htmlFor="m-overrideExisting" className="font-normal cursor-pointer">
              Override existing mounting values
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
                        <th className="text-center py-1.5 px-2 font-medium">Mode</th>
                        <th className="text-right py-1.5 pl-2 font-medium">New Cost</th>
                      </tr>
                    </thead>
                    <tbody>
                      {preview.details.slice(0, 5).map((detail) => (
                        <tr key={detail.id} className="border-b border-muted">
                          <td className="py-1.5 pr-2 font-mono">{detail.code}</td>
                          <td className="text-right py-1.5 px-2">{detail.sqft.toLocaleString('en-IN')}</td>
                          <td className="text-center py-1.5 px-2">
                            <span className="text-xs bg-muted px-1.5 py-0.5 rounded">
                              {mountingMode === "fixed" ? "Fixed" : "/Sqft"}
                            </span>
                          </td>
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
                Total mounting cost:{" "}
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
              This will update <strong>ONLY</strong> mounting mode, rate, and cost. Rates, dates, and other
              fields will not be changed.
            </span>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleApply} disabled={!mountingValue || preview.count === 0}>
            Apply to {preview.count} Asset(s)
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

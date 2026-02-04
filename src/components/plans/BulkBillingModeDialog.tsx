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
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calculator } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { computeRentAmount, BillingMode, formatBillingMode } from "@/utils/perAssetPricing";
import { formatCurrency } from "@/utils/mediaAssets";

interface BulkBillingModeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  assets: any[];
  selectedAssetIds: Set<string>;
  assetPricing: Record<string, any>;
  planBillingMode?: BillingMode;
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

const BILLING_MODES: BillingMode[] = ["PRORATA_30", "FULL_MONTH", "DAILY"];

export function BulkBillingModeDialog({
  open,
  onOpenChange,
  assets,
  selectedAssetIds,
  assetPricing,
  planBillingMode = "PRORATA_30",
  planStartDate,
  planEndDate,
  onBulkUpdate,
}: BulkBillingModeDialogProps) {
  const [selectedMode, setSelectedMode] = useState<BillingMode | "">(planBillingMode);
  const [applyMode, setApplyMode] = useState<"selected" | "all">("selected");
  const [overrideExisting, setOverrideExisting] = useState(false);

  // Determine which assets to apply to
  const targetAssets = useMemo(() => {
    if (applyMode === "all") return assets;
    return assets.filter((a) => selectedAssetIds.has(a.id));
  }, [applyMode, assets, selectedAssetIds]);

  // Preview: show which assets will be affected
  const preview = useMemo(() => {
    if (!selectedMode) return { willUpdate: [], willSkip: [] };

    const willUpdate: Array<{
      id: string;
      code: string;
      currentMode: string;
      newMode: string;
      currentRent: number;
      newRent: number;
    }> = [];
    const willSkip: Array<{
      id: string;
      code: string;
      currentMode: string;
      reason: string;
    }> = [];

    targetAssets.forEach((asset) => {
      const pricing = assetPricing[asset.id] || {};
      const currentMode = pricing.billing_mode || "";
      const hasExistingMode = !!currentMode;

      if (overrideExisting || !hasExistingMode) {
        // Calculate new rent with the new billing mode
        const negotiatedPrice = pricing.negotiated_price || asset.card_rate || 0;
        const startDate = pricing.start_date 
          ? parseDateOnly(pricing.start_date) 
          : planStartDate || new Date();
        const endDate = pricing.end_date 
          ? parseDateOnly(pricing.end_date) 
          : planEndDate || new Date();

        const currentRentResult = computeRentAmount(
          negotiatedPrice, startDate, endDate, 
          (currentMode as BillingMode) || "PRORATA_30"
        );
        const newRentResult = computeRentAmount(
          negotiatedPrice, startDate, endDate, selectedMode as BillingMode
        );

        willUpdate.push({
          id: asset.id,
          code: asset.media_asset_code || asset.id,
          currentMode: currentMode || "Not set",
          newMode: selectedMode,
          currentRent: currentRentResult.rent_amount,
          newRent: newRentResult.rent_amount,
        });
      } else {
        willSkip.push({
          id: asset.id,
          code: asset.media_asset_code || asset.id,
          currentMode: formatBillingMode(currentMode as BillingMode),
          reason: "Existing mode preserved",
        });
      }
    });

    return { willUpdate, willSkip };
  }, [selectedMode, targetAssets, assetPricing, overrideExisting, planStartDate, planEndDate]);

  const handleApply = () => {
    if (!selectedMode) {
      toast({
        title: "No Mode Selected",
        description: "Please select a billing mode",
        variant: "destructive",
      });
      return;
    }

    if (preview.willUpdate.length === 0) {
      toast({
        title: "No Updates",
        description: "No assets will be updated. Enable override to update existing modes.",
        variant: "destructive",
      });
      return;
    }

    const updates: Array<{ assetId: string; field: string; value: any }> = [];

    preview.willUpdate.forEach(({ id, newRent }) => {
      const asset = assets.find((a) => a.id === id);
      if (!asset) return;

      const pricing = assetPricing[id] || {};
      
      // Update billing mode
      updates.push({ assetId: id, field: "billing_mode", value: selectedMode });

      // Recalculate rent with the new billing mode
      const negotiatedPrice = pricing.negotiated_price || asset.card_rate || 0;
      const startDate = pricing.start_date 
        ? parseDateOnly(pricing.start_date) 
        : planStartDate || new Date();
      const endDate = pricing.end_date 
        ? parseDateOnly(pricing.end_date) 
        : planEndDate || new Date();

      const rentResult = computeRentAmount(negotiatedPrice, startDate, endDate, selectedMode as BillingMode);
      updates.push({ assetId: id, field: "rent_amount", value: rentResult.rent_amount });
      updates.push({ assetId: id, field: "daily_rate", value: rentResult.daily_rate });
    });

    onBulkUpdate(updates);
    
    toast({
      title: "Billing Modes Updated",
      description: `Updated ${preview.willUpdate.length} asset(s)${preview.willSkip.length > 0 ? `, skipped ${preview.willSkip.length}` : ""}`,
    });

    // Reset and close
    setSelectedMode(planBillingMode);
    setApplyMode("selected");
    setOverrideExisting(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5" />
            Bulk Update Billing Mode
          </DialogTitle>
          <DialogDescription>
            Set billing mode for multiple assets. This affects how rent is calculated.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Billing Mode Selection */}
          <div className="space-y-2">
            <Label htmlFor="bulk-billing-mode">Billing Mode</Label>
            <Select
              value={selectedMode}
              onValueChange={(val) => setSelectedMode(val as BillingMode)}
            >
              <SelectTrigger id="bulk-billing-mode">
                <SelectValue placeholder="Select billing mode" />
              </SelectTrigger>
              <SelectContent>
                {BILLING_MODES.map((mode) => (
                  <SelectItem key={mode} value={mode}>
                    {formatBillingMode(mode)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              {selectedMode === "PRORATA_30" && "Pro-rata: (Monthly Rate ÷ 30) × Days"}
              {selectedMode === "FULL_MONTH" && "Full Month: Charged per complete 30-day cycle"}
              {selectedMode === "DAILY" && "Daily: Custom daily rate applied"}
            </p>
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
              <Label htmlFor="override-billing-toggle">Override existing values</Label>
              <p className="text-xs text-muted-foreground">
                Update assets that already have a billing mode set
              </p>
            </div>
            <Switch
              id="override-billing-toggle"
              checked={overrideExisting}
              onCheckedChange={setOverrideExisting}
            />
          </div>

          {/* Preview */}
          {selectedMode && (
            <div className="rounded-lg border p-3 space-y-2">
              <p className="text-sm font-medium">
                Preview: {preview.willUpdate.length} will update, {preview.willSkip.length} will skip
              </p>
              {preview.willUpdate.length > 0 && (
                <ScrollArea className="max-h-40">
                  <div className="text-xs space-y-1">
                    {preview.willUpdate.slice(0, 5).map((item) => (
                      <div key={item.id} className="flex justify-between text-muted-foreground gap-2">
                        <span className="truncate flex-shrink-0">{item.code}</span>
                        <span className="text-right">
                          {item.currentMode !== "Not set" && (
                            <span className="line-through mr-1">{formatBillingMode(item.currentMode as BillingMode)}</span>
                          )}
                          → {formatBillingMode(item.newMode as BillingMode)}
                          <span className="ml-2 text-foreground">
                            ({formatCurrency(item.newRent)})
                          </span>
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
          <Button onClick={handleApply} disabled={!selectedMode}>
            Apply to {preview.willUpdate.length} Asset(s)
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

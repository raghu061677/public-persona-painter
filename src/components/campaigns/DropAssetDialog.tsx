/**
 * DropAssetDialog — Non-destructive mid-campaign asset drop dialog.
 *
 * Allows dropping individual assets from a running campaign
 * without cancelling the whole campaign or hard-deleting records.
 */

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle, Calendar, DollarSign } from "lucide-react";
import { format } from "date-fns";
import { toast } from "@/hooks/use-toast";
import { formatCurrency } from "@/utils/mediaAssets";
import {
  dropCampaignAsset,
  calculateProratedAmount,
  calculateFullTermAmount,
} from "@/utils/campaignAssetDrop";

interface DropAssetDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  campaignAsset: {
    id: string;
    asset_id: string;
    location?: string;
    city?: string;
    media_type?: string;
    negotiated_rate?: number;
    card_rate?: number;
    effective_start_date?: string;
    effective_end_date?: string;
    booking_start_date?: string;
    booking_end_date?: string;
    start_date?: string;
    end_date?: string;
  } | null;
  onDropComplete?: () => void;
}

export function DropAssetDialog({
  open,
  onOpenChange,
  campaignAsset,
  onDropComplete,
}: DropAssetDialogProps) {
  const [dropDate, setDropDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [dropReason, setDropReason] = useState("");
  const [billingMode, setBillingMode] = useState<"prorated" | "full_term" | "manual_override">("prorated");
  const [overrideAmount, setOverrideAmount] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (!campaignAsset) return null;

  const monthlyRate = Number(campaignAsset.negotiated_rate) || Number(campaignAsset.card_rate) || 0;
  const effectiveStart = campaignAsset.effective_start_date || campaignAsset.booking_start_date || campaignAsset.start_date || "";
  const effectiveEnd = campaignAsset.effective_end_date || campaignAsset.booking_end_date || campaignAsset.end_date || "";

  const fullAmount = effectiveStart && effectiveEnd
    ? calculateFullTermAmount(monthlyRate, effectiveStart, effectiveEnd)
    : 0;
  const proratedAmount = effectiveStart && dropDate
    ? calculateProratedAmount(monthlyRate, effectiveStart, dropDate)
    : 0;

  const displayBillingAmount =
    billingMode === "full_term" ? fullAmount
    : billingMode === "manual_override" ? (Number(overrideAmount) || 0)
    : proratedAmount;

  const handleDrop = async () => {
    if (!dropDate) {
      toast({ title: "Drop date required", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    try {
      const result = await dropCampaignAsset({
        campaignAssetId: campaignAsset.id,
        dropDate,
        dropReason: dropReason || undefined,
        billingMode,
        billingOverrideAmount: billingMode === "manual_override" ? Number(overrideAmount) : undefined,
      });

      if (result.success) {
        toast({
          title: "Asset dropped successfully",
          description: `Billing adjusted to ${formatCurrency(displayBillingAmount)}`,
        });
        onOpenChange(false);
        onDropComplete?.();
      } else {
        toast({ title: "Drop failed", description: result.error, variant: "destructive" });
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            Drop Asset from Campaign
          </DialogTitle>
          <DialogDescription>
            This will mark the asset as dropped. It will remain in campaign history but become available for future bookings after the drop date.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Asset info */}
          <div className="rounded-md border p-3 bg-muted/40">
            <p className="text-sm font-medium">{campaignAsset.asset_id}</p>
            <p className="text-xs text-muted-foreground">
              {campaignAsset.location} • {campaignAsset.city} • {campaignAsset.media_type}
            </p>
            <div className="flex gap-4 mt-1 text-xs text-muted-foreground">
              <span>Rate: {formatCurrency(monthlyRate)}/mo</span>
              <span>Full term: {formatCurrency(fullAmount)}</span>
            </div>
          </div>

          {/* Drop date */}
          <div className="space-y-1.5">
            <Label htmlFor="dropDate" className="flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5" /> Drop Date
            </Label>
            <Input
              id="dropDate"
              type="date"
              value={dropDate}
              onChange={(e) => setDropDate(e.target.value)}
              min={effectiveStart}
              max={effectiveEnd}
            />
          </div>

          {/* Drop reason */}
          <div className="space-y-1.5">
            <Label htmlFor="dropReason">Reason (optional)</Label>
            <Textarea
              id="dropReason"
              placeholder="Client requested removal, location issue, etc."
              value={dropReason}
              onChange={(e) => setDropReason(e.target.value)}
              rows={2}
            />
          </div>

          {/* Billing mode */}
          <div className="space-y-2">
            <Label className="flex items-center gap-1.5">
              <DollarSign className="h-3.5 w-3.5" /> Billing Mode
            </Label>
            <RadioGroup value={billingMode} onValueChange={(v) => setBillingMode(v as any)}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="prorated" id="prorated" />
                <Label htmlFor="prorated" className="text-sm font-normal">
                  Prorated to drop date — {formatCurrency(proratedAmount)}
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="full_term" id="full_term" />
                <Label htmlFor="full_term" className="text-sm font-normal">
                  Full term billing — {formatCurrency(fullAmount)}
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="manual_override" id="manual_override" />
                <Label htmlFor="manual_override" className="text-sm font-normal">Manual override</Label>
              </div>
            </RadioGroup>

            {billingMode === "manual_override" && (
              <Input
                type="number"
                placeholder="Enter override amount"
                value={overrideAmount}
                onChange={(e) => setOverrideAmount(e.target.value)}
                className="mt-1"
              />
            )}
          </div>

          {/* Summary */}
          <Alert>
            <AlertDescription className="flex justify-between items-center">
              <span className="text-sm">Final billing for this asset:</span>
              <Badge variant="outline" className="text-base font-semibold">
                {formatCurrency(displayBillingAmount)}
              </Badge>
            </AlertDescription>
          </Alert>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={handleDrop} disabled={submitting}>
            {submitting ? "Dropping..." : "Confirm Drop"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/**
 * DropAssetDialog — Non-destructive mid-campaign asset removal dialog.
 *
 * Supports two distinct business cases:
 * 1. Client Drop — client requests removal, billing defaults to prorated
 * 2. Admin/Company Removal — operational reasons, billing defaults to waived
 *
 * Removal types: client_drop, admin_removed, damaged, maintenance,
 * authority_issue, site_removed, replacement, other
 */

import { useState, useEffect, useMemo } from "react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  getDefaultBillingModeForRemovalType,
  type RemovalType,
  type BillingMode,
} from "@/utils/campaignAssetDrop";

const REMOVAL_TYPE_OPTIONS: { value: RemovalType; label: string; group: 'client' | 'admin' }[] = [
  { value: 'client_drop', label: 'Client Drop', group: 'client' },
  { value: 'admin_removed', label: 'Admin Removed', group: 'admin' },
  { value: 'damaged', label: 'Damaged', group: 'admin' },
  { value: 'maintenance', label: 'Maintenance', group: 'admin' },
  { value: 'authority_issue', label: 'Authority Issue', group: 'admin' },
  { value: 'site_removed', label: 'Site Removed', group: 'admin' },
  { value: 'replacement', label: 'Replacement', group: 'admin' },
  { value: 'other', label: 'Other', group: 'admin' },
];

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
  const [removalType, setRemovalType] = useState<RemovalType>("client_drop");
  const [dropReason, setDropReason] = useState("");
  const [removalNotes, setRemovalNotes] = useState("");
  const [billingMode, setBillingMode] = useState<BillingMode>("prorated");
  const [overrideAmount, setOverrideAmount] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Reset billing mode when removal type changes
  useEffect(() => {
    setBillingMode(getDefaultBillingModeForRemovalType(removalType));
  }, [removalType]);

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      setDropDate(format(new Date(), "yyyy-MM-dd"));
      setRemovalType("client_drop");
      setDropReason("");
      setRemovalNotes("");
      setBillingMode("prorated");
      setOverrideAmount("");
    }
  }, [open]);

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
    : billingMode === "waived" ? 0
    : proratedAmount;

  const removalTypeInfo = REMOVAL_TYPE_OPTIONS.find(o => o.value === removalType);
  const isClientDrop = removalType === 'client_drop';

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
        removalType,
        removalNotes: removalNotes || undefined,
      });

      if (result.success) {
        toast({
          title: isClientDrop ? "Asset dropped by client" : "Asset removed",
          description: billingMode === 'waived'
            ? "Billing waived for this asset"
            : `Billing adjusted to ${formatCurrency(displayBillingAmount)}`,
        });
        onOpenChange(false);
        onDropComplete?.();
      } else {
        toast({ title: "Operation failed", description: result.error, variant: "destructive" });
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            {isClientDrop ? "Drop Asset (Client Request)" : "Remove Asset"}
          </DialogTitle>
          <DialogDescription>
            {isClientDrop
              ? "The client has requested removal of this asset. Billing will be prorated by default."
              : "Remove this asset for operational reasons. Billing will be waived by default."}
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

          {/* Removal type */}
          <div className="space-y-1.5">
            <Label>Removal Type</Label>
            <Select value={removalType} onValueChange={(v) => setRemovalType(v as RemovalType)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="client_drop">Client Drop</SelectItem>
                <SelectItem value="admin_removed">Admin Removed</SelectItem>
                <SelectItem value="damaged">Damaged</SelectItem>
                <SelectItem value="maintenance">Maintenance</SelectItem>
                <SelectItem value="authority_issue">Authority Issue</SelectItem>
                <SelectItem value="site_removed">Site Removed</SelectItem>
                <SelectItem value="replacement">Replacement</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Drop date */}
          <div className="space-y-1.5">
            <Label htmlFor="dropDate" className="flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5" /> Effective Removal Date
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

          {/* Reason */}
          <div className="space-y-1.5">
            <Label htmlFor="dropReason">Reason</Label>
            <Input
              id="dropReason"
              placeholder={isClientDrop ? "Client requested removal" : "Operational reason"}
              value={dropReason}
              onChange={(e) => setDropReason(e.target.value)}
            />
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <Label htmlFor="removalNotes">Additional Notes (optional)</Label>
            <Textarea
              id="removalNotes"
              placeholder="Any additional context..."
              value={removalNotes}
              onChange={(e) => setRemovalNotes(e.target.value)}
              rows={2}
            />
          </div>

          {/* Billing mode */}
          <div className="space-y-2">
            <Label className="flex items-center gap-1.5">
              <DollarSign className="h-3.5 w-3.5" /> Billing Mode
            </Label>
            <RadioGroup value={billingMode} onValueChange={(v) => setBillingMode(v as BillingMode)}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="prorated" id="prorated" />
                <Label htmlFor="prorated" className="text-sm font-normal">
                  Prorated to removal date — {formatCurrency(proratedAmount)}
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="waived" id="waived" />
                <Label htmlFor="waived" className="text-sm font-normal">
                  Waived — {formatCurrency(0)} (no charge for unused period)
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
              <div className="space-y-0.5">
                <span className="text-sm">Final billing for this asset:</span>
                <div className="flex gap-2">
                  <Badge variant="secondary" className="text-xs">
                    {removalTypeInfo?.label}
                  </Badge>
                  <Badge variant="outline" className="text-xs">
                    {billingMode === 'waived' ? 'Waived' : billingMode}
                  </Badge>
                </div>
              </div>
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
            {submitting ? "Processing..." : isClientDrop ? "Confirm Drop" : "Confirm Removal"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/**
 * ExtendCampaignDialog — Extend the SAME campaign by pushing the end date forward.
 *
 * Rules:
 *  - Same campaign ID, same history, same assets
 *  - No invoice generation (use Billing module)
 *  - No proof/status reset
 *  - Availability validation required before saving
 *  - Totals recalculated via computeCampaignTotals (SSoT)
 */

import { useState, useEffect } from "react";
import { format, addMonths, addDays, differenceInDays } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useFormValidation } from "@/hooks/useFormValidation";
import { campaignExtendSchema } from "@/lib/validation/schemas";
import { FieldError } from "@/components/ui/field-error";
import { toast } from "@/hooks/use-toast";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { CalendarIcon, CalendarPlus, Loader2, ShieldAlert, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { getAssetAvailabilityBatch, type AssetAvailabilitySummary } from "@/lib/availability";

interface ExtendCampaignDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  campaign: {
    id: string;
    campaign_name: string;
    client_name: string;
    client_id?: string;
    start_date: string;
    end_date: string;
    status: string;
    company_id?: string;
    grand_total?: number;
  };
  onSuccess: () => void;
}

type DurationOption = "15days" | "1month" | "2months" | "3months" | "custom";

interface ConflictInfo {
  assetId: string;
  assetCode: string;
  location: string;
  blockingEntity: string;
  blockedDates: string;
  nextAvailable: string | null;
}

export function ExtendCampaignDialog({
  open, onOpenChange, campaign, onSuccess,
}: ExtendCampaignDialogProps) {
  const [durationOption, setDurationOption] = useState<DurationOption>("1month");
  const [customEndDate, setCustomEndDate] = useState<Date | undefined>();
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);

  // Availability validation
  const [validating, setValidating] = useState(false);
  const [validated, setValidated] = useState(false);
  const [conflicts, setConflicts] = useState<ConflictInfo[]>([]);
  const [availableCount, setAvailableCount] = useState(0);
  const [totalAssetCount, setTotalAssetCount] = useState(0);

  const currentEndDate = new Date(campaign.end_date);

  const calculateNewEndDate = (): Date => {
    const baseDate = currentEndDate;
    switch (durationOption) {
      case "15days": return addDays(baseDate, 15);
      case "1month": return addMonths(baseDate, 1);
      case "2months": return addMonths(baseDate, 2);
      case "3months": return addMonths(baseDate, 3);
      case "custom": return customEndDate || addMonths(baseDate, 1);
      default: return addMonths(baseDate, 1);
    }
  };

  const newEndDate = calculateNewEndDate();
  const extensionDays = differenceInDays(newEndDate, currentEndDate);

  // Reset validation when dates change
  useEffect(() => {
    setValidated(false);
    setConflicts([]);
  }, [durationOption, customEndDate]);

  const handleValidateAvailability = async () => {
    setValidating(true);
    try {
      // Fetch campaign assets
      const { data: assets } = await supabase
        .from("campaign_assets")
        .select("asset_id, location, city, media_type")
        .eq("campaign_id", campaign.id)
        .eq("is_removed", false);

      if (!assets || assets.length === 0) {
        setTotalAssetCount(0);
        setAvailableCount(0);
        setConflicts([]);
        setValidated(true);
        return;
      }

      const assetIds = assets.map(a => a.asset_id);
      setTotalAssetCount(assetIds.length);

      // Check availability for extension period (day after current end → new end)
      const extensionStart = format(addDays(currentEndDate, 1), "yyyy-MM-dd");
      const extensionEnd = format(newEndDate, "yyyy-MM-dd");

      const availabilityMap = await getAssetAvailabilityBatch(
        assetIds, extensionStart, extensionEnd, campaign.id
      );

      const conflictList: ConflictInfo[] = [];
      let available = 0;

      for (const asset of assets) {
        const summary = availabilityMap.get(asset.asset_id);
        if (!summary || summary.is_available_for_range) {
          available++;
        } else {
          // Get the asset code
          const { data: mediaAsset } = await supabase
            .from("media_assets")
            .select("media_asset_code")
            .eq("id", asset.asset_id)
            .single();

          conflictList.push({
            assetId: asset.asset_id,
            assetCode: mediaAsset?.media_asset_code || asset.asset_id,
            location: asset.location || asset.city || "Unknown",
            blockingEntity: summary.blocking_entity_name || summary.client_name || "Another booking",
            blockedDates: `${summary.booking_start || "?"} → ${summary.booking_end || "?"}`,
            nextAvailable: summary.next_available_date,
          });
        }
      }

      setAvailableCount(available);
      setConflicts(conflictList);
      setValidated(true);
    } catch (err) {
      console.error("Availability validation error:", err);
      toast({ title: "Validation Error", description: "Failed to check availability", variant: "destructive" });
    } finally {
      setValidating(false);
    }
  };

  const handleSubmit = async () => {
    if (!validated) {
      toast({ title: "Validate First", description: "Please validate availability before extending.", variant: "destructive" });
      return;
    }

    if (conflicts.length > 0) {
      toast({ title: "Conflicts Exist", description: `${conflicts.length} asset(s) have booking conflicts. Resolve before extending.`, variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const newEndDateStr = format(newEndDate, "yyyy-MM-dd");

      // Update campaign end date
      const updateData: Record<string, any> = {
        end_date: newEndDateStr,
        updated_at: new Date().toISOString(),
      };
      // If campaign was Completed, set it back to Running
      if (campaign.status === "Completed") {
        updateData.status = "Running";
      }

      const { error: updateError } = await supabase
        .from("campaigns")
        .update(updateData)
        .eq("id", campaign.id);
      if (updateError) throw updateError;

      // Update asset_bookings end dates
      await supabase
        .from("asset_bookings")
        .update({ end_date: newEndDateStr, updated_at: new Date().toISOString() })
        .eq("campaign_id", campaign.id)
        .eq("status", "Confirmed");

      // Update campaign_assets booking end dates
      await supabase
        .from("campaign_assets")
        .update({ booking_end_date: newEndDateStr })
        .eq("campaign_id", campaign.id)
        .eq("is_removed", false);

      // Recalculate and update campaign totals
      const { data: campaignData } = await supabase
        .from("campaigns")
        .select("*, company_id, gst_percent")
        .eq("id", campaign.id)
        .single();

      const { data: campaignAssets } = await supabase
        .from("campaign_assets")
        .select("*")
        .eq("campaign_id", campaign.id)
        .eq("is_removed", false);

      if (campaignData && campaignAssets) {
        // Dynamically import to avoid circular deps
        const { computeCampaignTotals } = await import("@/utils/computeCampaignTotals");
        const totals = computeCampaignTotals({
          campaign: {
            start_date: campaignData.start_date,
            end_date: newEndDateStr,
            gst_percent: campaignData.gst_percent,
            billing_cycle: campaignData.billing_cycle,
            manual_discount_amount: campaignData.manual_discount_amount,
          },
          campaignAssets,
          manualDiscountAmount: campaignData.manual_discount_amount ?? undefined,
        });

        await supabase.from("campaigns").update({
          subtotal: Math.round(totals.displayCost * 100) / 100,
          printing_total: Math.round(totals.printingCost * 100) / 100,
          mounting_total: Math.round(totals.mountingCost * 100) / 100,
          total_amount: Math.round(totals.taxableAmount * 100) / 100,
          gst_amount: Math.round(totals.gstAmount * 100) / 100,
          grand_total: Math.round(totals.grandTotal * 100) / 100,
        }).eq("id", campaign.id);
      }

      // Log timeline event
      await supabase.from("campaign_timeline").insert({
        campaign_id: campaign.id,
        company_id: campaignData?.company_id,
        event_type: "campaign_extended",
        event_title: "Campaign Extended",
        event_description: `Extended from ${format(currentEndDate, "MMM dd, yyyy")} to ${format(newEndDate, "MMM dd, yyyy")}. +${extensionDays} days. ${notes || ""}`.trim(),
        created_by: user.id,
        metadata: {
          previous_end_date: campaign.end_date,
          new_end_date: newEndDateStr,
          extension_days: extensionDays,
        },
      });

      // Status history if status changed
      if (campaign.status === "Completed") {
        await supabase.from("campaign_status_history").insert({
          campaign_id: campaign.id,
          old_status: "Completed",
          new_status: "Running",
          notes: `Campaign extended until ${format(newEndDate, "MMM dd, yyyy")}`,
          changed_by: user.id,
        });
      }

      toast({
        title: "Campaign Extended",
        description: `${campaign.campaign_name} extended to ${format(newEndDate, "MMM dd, yyyy")} (+${extensionDays} days)`,
      });

      onSuccess();
      onOpenChange(false);
      resetForm();
    } catch (error: any) {
      console.error("Error extending campaign:", error);
      toast({ title: "Error", description: error.message || "Failed to extend campaign", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setDurationOption("1month");
    setCustomEndDate(undefined);
    setNotes("");
    setValidated(false);
    setConflicts([]);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) resetForm(); onOpenChange(v); }}>
      <DialogContent className="sm:max-w-[560px] max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarPlus className="h-5 w-5 text-primary" />
            Extend Current Campaign
          </DialogTitle>
          <DialogDescription>
            Push the end date of <span className="font-medium text-foreground">{campaign.campaign_name}</span>. Same campaign, same history, same assets.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh] pr-4">
          <div className="space-y-5 py-4">
            {/* Current Info */}
            <div className="rounded-lg bg-muted p-4 grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-muted-foreground">Current Period</p>
                <p className="font-semibold">{format(new Date(campaign.start_date), "MMM dd")} – {format(currentEndDate, "MMM dd, yyyy")}</p>
              </div>
              <div className="text-right">
                <p className="text-muted-foreground">Status</p>
                <p className="font-semibold">{campaign.status}</p>
              </div>
            </div>

            {/* Duration */}
            <div className="space-y-3">
              <Label>Extension Duration</Label>
              <RadioGroup value={durationOption} onValueChange={(v) => setDurationOption(v as DurationOption)} className="space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { value: "15days", label: "15 Days" },
                    { value: "1month", label: "1 Month" },
                    { value: "2months", label: "2 Months" },
                    { value: "3months", label: "3 Months" },
                  ].map((opt) => (
                    <div key={opt.value} className={cn("flex items-center space-x-2 rounded-lg border p-3 cursor-pointer transition-colors", durationOption === opt.value && "border-primary bg-primary/5")}>
                      <RadioGroupItem value={opt.value} id={`ext-${opt.value}`} />
                      <Label htmlFor={`ext-${opt.value}`} className="cursor-pointer flex-1">{opt.label}</Label>
                    </div>
                  ))}
                </div>
                <div className={cn("flex items-center gap-3 rounded-lg border p-3 cursor-pointer transition-colors", durationOption === "custom" && "border-primary bg-primary/5")} onClick={() => setDurationOption("custom")}>
                  <RadioGroupItem value="custom" id="ext-custom" />
                  <Label htmlFor="ext-custom" className="cursor-pointer">Custom End Date</Label>
                  {durationOption === "custom" && (
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" size="sm" className="ml-auto" onClick={(e) => e.stopPropagation()}>
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {customEndDate ? format(customEndDate, "MMM dd, yyyy") : "Pick date"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="end">
                        <Calendar mode="single" selected={customEndDate} onSelect={setCustomEndDate} disabled={(date) => date <= currentEndDate} initialFocus />
                      </PopoverContent>
                    </Popover>
                  )}
                </div>
              </RadioGroup>
            </div>

            {/* New End Date Preview */}
            <div className="rounded-lg border border-primary/30 bg-primary/5 p-4">
              <p className="text-sm font-medium text-primary">New End Date</p>
              <p className="text-2xl font-bold">{format(newEndDate, "MMMM dd, yyyy")}</p>
              <p className="text-sm text-muted-foreground">+{extensionDays} days from current end</p>
            </div>

            <Separator />

            {/* Availability Validation */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-base font-semibold">Availability Check</Label>
                <Button variant="outline" size="sm" onClick={handleValidateAvailability} disabled={validating}>
                  {validating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ShieldAlert className="mr-2 h-4 w-4" />}
                  {validating ? "Checking..." : "Validate Availability"}
                </Button>
              </div>

              {validated && (
                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    <Badge variant={conflicts.length === 0 ? "default" : "destructive"} className={conflicts.length === 0 ? "bg-green-100 text-green-800" : ""}>
                      {conflicts.length === 0 ? (
                        <><CheckCircle2 className="mr-1 h-3 w-3" /> All Clear</>
                      ) : (
                        <><ShieldAlert className="mr-1 h-3 w-3" /> {conflicts.length} Conflict(s)</>
                      )}
                    </Badge>
                    <span className="text-sm text-muted-foreground">{availableCount}/{totalAssetCount} assets available</span>
                  </div>

                  {conflicts.length > 0 && (
                    <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 space-y-2 max-h-[200px] overflow-y-auto">
                      {conflicts.map((c) => (
                        <div key={c.assetId} className="text-sm border-b border-destructive/10 pb-2 last:border-0">
                          <p className="font-medium">{c.assetCode} — {c.location}</p>
                          <p className="text-muted-foreground">Blocked by: {c.blockingEntity} ({c.blockedDates})</p>
                          {c.nextAvailable && <p className="text-xs text-muted-foreground">Next available: {c.nextAvailable}</p>}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label>Notes (Optional)</Label>
              <Textarea placeholder="Reason for extension..." value={notes} onChange={(e) => setNotes(e.target.value)} className="min-h-[60px]" />
            </div>

            {/* Info box: no side effects */}
            <div className="rounded-lg bg-muted/60 p-3 text-xs text-muted-foreground space-y-1">
              <p>✓ Proof photos and operations statuses are preserved</p>
              <p>✓ No invoices generated — use Billing & Invoices module</p>
              <p>✓ Campaign totals will be recalculated automatically</p>
            </div>
          </div>
        </ScrollArea>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={loading || !validated || conflicts.length > 0} className="min-w-[140px]">
            {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Extending...</> : <><CalendarPlus className="mr-2 h-4 w-4" />Extend Campaign</>}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

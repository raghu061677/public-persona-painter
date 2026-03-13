/**
 * RenewCampaignDialog — Create a NEW campaign based on an existing one.
 *
 * Replaces: DuplicateCampaignDialog + "Copy as New" in old ExtendCampaignDialog
 *
 * Rules:
 *  - New campaign ID (via generateCampaignId)
 *  - plan_id = null (fresh campaign)
 *  - Proof photos, ops statuses, mounter assignments reset
 *  - Availability validation required
 *  - Totals recalculated via computeCampaignTotals (SSoT)
 *  - No invoice generation (use Billing module)
 *  - Old campaign unchanged
 */

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { format, addMonths, addDays, differenceInDays } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { CalendarIcon, RefreshCw, Loader2, ShieldAlert, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { generateCampaignId } from "@/utils/campaigns";
import { getAssetAvailabilityBatch } from "@/lib/availability";

interface RenewCampaignDialogProps {
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

interface ConflictInfo {
  assetId: string;
  assetCode: string;
  location: string;
  blockingEntity: string;
  blockedDates: string;
  nextAvailable: string | null;
}

export function RenewCampaignDialog({
  open, onOpenChange, campaign, onSuccess,
}: RenewCampaignDialogProps) {
  const navigate = useNavigate();
  const currentEndDate = new Date(campaign.end_date);
  const defaultStart = addDays(currentEndDate, 1) > new Date() ? addDays(currentEndDate, 1) : new Date();

  const [startDate, setStartDate] = useState<Date>(defaultStart);
  const [endDate, setEndDate] = useState<Date>(addMonths(defaultStart, 1));
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);

  // Availability
  const [validating, setValidating] = useState(false);
  const [validated, setValidated] = useState(false);
  const [conflicts, setConflicts] = useState<ConflictInfo[]>([]);
  const [availableCount, setAvailableCount] = useState(0);
  const [totalAssetCount, setTotalAssetCount] = useState(0);

  const durationDays = Math.max(1, differenceInDays(endDate, startDate) + 1);

  // Reset validation on date change
  useEffect(() => {
    setValidated(false);
    setConflicts([]);
  }, [startDate, endDate]);

  // Reset defaults when dialog opens
  useEffect(() => {
    if (open) {
      const ds = addDays(new Date(campaign.end_date), 1) > new Date() ? addDays(new Date(campaign.end_date), 1) : new Date();
      setStartDate(ds);
      setEndDate(addMonths(ds, 1));
      setNotes("");
      setValidated(false);
      setConflicts([]);
    }
  }, [open, campaign.end_date]);

  const handleValidateAvailability = async () => {
    setValidating(true);
    try {
      const { data: assets } = await supabase
        .from("campaign_assets")
        .select("asset_id, location, city")
        .eq("campaign_id", campaign.id)
        .eq("is_removed", false);

      if (!assets || assets.length === 0) {
        setTotalAssetCount(0);
        setAvailableCount(0);
        setValidated(true);
        return;
      }

      const assetIds = assets.map(a => a.asset_id);
      setTotalAssetCount(assetIds.length);

      const rangeStart = format(startDate, "yyyy-MM-dd");
      const rangeEnd = format(endDate, "yyyy-MM-dd");

      // Don't exclude current campaign — this is a NEW campaign
      const availabilityMap = await getAssetAvailabilityBatch(assetIds, rangeStart, rangeEnd);

      const conflictList: ConflictInfo[] = [];
      let available = 0;

      for (const asset of assets) {
        const summary = availabilityMap.get(asset.asset_id);
        if (!summary || summary.is_available_for_range) {
          available++;
        } else {
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
      toast({ title: "Validate First", description: "Please validate availability before renewing.", variant: "destructive" });
      return;
    }
    if (conflicts.length > 0) {
      toast({ title: "Conflicts Exist", description: `${conflicts.length} asset(s) have booking conflicts.`, variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Fetch source campaign
      const { data: sourceCampaign, error: fetchError } = await supabase
        .from("campaigns").select("*").eq("id", campaign.id).single();
      if (fetchError || !sourceCampaign) throw new Error("Failed to fetch campaign details");

      // Fetch campaign assets
      const { data: campaignAssets } = await supabase
        .from("campaign_assets").select("*").eq("campaign_id", campaign.id).eq("is_removed", false);

      // Fetch campaign items
      const { data: campaignItems } = await supabase
        .from("campaign_items").select("*").eq("campaign_id", campaign.id);

      // Generate new campaign ID (consistent method)
      const newCampaignId = await generateCampaignId(supabase);
      const newStartStr = format(startDate, "yyyy-MM-dd");
      const newEndStr = format(endDate, "yyyy-MM-dd");

      // Determine campaign_group_id for renewal chain linking
      // If parent already has a group, reuse it; otherwise create a new one
      const groupId = sourceCampaign.campaign_group_id || crypto.randomUUID();

      // Create new campaign — plan_id = null, linked to parent via chain fields
      const gstPercent = sourceCampaign.gst_percent ?? 0;
      const { error: createError } = await supabase.from("campaigns").insert({
        id: newCampaignId,
        campaign_name: `${sourceCampaign.campaign_name} (Renewal)`,
        client_id: sourceCampaign.client_id,
        client_name: sourceCampaign.client_name,
        company_id: sourceCampaign.company_id,
        start_date: newStartStr,
        end_date: newEndStr,
        status: "Draft" as const,
        created_by: user.id,
        created_from: `renewal:${campaign.id}`,
        parent_campaign_id: campaign.id,       // Immediate parent link
        campaign_group_id: groupId,            // Shared group across all renewals
        plan_id: null, // CRITICAL: do not copy plan_id
        total_assets: campaignAssets?.length || 0,
        billing_cycle: sourceCampaign.billing_cycle,
        gst_percent: gstPercent,
        gst_amount: 0,
        grand_total: 0,
        total_amount: 0,
        notes: `Renewed from ${campaign.id}. ${notes || ""}`.trim(),
      } as any);
      if (createError) throw createError;

      // Backfill campaign_group_id on the parent if it didn't have one
      if (!sourceCampaign.campaign_group_id) {
        await supabase.from("campaigns")
          .update({ campaign_group_id: groupId } as any)
          .eq("id", campaign.id);
      }

      // Copy campaign assets with full reset
      if (campaignAssets && campaignAssets.length > 0) {
        const seenAssetIds = new Set<string>();
        const newAssets = campaignAssets
          .filter(a => { if (seenAssetIds.has(a.asset_id)) return false; seenAssetIds.add(a.asset_id); return true; })
          .map(asset => {
            const { id, created_at, photos, assigned_mounter_id, mounter_name, assigned_at, completed_at, ...rest } = asset;
            return {
              ...rest,
              campaign_id: newCampaignId,
              booking_start_date: newStartStr,
              booking_end_date: newEndStr,
              effective_start_date: newStartStr,
              effective_end_date: newEndStr,
              status: "Pending" as const,
              installation_status: "Pending",
              photos: null,
              assigned_mounter_id: null,
              mounter_name: null,
              assigned_at: null,
              completed_at: null,
              is_removed: false,
              created_at: new Date().toISOString(),
            };
          });

        await supabase.from("campaign_assets").insert(newAssets);
      }

      // Copy campaign items
      if (campaignItems && campaignItems.length > 0) {
        const newItems = campaignItems.map(item => {
          const { id, created_at, updated_at, ...rest } = item;
          return { ...rest, campaign_id: newCampaignId, start_date: newStartStr, end_date: newEndStr, created_at: new Date().toISOString(), updated_at: new Date().toISOString() };
        });
        await supabase.from("campaign_items").insert(newItems);
      }

      // Create asset bookings
      if (campaignAssets && campaignAssets.length > 0) {
        const seenIds = new Set<string>();
        const bookings = campaignAssets
          .filter(a => { if (seenIds.has(a.asset_id)) return false; seenIds.add(a.asset_id); return true; })
          .map(a => ({
            asset_id: a.asset_id,
            campaign_id: newCampaignId,
            start_date: newStartStr,
            end_date: newEndStr,
            booking_type: "Campaign",
            status: "Confirmed",
            created_by: user.id,
          }));
        await supabase.from("asset_bookings").insert(bookings);
      }

      // Recalculate totals via SSoT engine
      const { data: newAssets } = await supabase
        .from("campaign_assets").select("*").eq("campaign_id", newCampaignId);

      if (newAssets && newAssets.length > 0) {
        const { computeCampaignTotals } = await import("@/utils/computeCampaignTotals");
        const totals = computeCampaignTotals({
          campaign: { start_date: newStartStr, end_date: newEndStr, gst_percent: sourceCampaign.gst_percent, billing_cycle: sourceCampaign.billing_cycle },
          campaignAssets: newAssets,
        });

        await supabase.from("campaigns").update({
          subtotal: Math.round(totals.displayCost * 100) / 100,
          printing_total: Math.round(totals.printingCost * 100) / 100,
          mounting_total: Math.round(totals.mountingCost * 100) / 100,
          total_amount: Math.round(totals.taxableAmount * 100) / 100,
          gst_amount: Math.round(totals.gstAmount * 100) / 100,
          grand_total: Math.round(totals.grandTotal * 100) / 100,
        }).eq("id", newCampaignId);
      }

      // Log timeline for new campaign
      await supabase.from("campaign_timeline").insert({
        campaign_id: newCampaignId,
        company_id: sourceCampaign.company_id,
        event_type: "campaign_created",
        event_title: "Renewal Campaign Created",
        event_description: `New campaign created as renewal of ${campaign.id}`,
        created_by: user.id,
        metadata: { original_campaign_id: campaign.id, original_campaign_name: campaign.campaign_name },
      });

      toast({
        title: "Renewal Campaign Created",
        description: `${newCampaignId} created as Draft for ${format(startDate, "MMM dd")} – ${format(endDate, "MMM dd, yyyy")}`,
      });

      onOpenChange(false);
      onSuccess();
      navigate(`/admin/campaigns/${newCampaignId}`);
    } catch (error: any) {
      console.error("Error renewing campaign:", error);
      toast({ title: "Error", description: error.message || "Failed to create renewal campaign", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[560px] max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <RefreshCw className="h-5 w-5 text-primary" />
            Renew as New Campaign
          </DialogTitle>
          <DialogDescription>
            Create a <strong>new campaign</strong> based on <span className="font-medium text-foreground">{campaign.campaign_name}</span>. The original campaign remains unchanged.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh] pr-4">
          <div className="space-y-5 py-4">
            {/* Source Info */}
            <div className="rounded-lg bg-muted p-4 text-sm space-y-1">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Source Campaign</span>
                <span className="font-medium">{campaign.id}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Client</span>
                <span className="font-medium">{campaign.client_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Original Budget</span>
                <span className="font-medium">₹{(campaign.grand_total || 0).toLocaleString("en-IN")}</span>
              </div>
            </div>

            {/* Date Pickers */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>New Start Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start text-left font-normal">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {format(startDate, "MMM dd, yyyy")}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar mode="single" selected={startDate} onSelect={(d) => { if (d) { setStartDate(d); if (endDate <= d) setEndDate(addMonths(d, 1)); } }} initialFocus className="p-3 pointer-events-auto" />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="space-y-2">
                <Label>New End Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start text-left font-normal">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {format(endDate, "MMM dd, yyyy")}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar mode="single" selected={endDate} onSelect={(d) => { if (d) setEndDate(d); }} disabled={(d) => d <= startDate} initialFocus className="p-3 pointer-events-auto" />
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            <div className="rounded-lg border border-primary/30 bg-primary/5 p-3 text-sm">
              <span className="text-primary font-medium">Duration: </span>
              <span className="font-bold">{durationDays} days</span>
              <span className="text-muted-foreground ml-2">• Status: Draft • New campaign ID</span>
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
                      {conflicts.length === 0 ? <><CheckCircle2 className="mr-1 h-3 w-3" /> All Clear</> : <><ShieldAlert className="mr-1 h-3 w-3" /> {conflicts.length} Conflict(s)</>}
                    </Badge>
                    <span className="text-sm text-muted-foreground">{availableCount}/{totalAssetCount} assets available</span>
                  </div>
                  {conflicts.length > 0 && (
                    <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 space-y-2 max-h-[180px] overflow-y-auto">
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
              <Textarea placeholder="Reason for renewal..." value={notes} onChange={(e) => setNotes(e.target.value)} className="min-h-[60px]" />
            </div>

            {/* Reset info */}
            <div className="rounded-lg bg-muted/60 p-3 text-xs text-muted-foreground space-y-1">
              <p className="font-medium text-foreground text-sm mb-1">What's reset in the new campaign:</p>
              <p>✓ Proof photos — cleared</p>
              <p>✓ Operations status — reset to Pending</p>
              <p>✓ Mounter assignments — cleared</p>
              <p>✓ plan_id — not copied</p>
              <p>✓ Totals — recalculated for new dates</p>
              <p>✓ No invoices generated — use Billing module</p>
            </div>
          </div>
        </ScrollArea>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={loading || !validated || conflicts.length > 0} className="min-w-[160px]">
            {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Creating...</> : <><RefreshCw className="mr-2 h-4 w-4" />Create New Campaign</>}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { format, addMonths } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Copy, Loader2, CalendarIcon } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

interface DuplicateCampaignDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  campaign: {
    id: string;
    campaign_name: string;
    client_name: string;
    client_id?: string;
    company_id?: string;
  };
  onSuccess?: () => void;
}

export function DuplicateCampaignDialog({
  open,
  onOpenChange,
  campaign,
  onSuccess,
}: DuplicateCampaignDialogProps) {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [startDate, setStartDate] = useState<Date | undefined>(new Date());
  const [endDate, setEndDate] = useState<Date | undefined>(addMonths(new Date(), 1));

  const handleDuplicate = async () => {
    if (!startDate || !endDate) {
      toast({
        title: "Missing Dates",
        description: "Please select both start and end dates",
        variant: "destructive",
      });
      return;
    }

    if (endDate <= startDate) {
      toast({
        title: "Invalid Dates",
        description: "End date must be after start date",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Fetch source campaign
      const { data: sourceCampaign, error: fetchError } = await supabase
        .from("campaigns")
        .select("*")
        .eq("id", campaign.id)
        .single();

      if (fetchError || !sourceCampaign) {
        throw new Error("Failed to fetch campaign details");
      }

      // Fetch campaign assets
      const { data: campaignAssets } = await supabase
        .from("campaign_assets")
        .select("*")
        .eq("campaign_id", campaign.id);

      // Fetch campaign items
      const { data: campaignItems } = await supabase
        .from("campaign_items")
        .select("*")
        .eq("campaign_id", campaign.id);

      // Generate a UUID for the new campaign primary key
      const newCampaignId = crypto.randomUUID();
      const newStartDateStr = format(startDate, "yyyy-MM-dd");
      const newEndDateStr = format(endDate, "yyyy-MM-dd");

      // Generate a human-readable campaign code via atomic counter
      let campaignCode: string | null = null;
      try {
        const { data: codeData } = await supabase.rpc("generate_campaign_code", {
          p_company_id: sourceCampaign.company_id,
          p_start_date: newStartDateStr,
        });
        if (codeData) campaignCode = codeData;
      } catch (e) {
        console.warn("Failed to generate campaign code, will proceed without", e);
      }

      // Create new campaign - copy financial data as-is
      const { error: createError } = await supabase.from("campaigns").insert({
        id: newCampaignId,
        campaign_code: campaignCode,
        campaign_name: `${sourceCampaign.campaign_name} (Copy)`,
        client_id: sourceCampaign.client_id,
        client_name: sourceCampaign.client_name,
        company_id: sourceCampaign.company_id,
        start_date: newStartDateStr,
        end_date: newEndDateStr,
        status: "Draft",
        created_by: user.id,
        created_from: `duplicate:${campaign.id}`,
        plan_id: sourceCampaign.plan_id,
        // Copy financial snapshot
        subtotal: sourceCampaign.subtotal,
        printing_total: sourceCampaign.printing_total,
        mounting_total: sourceCampaign.mounting_total,
        total_amount: sourceCampaign.total_amount,
        gst_percent: sourceCampaign.gst_percent,
        gst_amount: sourceCampaign.gst_amount,
        grand_total: sourceCampaign.grand_total,
        total_assets: sourceCampaign.total_assets,
        billing_cycle: sourceCampaign.billing_cycle,
        notes: `Duplicated from ${campaign.id}`,
      });

      if (createError) throw createError;

      // Copy campaign assets with reset status (no photos, no mounter assignments)
      // Guard: deduplicate by asset_id to prevent duplicate rows
      if (campaignAssets && campaignAssets.length > 0) {
        const seenAssetIds = new Set<string>();
        const uniqueAssets = campaignAssets.filter(asset => {
          if (seenAssetIds.has(asset.asset_id)) return false;
          seenAssetIds.add(asset.asset_id);
          return true;
        });

        const newAssets = uniqueAssets.map(asset => {
          const { 
            id, 
            created_at, 
            photos, 
            assigned_mounter_id, 
            mounter_name, 
            assigned_at, 
            completed_at, 
            ...rest 
          } = asset;
          return {
            ...rest,
            campaign_id: newCampaignId,
            booking_start_date: newStartDateStr,
            booking_end_date: newEndDateStr,
            status: "Pending" as const,
            installation_status: "Pending",
            photos: null,
            assigned_mounter_id: null,
            mounter_name: null,
            assigned_at: null,
            completed_at: null,
            created_at: new Date().toISOString(),
          };
        });

        const { error: assetsError } = await supabase
          .from("campaign_assets")
          .insert(newAssets);
        
        if (assetsError) {
          console.error("Error copying campaign assets:", assetsError);
        }
      }

      // Copy campaign items with new dates
      if (campaignItems && campaignItems.length > 0) {
        const newItems = campaignItems.map(item => {
          const { id, created_at, updated_at, ...rest } = item;
          return {
            ...rest,
            campaign_id: newCampaignId,
            start_date: newStartDateStr,
            end_date: newEndDateStr,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          };
        });

        const { error: itemsError } = await supabase
          .from("campaign_items")
          .insert(newItems);
        
        if (itemsError) {
          console.error("Error copying campaign items:", itemsError);
        }
      }

      // Log timeline event
      await supabase.from("campaign_timeline").insert({
        campaign_id: newCampaignId,
        company_id: sourceCampaign.company_id,
        event_type: "campaign_created",
        event_title: "Campaign Duplicated",
        event_description: `New campaign created as duplicate of ${campaign.id}`,
        created_by: user.id,
        metadata: {
          source_campaign_id: campaign.id,
          source_campaign_name: campaign.campaign_name,
          duplicate_type: "copy",
        },
      });

      const displayId = campaignCode || newCampaignId;

      toast({
        title: "Campaign Duplicated",
        description: `Created ${displayId} as a copy of ${campaign.campaign_name}`,
      });

      onOpenChange(false);
      onSuccess?.();

      // Navigate to the new campaign
      navigate(`/admin/campaigns/${newCampaignId}`);
    } catch (error: any) {
      console.error("Error duplicating campaign:", error);
      toast({
        title: "Duplication Failed",
        description: error.message || "Failed to duplicate campaign",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Copy className="h-5 w-5 text-primary" />
            Duplicate Campaign
          </DialogTitle>
          <DialogDescription asChild>
            <div className="space-y-3">
              <p>
                Create a copy of <strong>{campaign.campaign_name}</strong> with the same assets and rates.
              </p>
              <div className="bg-muted p-3 rounded-md text-sm space-y-1">
                <p><strong>What will be copied:</strong></p>
                <ul className="list-disc list-inside text-muted-foreground">
                  <li>Client: {campaign.client_name}</li>
                  <li>All campaign assets</li>
                  <li>Asset pricing and configuration</li>
                </ul>
              </div>
              <div className="bg-amber-50 dark:bg-amber-950/30 p-3 rounded-md text-sm">
                <p className="text-amber-800 dark:text-amber-200">
                  <strong>Not copied:</strong> Proof photos, mounter assignments, and operations status.
                </p>
              </div>
            </div>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>New Campaign Start Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !startDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {startDate ? format(startDate, "PPP") : "Select start date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={startDate}
                  onSelect={setStartDate}
                  initialFocus
                  className="p-3 pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="space-y-2">
            <Label>New Campaign End Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !endDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {endDate ? format(endDate, "PPP") : "Select end date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={endDate}
                  onSelect={setEndDate}
                  disabled={(date) => startDate ? date <= startDate : false}
                  initialFocus
                  className="p-3 pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleDuplicate} disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Duplicating...
              </>
            ) : (
              <>
                <Copy className="mr-2 h-4 w-4" />
                Duplicate Campaign
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

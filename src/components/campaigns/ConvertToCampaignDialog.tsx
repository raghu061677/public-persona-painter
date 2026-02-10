import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, Upload, Rocket } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { generateCampaignCode } from "@/lib/codeGenerator";
import { useCompany } from "@/contexts/CompanyContext";

interface ConvertToCampaignDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  plan: any;
  planItems: any[];
}

export function ConvertToCampaignDialog({
  open,
  onOpenChange,
  plan,
  planItems,
}: ConvertToCampaignDialogProps) {
  const navigate = useNavigate();
  const { company } = useCompany();
  const [loading, setLoading] = useState(false);
  const [campaignName, setCampaignName] = useState(plan?.plan_name || "");
  const [startDate, setStartDate] = useState<Date>(
    plan?.start_date ? new Date(plan.start_date) : new Date()
  );
  const [endDate, setEndDate] = useState<Date>(
    plan?.end_date ? new Date(plan.end_date) : new Date()
  );
  const [notes, setNotes] = useState("");
  const [creativeFiles, setCreativeFiles] = useState<File[]>([]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setCreativeFiles(Array.from(e.target.files));
    }
  };

  const handleConvert = async () => {
    if (!campaignName || !startDate || !endDate) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      // Validate company context
      if (!company?.id) {
        throw new Error("Company context is required");
      }

      // Guard: Check if a campaign already exists for this plan
      const { data: existingCampaign } = await supabase
        .from("campaigns")
        .select("id, campaign_name")
        .eq("plan_id", plan.id)
        .or("is_deleted.is.null,is_deleted.eq.false")
        .limit(1)
        .maybeSingle();

      if (existingCampaign) {
        toast({
          title: "Campaign Already Exists",
          description: `Campaign "${existingCampaign.campaign_name}" (${existingCampaign.id}) already exists for this plan.`,
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      // Generate campaign ID
      const campaignId = await generateCampaignCode(startDate);

      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Authentication required");

      // Create campaign with company_id
      const { data: campaign, error: campaignError } = await supabase
        .from("campaigns")
        .insert({
          id: campaignId,
          company_id: company.id,
          campaign_name: campaignName,
          client_id: plan.client_id,
          client_name: plan.client_name,
          plan_id: plan.id,
          start_date: format(startDate, "yyyy-MM-dd"),
          end_date: format(endDate, "yyyy-MM-dd"),
          status: "Planned",
          total_amount: plan.sub_total || 0,
          gst_amount: plan.gst_amount || 0,
          gst_percent: plan.gst_percent || 18,
          grand_total: plan.grand_total || 0,
          total_assets: planItems.length,
          notes,
          created_by: user.id,
        })
        .select()
        .single();

      if (campaignError) throw campaignError;

      // Create campaign assets from plan items
      const campaignAssets = planItems.map((item) => ({
        campaign_id: campaignId,
        asset_id: item.asset_id,
        location: item.location,
        area: item.area,
        city: item.city,
        media_type: item.media_type,
        card_rate: item.card_rate || 0,
        printing_charges: item.printing_charges || 0,
        mounting_charges: item.mounting_charges || 0,
        status: "Pending" as const,
        latitude: item.latitude,
        longitude: item.longitude,
      }));

      const { error: assetsError } = await supabase
        .from("campaign_assets")
        .insert(campaignAssets);

      if (assetsError) throw assetsError;

      // Upload creative files if any
      if (creativeFiles.length > 0) {
        for (const file of creativeFiles) {
          const fileExt = file.name.split(".").pop();
          const fileName = `${campaignId}/${Date.now()}.${fileExt}`;
          const filePath = `${fileName}`;

          const { error: uploadError } = await supabase.storage
            .from("campaign-creatives")
            .upload(filePath, file);

          if (uploadError) throw uploadError;

          const { data: { publicUrl } } = supabase.storage
            .from("campaign-creatives")
            .getPublicUrl(filePath);

          // Save creative reference
          await supabase.from("campaign_creatives").insert({
            campaign_id: campaignId,
            file_name: file.name,
            file_url: publicUrl,
            file_type: file.type,
            file_size: file.size,
            status: "approved",
          });
        }
      }

      // Update plan status
      await supabase
        .from("plans")
        .update({ status: "Converted" })
        .eq("id", plan.id);

      // Log activity
      await supabase.from("activity_logs").insert({
        user_id: (await supabase.auth.getUser()).data.user?.id,
        action: "convert_to_campaign",
        resource_type: "campaign",
        resource_id: campaignId,
        resource_name: campaignName,
        details: {
          plan_id: plan.id,
          assets_count: planItems.length,
          creative_files: creativeFiles.length,
        },
      });

      toast({
        title: "Success",
        description: `Campaign ${campaignId} created successfully`,
      });

      onOpenChange(false);
      navigate(`/admin/campaigns/${campaignId}`);
    } catch (error: any) {
      console.error("Error converting to campaign:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to create campaign",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Rocket className="h-5 w-5" />
            Convert Plan to Campaign
          </DialogTitle>
          <DialogDescription>
            Create a campaign from {plan?.plan_name} with {planItems?.length || 0} assets
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label htmlFor="campaign-name">Campaign Name *</Label>
            <Input
              id="campaign-name"
              value={campaignName}
              onChange={(e) => setCampaignName(e.target.value)}
              placeholder="Enter campaign name"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Start Date *</Label>
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
                    {startDate ? format(startDate, "PPP") : "Pick a date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={startDate}
                    onSelect={(date) => date && setStartDate(date)}
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div>
              <Label>End Date *</Label>
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
                    {endDate ? format(endDate, "PPP") : "Pick a date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={endDate}
                    onSelect={(date) => date && setEndDate(date)}
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          <div>
            <Label htmlFor="creative-files">
              <Upload className="inline h-4 w-4 mr-2" />
              Upload Creative Files (Optional)
            </Label>
            <Input
              id="creative-files"
              type="file"
              multiple
              accept="image/*,.pdf"
              onChange={handleFileSelect}
              className="mt-1"
            />
            {creativeFiles.length > 0 && (
              <p className="text-sm text-muted-foreground mt-1">
                {creativeFiles.length} file(s) selected
              </p>
            )}
          </div>

          <div>
            <Label htmlFor="notes">Notes (Optional)</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add campaign notes or instructions"
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleConvert} disabled={loading}>
            {loading ? "Creating..." : "Create Campaign"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

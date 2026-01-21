import { useState } from "react";
import { format, addMonths, addDays, differenceInDays } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
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
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, RefreshCw, CalendarPlus } from "lucide-react";
import { cn } from "@/lib/utils";

interface ExtendCampaignDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  campaign: {
    id: string;
    campaign_name: string;
    client_name: string;
    start_date: string;
    end_date: string;
    status: string;
  };
  onSuccess: () => void;
}

type ExtensionType = "extend" | "renew";
type DurationOption = "15days" | "1month" | "2months" | "3months" | "custom";

export function ExtendCampaignDialog({
  open,
  onOpenChange,
  campaign,
  onSuccess,
}: ExtendCampaignDialogProps) {
  const [extensionType, setExtensionType] = useState<ExtensionType>("extend");
  const [durationOption, setDurationOption] = useState<DurationOption>("1month");
  const [customEndDate, setCustomEndDate] = useState<Date | undefined>();
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);

  const currentEndDate = new Date(campaign.end_date);

  const calculateNewEndDate = (): Date => {
    const baseDate = extensionType === "extend" ? currentEndDate : new Date();
    
    switch (durationOption) {
      case "15days":
        return addDays(baseDate, 15);
      case "1month":
        return addMonths(baseDate, 1);
      case "2months":
        return addMonths(baseDate, 2);
      case "3months":
        return addMonths(baseDate, 3);
      case "custom":
        return customEndDate || addMonths(baseDate, 1);
      default:
        return addMonths(baseDate, 1);
    }
  };

  const newEndDate = calculateNewEndDate();
  const extensionDays = differenceInDays(newEndDate, currentEndDate);

  const handleSubmit = async () => {
    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const newEndDateStr = format(newEndDate, "yyyy-MM-dd");

      // Update the campaign end date
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

      // Log the extension in campaign timeline
      await supabase.from("campaign_timeline").insert({
        campaign_id: campaign.id,
        company_id: (await supabase.from("campaigns").select("company_id").eq("id", campaign.id).single()).data?.company_id,
        event_type: extensionType === "extend" ? "campaign_extended" : "campaign_renewed",
        event_title: extensionType === "extend" ? "Campaign Extended" : "Campaign Renewed",
        event_description: `Campaign ${extensionType === "extend" ? "extended" : "renewed"} from ${format(currentEndDate, "MMM dd, yyyy")} to ${format(newEndDate, "MMM dd, yyyy")}. ${notes || ""}`.trim(),
        created_by: user.id,
        metadata: {
          previous_end_date: campaign.end_date,
          new_end_date: newEndDateStr,
          extension_days: extensionDays,
          extension_type: extensionType,
          notes: notes,
        },
      });

      // If status was changed, log in status history
      if (campaign.status === "Completed") {
        await supabase.from("campaign_status_history").insert({
          campaign_id: campaign.id,
          old_status: "Completed",
          new_status: "Running",
          notes: `Campaign ${extensionType === "extend" ? "extended" : "renewed"} until ${format(newEndDate, "MMM dd, yyyy")}`,
          changed_by: user.id,
        });
      }

      // Update asset bookings end dates
      await supabase
        .from("asset_bookings")
        .update({ end_date: newEndDateStr, updated_at: new Date().toISOString() })
        .eq("campaign_id", campaign.id)
        .eq("status", "Confirmed");

      // Update campaign_assets booking end dates
      await supabase
        .from("campaign_assets")
        .update({ booking_end_date: newEndDateStr })
        .eq("campaign_id", campaign.id);

      toast({
        title: extensionType === "extend" ? "Campaign Extended" : "Campaign Renewed",
        description: `${campaign.campaign_name} is now active until ${format(newEndDate, "MMM dd, yyyy")}`,
      });

      onSuccess();
      onOpenChange(false);
      
      // Reset form
      setExtensionType("extend");
      setDurationOption("1month");
      setCustomEndDate(undefined);
      setNotes("");
    } catch (error: any) {
      console.error("Error extending campaign:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to extend campaign",
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
            <RefreshCw className="h-5 w-5 text-primary" />
            Extend / Renew Campaign
          </DialogTitle>
          <DialogDescription>
            Extend or renew <span className="font-medium text-foreground">{campaign.campaign_name}</span> for {campaign.client_name}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Current End Date */}
          <div className="rounded-lg bg-muted p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Current End Date</p>
                <p className="font-semibold">{format(currentEndDate, "MMMM dd, yyyy")}</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-muted-foreground">Status</p>
                <p className="font-semibold">{campaign.status}</p>
              </div>
            </div>
          </div>

          {/* Extension Type */}
          <div className="space-y-3">
            <Label>Extension Type</Label>
            <RadioGroup
              value={extensionType}
              onValueChange={(v) => setExtensionType(v as ExtensionType)}
              className="grid grid-cols-2 gap-4"
            >
              <div className={cn(
                "flex items-center space-x-3 rounded-lg border p-4 cursor-pointer transition-colors",
                extensionType === "extend" && "border-primary bg-primary/5"
              )}>
                <RadioGroupItem value="extend" id="extend" />
                <div className="flex-1">
                  <Label htmlFor="extend" className="cursor-pointer font-medium">
                    Extend
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Add time from current end date
                  </p>
                </div>
              </div>
              <div className={cn(
                "flex items-center space-x-3 rounded-lg border p-4 cursor-pointer transition-colors",
                extensionType === "renew" && "border-primary bg-primary/5"
              )}>
                <RadioGroupItem value="renew" id="renew" />
                <div className="flex-1">
                  <Label htmlFor="renew" className="cursor-pointer font-medium">
                    Renew
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Add time from today
                  </p>
                </div>
              </div>
            </RadioGroup>
          </div>

          {/* Duration Options */}
          <div className="space-y-3">
            <Label>Duration</Label>
            <RadioGroup
              value={durationOption}
              onValueChange={(v) => setDurationOption(v as DurationOption)}
              className="grid grid-cols-2 gap-2"
            >
              {[
                { value: "15days", label: "15 Days" },
                { value: "1month", label: "1 Month" },
                { value: "2months", label: "2 Months" },
                { value: "3months", label: "3 Months" },
              ].map((option) => (
                <div
                  key={option.value}
                  className={cn(
                    "flex items-center space-x-2 rounded-lg border p-3 cursor-pointer transition-colors",
                    durationOption === option.value && "border-primary bg-primary/5"
                  )}
                >
                  <RadioGroupItem value={option.value} id={option.value} />
                  <Label htmlFor={option.value} className="cursor-pointer flex-1">
                    {option.label}
                  </Label>
                </div>
              ))}
            </RadioGroup>
            
            {/* Custom Date Option */}
            <div
              className={cn(
                "flex items-center gap-3 rounded-lg border p-3 cursor-pointer transition-colors",
                durationOption === "custom" && "border-primary bg-primary/5"
              )}
              onClick={() => setDurationOption("custom")}
            >
              <RadioGroupItem value="custom" id="custom" checked={durationOption === "custom"} />
              <Label htmlFor="custom" className="cursor-pointer">Custom Date</Label>
              {durationOption === "custom" && (
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className="ml-auto"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {customEndDate ? format(customEndDate, "MMM dd, yyyy") : "Pick date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="end">
                    <Calendar
                      mode="single"
                      selected={customEndDate}
                      onSelect={setCustomEndDate}
                      disabled={(date) => date <= currentEndDate}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              )}
            </div>
          </div>

          {/* New End Date Preview */}
          <div className="rounded-lg bg-primary/10 border border-primary/20 p-4">
            <div className="flex items-center gap-3">
              <CalendarPlus className="h-5 w-5 text-primary" />
              <div>
                <p className="text-sm text-muted-foreground">New End Date</p>
                <p className="text-lg font-semibold text-primary">
                  {format(newEndDate, "MMMM dd, yyyy")}
                </p>
                <p className="text-xs text-muted-foreground">
                  +{extensionDays} days from current end date
                </p>
              </div>
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notes (optional)</Label>
            <Textarea
              id="notes"
              placeholder="Reason for extension, client request details..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? (
              <>
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <RefreshCw className="mr-2 h-4 w-4" />
                {extensionType === "extend" ? "Extend Campaign" : "Renew Campaign"}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

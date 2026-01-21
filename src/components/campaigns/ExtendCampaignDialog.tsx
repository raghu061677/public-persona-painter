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
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { CalendarIcon, RefreshCw, CalendarPlus, FileText, Camera, IndianRupee } from "lucide-react";
import { cn } from "@/lib/utils";
import { generateInvoiceId } from "@/utils/finance";

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
    gst_amount?: number;
    gst_percent?: number;
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
  
  // New options for renewal workflow
  const [generateInvoice, setGenerateInvoice] = useState(true);
  const [resetProofPhotos, setResetProofPhotos] = useState(true);
  const [carryForwardCreatives, setCarryForwardCreatives] = useState(true);

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
  
  // Calculate renewal amount estimate based on daily rate
  const calculateRenewalAmount = () => {
    if (!campaign.grand_total) return 0;
    const originalDays = differenceInDays(new Date(campaign.end_date), new Date(campaign.start_date));
    if (originalDays <= 0) return campaign.grand_total;
    const dailyRate = campaign.grand_total / originalDays;
    return Math.round(dailyRate * extensionDays);
  };

  const renewalAmount = calculateRenewalAmount();

  const handleSubmit = async () => {
    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const newEndDateStr = format(newEndDate, "yyyy-MM-dd");
      const extensionStartDate = format(addDays(currentEndDate, 1), "yyyy-MM-dd");

      // Get full campaign data for invoice generation
      const { data: campaignData } = await supabase
        .from("campaigns")
        .select("*, company_id, client_id, gst_percent")
        .eq("id", campaign.id)
        .single();

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
        company_id: campaignData?.company_id,
        event_type: extensionType === "extend" ? "campaign_extended" : "campaign_renewed",
        event_title: extensionType === "extend" ? "Campaign Extended" : "Campaign Renewed",
        event_description: `Campaign ${extensionType === "extend" ? "extended" : "renewed"} from ${format(currentEndDate, "MMM dd, yyyy")} to ${format(newEndDate, "MMM dd, yyyy")}. ${notes || ""}`.trim(),
        created_by: user.id,
        metadata: {
          previous_end_date: campaign.end_date,
          new_end_date: newEndDateStr,
          extension_days: extensionDays,
          extension_type: extensionType,
          generate_invoice: generateInvoice,
          reset_photos: resetProofPhotos,
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

      // Reset proof photos for new period if selected
      if (resetProofPhotos) {
        // Archive current photos and reset status to allow new uploads
        const { data: assets } = await supabase
          .from("campaign_assets")
          .select("id, photos, status")
          .eq("campaign_id", campaign.id);

        if (assets && assets.length > 0) {
          for (const asset of assets) {
            // Archive the old photos in a history field
            const archivedPhotos = asset.photos ? {
              archived_at: new Date().toISOString(),
              period: `${campaign.start_date} to ${campaign.end_date}`,
              photos: asset.photos
            } : null;

            // Reset photos to empty and status to Pending for new proof collection
            await supabase
              .from("campaign_assets")
              .update({
                photos: null, // Clear photos for new upload
                installation_status: "Pending", // Reset installation status
                status: "Pending", // Reset status for new proof collection
              })
              .eq("id", asset.id);

            // Log photo archive in timeline
            if (archivedPhotos) {
              await supabase.from("campaign_timeline").insert({
                campaign_id: campaign.id,
                company_id: campaignData?.company_id,
                event_type: "photos_archived",
                event_title: "Proof Photos Archived",
                event_description: `Previous period photos archived for asset. Ready for new proof uploads.`,
                created_by: user.id,
                metadata: archivedPhotos,
              });
            }
          }
        }
      }

      // Generate invoice for renewal period if selected
      if (generateInvoice && campaignData && campaignData.client_id) {
        const invoiceId = await generateInvoiceId(supabase);
        const gstPercent = campaignData.gst_percent || 18;
        const subTotal = Math.round(renewalAmount / (1 + gstPercent / 100));
        const gstAmount = Math.round(renewalAmount - subTotal);

        const { error: invoiceError } = await supabase.from("invoices").insert({
          id: invoiceId,
          campaign_id: campaign.id,
          client_id: campaignData.client_id,
          client_name: campaign.client_name || campaignData.client_name,
          company_id: campaignData.company_id,
          invoice_date: new Date().toISOString().split('T')[0],
          due_date: format(addDays(new Date(), 30), "yyyy-MM-dd"),
          invoice_period_start: extensionStartDate,
          invoice_period_end: newEndDateStr,
          status: "Draft",
          invoice_type: "renewal",
          sub_total: subTotal,
          gst_percent: gstPercent,
          gst_amount: gstAmount,
          total_amount: renewalAmount,
          balance_due: renewalAmount,
          items: [{
            description: `Campaign Renewal: ${campaign.campaign_name}`,
            period: `${format(addDays(currentEndDate, 1), "MMM dd, yyyy")} - ${format(newEndDate, "MMM dd, yyyy")}`,
            quantity: extensionDays,
            unit: "days",
            rate: extensionDays > 0 ? Math.round(renewalAmount / extensionDays) : 0,
            amount: renewalAmount,
          }],
          notes: `Renewal invoice for extended campaign period. ${notes || ""}`.trim(),
          created_by: user.id,
        });

        if (invoiceError) {
          console.error("Invoice creation error:", invoiceError);
          // Don't throw - invoice creation is optional
          toast({
            title: "Warning",
            description: "Campaign extended but invoice creation failed. Please create manually.",
            variant: "destructive",
          });
        } else {
          // Log invoice creation in timeline
          await supabase.from("campaign_timeline").insert({
            campaign_id: campaign.id,
            company_id: campaignData.company_id,
            event_type: "renewal_invoice_created",
            event_title: "Renewal Invoice Created",
            event_description: `Invoice ${invoiceId} created for renewal period (₹${renewalAmount.toLocaleString('en-IN')})`,
            created_by: user.id,
            metadata: {
              invoice_id: invoiceId,
              amount: renewalAmount,
              period_start: extensionStartDate,
              period_end: newEndDateStr,
            },
          });
        }
      }

      // Create billing period record for tracking
      if (campaignData?.company_id) {
        const monthKey = format(addDays(currentEndDate, 1), "yyyy-MM");
        
        // Check if billing period already exists
        const { data: existingPeriod } = await supabase
          .from("campaign_billing_periods")
          .select("id")
          .eq("campaign_id", campaign.id)
          .eq("month_key", monthKey)
          .maybeSingle();
        
        if (!existingPeriod) {
          await supabase.from("campaign_billing_periods").insert({
            company_id: campaignData.company_id,
            campaign_id: campaign.id,
            period_start: extensionStartDate,
            period_end: newEndDateStr,
            month_key: monthKey,
            status: generateInvoice ? "INVOICED" : "OPEN",
          });
        }
      }

      toast({
        title: extensionType === "extend" ? "Campaign Extended" : "Campaign Renewed",
        description: `${campaign.campaign_name} is now active until ${format(newEndDate, "MMM dd, yyyy")}${generateInvoice ? ". Renewal invoice created." : ""}`,
      });

      onSuccess();
      onOpenChange(false);
      
      // Reset form
      setExtensionType("extend");
      setDurationOption("1month");
      setCustomEndDate(undefined);
      setNotes("");
      setGenerateInvoice(true);
      setResetProofPhotos(true);
      setCarryForwardCreatives(true);
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
      <DialogContent className="sm:max-w-[550px] max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <RefreshCw className="h-5 w-5 text-primary" />
            Extend / Renew Campaign
          </DialogTitle>
          <DialogDescription>
            Extend or renew <span className="font-medium text-foreground">{campaign.campaign_name}</span> for {campaign.client_name}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh] pr-4">
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
                      Month-on-month renewal
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
                <div className="flex-1">
                  <p className="text-sm text-muted-foreground">New End Date</p>
                  <p className="text-lg font-semibold text-primary">
                    {format(newEndDate, "MMMM dd, yyyy")}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    +{extensionDays} days from current end date
                  </p>
                </div>
                {renewalAmount > 0 && (
                  <div className="text-right">
                    <p className="text-sm text-muted-foreground">Est. Amount</p>
                    <p className="text-lg font-semibold text-primary flex items-center gap-1">
                      <IndianRupee className="h-4 w-4" />
                      {renewalAmount.toLocaleString('en-IN')}
                    </p>
                  </div>
                )}
              </div>
            </div>

            <Separator />

            {/* Renewal Workflow Options */}
            <div className="space-y-4">
              <Label className="text-base font-medium">Renewal Workflow</Label>
              
              {/* Generate Invoice */}
              <div className="flex items-start space-x-3 rounded-lg border p-4">
                <Checkbox
                  id="generateInvoice"
                  checked={generateInvoice}
                  onCheckedChange={(checked) => setGenerateInvoice(checked as boolean)}
                />
                <div className="flex-1 space-y-1">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <Label htmlFor="generateInvoice" className="cursor-pointer font-medium">
                      Generate Renewal Invoice
                    </Label>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Create a draft invoice for the extension period (₹{renewalAmount.toLocaleString('en-IN')} estimated)
                  </p>
                </div>
              </div>

              {/* Reset Proof Photos */}
              <div className="flex items-start space-x-3 rounded-lg border p-4">
                <Checkbox
                  id="resetProofPhotos"
                  checked={resetProofPhotos}
                  onCheckedChange={(checked) => setResetProofPhotos(checked as boolean)}
                />
                <div className="flex-1 space-y-1">
                  <div className="flex items-center gap-2">
                    <Camera className="h-4 w-4 text-muted-foreground" />
                    <Label htmlFor="resetProofPhotos" className="cursor-pointer font-medium">
                      Reset Proof Photos
                    </Label>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Archive current photos and reset for new period proof collection
                  </p>
                </div>
              </div>

              {/* Carry Forward Creatives */}
              <div className="flex items-start space-x-3 rounded-lg border p-4">
                <Checkbox
                  id="carryForwardCreatives"
                  checked={carryForwardCreatives}
                  onCheckedChange={(checked) => setCarryForwardCreatives(checked as boolean)}
                />
                <div className="flex-1 space-y-1">
                  <div className="flex items-center gap-2">
                    <RefreshCw className="h-4 w-4 text-muted-foreground" />
                    <Label htmlFor="carryForwardCreatives" className="cursor-pointer font-medium">
                      Keep Current Creatives
                    </Label>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Continue using the same creative designs (no reprint/remount charges)
                  </p>
                </div>
              </div>
            </div>

            <Separator />

            {/* Notes */}
            <div className="space-y-2">
              <Label htmlFor="notes">Notes (optional)</Label>
              <Textarea
                id="notes"
                placeholder="Reason for extension, client request details, PO reference..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
              />
            </div>
          </div>
        </ScrollArea>

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

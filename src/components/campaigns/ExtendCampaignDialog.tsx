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
import { CalendarIcon, RefreshCw, Copy, CalendarPlus, FileText, Camera, IndianRupee } from "lucide-react";
import { cn } from "@/lib/utils";
import { generateInvoiceId } from "@/utils/finance";
import { generateCampaignId } from "@/utils/campaigns";

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

type ExtensionType = "extend" | "renew" | "copy_new";
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
  const [customStartDate, setCustomStartDate] = useState<Date | undefined>();
  // Separate dates for copy_new mode
  const [copyNewStartDate, setCopyNewStartDate] = useState<Date | undefined>();
  const [copyNewEndDate, setCopyNewEndDate] = useState<Date | undefined>();
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  
  // Options for renewal workflow
  const [generateInvoice, setGenerateInvoice] = useState(true);
  const [resetProofPhotos, setResetProofPhotos] = useState(true);
  const [carryForwardCreatives, setCarryForwardCreatives] = useState(true);
  const [markOriginalCompleted, setMarkOriginalCompleted] = useState(true);

  const currentEndDate = new Date(campaign.end_date);
  const today = new Date();

  // Initialize copy_new dates when switching to that mode
  const getDefaultCopyNewStartDate = (): Date => {
    const dayAfterEnd = addDays(currentEndDate, 1);
    return dayAfterEnd > today ? dayAfterEnd : today;
  };

  // For "copy_new", use explicitly set dates
  const getNewStartDate = (): Date => {
    if (extensionType === "copy_new") {
      return copyNewStartDate || getDefaultCopyNewStartDate();
    }
    if (customStartDate) return customStartDate;
    return extensionType === "extend" ? currentEndDate : today;
  };

  const calculateNewEndDate = (): Date => {
    // For copy_new, use explicitly set end date
    if (extensionType === "copy_new") {
      return copyNewEndDate || addMonths(getNewStartDate(), 1);
    }
    
    const baseDate = getNewStartDate();
    
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

  const newStartDate = getNewStartDate();
  const newEndDate = calculateNewEndDate();
  const newDurationDays = Math.max(1, differenceInDays(newEndDate, newStartDate) + 1);
  const extensionDays = differenceInDays(newEndDate, currentEndDate);
  
  // Calculate renewal amount estimate based on daily rate
  const calculateRenewalAmount = () => {
    if (!campaign.grand_total) return 0;
    const originalDays = differenceInDays(new Date(campaign.end_date), new Date(campaign.start_date)) + 1;
    if (originalDays <= 0) return campaign.grand_total;
    const dailyRate = campaign.grand_total / originalDays;
    
    if (extensionType === "copy_new") {
      return Math.round(dailyRate * newDurationDays);
    }
    return Math.round(dailyRate * Math.max(1, extensionDays));
  };

  const renewalAmount = calculateRenewalAmount();

  const handleCopyAsNewCampaign = async (user: any) => {
    // Fetch full campaign data
    const { data: campaignData, error: fetchError } = await supabase
      .from("campaigns")
      .select("*")
      .eq("id", campaign.id)
      .single();

    if (fetchError || !campaignData) {
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

    // Generate new campaign ID
    const newCampaignId = await generateCampaignId(supabase);
    const newStartDateStr = format(newStartDate, "yyyy-MM-dd");
    const newEndDateStr = format(newEndDate, "yyyy-MM-dd");

    // Recalculate totals based on new duration
    const originalDays = differenceInDays(new Date(campaign.end_date), new Date(campaign.start_date));
    const durationRatio = originalDays > 0 ? newDurationDays / originalDays : 1;

    const newSubtotal = Math.round((campaignData.subtotal || 0) * durationRatio);
    const newPrintingTotal = campaignData.printing_total || 0; // One-time cost, may or may not repeat
    const newMountingTotal = campaignData.mounting_total || 0; // One-time cost
    const gstPercent = campaignData.gst_percent || 18;
    const newTotalAmount = Math.round(newSubtotal + newPrintingTotal + newMountingTotal);
    const newGstAmount = Math.round(newTotalAmount * gstPercent / 100);
    const newGrandTotal = newTotalAmount + newGstAmount;

    // Create new campaign
    const { error: createError } = await supabase.from("campaigns").insert({
      id: newCampaignId,
      campaign_name: `${campaignData.campaign_name} (Renewal)`,
      client_id: campaignData.client_id,
      client_name: campaignData.client_name,
      company_id: campaignData.company_id,
      start_date: newStartDateStr,
      end_date: newEndDateStr,
      status: "Upcoming",
      created_by: user.id,
      created_from: `renewal:${campaign.id}`,
      plan_id: campaignData.plan_id,
      subtotal: newSubtotal,
      printing_total: newPrintingTotal,
      mounting_total: newMountingTotal,
      total_amount: newTotalAmount,
      gst_percent: gstPercent,
      gst_amount: newGstAmount,
      grand_total: newGrandTotal,
      total_assets: campaignData.total_assets,
      billing_cycle: campaignData.billing_cycle,
      notes: `Renewed from ${campaign.id}. ${notes || ""}`.trim(),
    });

    if (createError) throw createError;

    // Copy campaign assets with new dates and reset status
    if (campaignAssets && campaignAssets.length > 0) {
      const newAssets = campaignAssets.map(asset => ({
        ...asset,
        id: undefined, // Let DB generate new ID
        campaign_id: newCampaignId,
        booking_start_date: newStartDateStr,
        booking_end_date: newEndDateStr,
        status: "Pending" as const,
        installation_status: "Pending",
        photos: null, // Reset photos for new campaign
        assigned_mounter_id: null,
        mounter_name: null,
        assigned_at: null,
        completed_at: null,
        created_at: new Date().toISOString(),
      }));

      await supabase.from("campaign_assets").insert(newAssets);
    }

    // Copy campaign items with new dates
    if (campaignItems && campaignItems.length > 0) {
      const newItems = campaignItems.map(item => ({
        ...item,
        id: undefined,
        campaign_id: newCampaignId,
        start_date: newStartDateStr,
        end_date: newEndDateStr,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }));

      await supabase.from("campaign_items").insert(newItems);
    }

    // Create asset bookings for new campaign
    if (campaignAssets && campaignAssets.length > 0) {
      const bookings = campaignAssets.map(asset => ({
        asset_id: asset.asset_id,
        campaign_id: newCampaignId,
        start_date: newStartDateStr,
        end_date: newEndDateStr,
        booking_type: "Campaign",
        status: "Confirmed",
        created_by: user.id,
      }));

      await supabase.from("asset_bookings").insert(bookings);
    }

    // Log timeline event for new campaign
    await supabase.from("campaign_timeline").insert({
      campaign_id: newCampaignId,
      company_id: campaignData.company_id,
      event_type: "campaign_created",
      event_title: "Renewal Campaign Created",
      event_description: `New campaign created as renewal of ${campaign.id}`,
      created_by: user.id,
      metadata: {
        original_campaign_id: campaign.id,
        original_campaign_name: campaign.campaign_name,
        renewal_type: "copy_new",
      },
    });

    // Mark original campaign as completed if selected
    if (markOriginalCompleted && campaign.status !== "Completed") {
      await supabase
        .from("campaigns")
        .update({ 
          status: "Completed", 
          updated_at: new Date().toISOString(),
          notes: `${campaignData.notes || ""}\nRenewed to ${newCampaignId}`.trim(),
        })
        .eq("id", campaign.id);

      await supabase.from("campaign_status_history").insert({
        campaign_id: campaign.id,
        old_status: campaign.status as any,
        new_status: "Completed" as const,
        notes: `Campaign completed and renewed to ${newCampaignId}`,
        changed_by: user.id,
      });

      // Log timeline for original
      await supabase.from("campaign_timeline").insert({
        campaign_id: campaign.id,
        company_id: campaignData.company_id,
        event_type: "campaign_renewed",
        event_title: "Campaign Renewed",
        event_description: `Campaign renewed. New campaign: ${newCampaignId}`,
        created_by: user.id,
        metadata: {
          new_campaign_id: newCampaignId,
          new_start_date: newStartDateStr,
          new_end_date: newEndDateStr,
        },
      });
    }

    // Generate invoice for new campaign if selected
    if (generateInvoice && campaignData.client_id) {
      const invoiceId = await generateInvoiceId(supabase);
      
      await supabase.from("invoices").insert({
        id: invoiceId,
        campaign_id: newCampaignId,
        client_id: campaignData.client_id,
        client_name: campaignData.client_name,
        company_id: campaignData.company_id,
        invoice_date: new Date().toISOString().split('T')[0],
        due_date: format(addDays(new Date(), 30), "yyyy-MM-dd"),
        invoice_period_start: newStartDateStr,
        invoice_period_end: newEndDateStr,
        status: "Draft",
        invoice_type: "renewal",
        sub_total: newSubtotal,
        gst_percent: gstPercent,
        gst_amount: newGstAmount,
        total_amount: newGrandTotal,
        balance_due: newGrandTotal,
        items: [{
          description: `Campaign: ${campaignData.campaign_name} (Renewal)`,
          period: `${format(newStartDate, "MMM dd, yyyy")} - ${format(newEndDate, "MMM dd, yyyy")}`,
          quantity: newDurationDays,
          unit: "days",
          rate: newDurationDays > 0 ? Math.round(newGrandTotal / newDurationDays) : 0,
          amount: newGrandTotal,
        }],
        notes: `Renewal invoice for new campaign ${newCampaignId}`,
        created_by: user.id,
      });

      await supabase.from("campaign_timeline").insert({
        campaign_id: newCampaignId,
        company_id: campaignData.company_id,
        event_type: "invoice_created",
        event_title: "Invoice Created",
        event_description: `Invoice ${invoiceId} created (₹${newGrandTotal.toLocaleString('en-IN')})`,
        created_by: user.id,
        metadata: { invoice_id: invoiceId, amount: newGrandTotal },
      });
    }

    return newCampaignId;
  };

  const handleExtendOrRenew = async (user: any) => {
    const newEndDateStr = format(newEndDate, "yyyy-MM-dd");
    const extensionStartDate = format(addDays(currentEndDate, 1), "yyyy-MM-dd");

    // Get full campaign data
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
      const { data: assets } = await supabase
        .from("campaign_assets")
        .select("id, photos, status")
        .eq("campaign_id", campaign.id);

      if (assets && assets.length > 0) {
        for (const asset of assets) {
          await supabase
            .from("campaign_assets")
            .update({
              photos: null,
              installation_status: "Pending",
              status: "Pending",
            })
            .eq("id", asset.id);

          if (asset.photos) {
            await supabase.from("campaign_timeline").insert({
              campaign_id: campaign.id,
              company_id: campaignData?.company_id,
              event_type: "photos_archived",
              event_title: "Proof Photos Archived",
              event_description: `Previous period photos archived. Ready for new proof uploads.`,
              created_by: user.id,
              metadata: {
                archived_at: new Date().toISOString(),
                period: `${campaign.start_date} to ${campaign.end_date}`,
              },
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
        toast({
          title: "Warning",
          description: "Campaign extended but invoice creation failed. Please create manually.",
          variant: "destructive",
        });
      } else {
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

    return null;
  };

  const handleSubmit = async () => {
    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      let newCampaignId: string | null = null;

      if (extensionType === "copy_new") {
        newCampaignId = await handleCopyAsNewCampaign(user);
        toast({
          title: "New Campaign Created",
          description: `${newCampaignId} created with dates ${format(newStartDate, "MMM dd")} - ${format(newEndDate, "MMM dd, yyyy")}${generateInvoice ? ". Invoice created." : ""}`,
        });
      } else {
        await handleExtendOrRenew(user);
        toast({
          title: extensionType === "extend" ? "Campaign Extended" : "Campaign Renewed",
          description: `${campaign.campaign_name} is now active until ${format(newEndDate, "MMM dd, yyyy")}${generateInvoice ? ". Renewal invoice created." : ""}`,
        });
      }

      onSuccess();
      onOpenChange(false);
      
      // Reset form
      setExtensionType("extend");
      setDurationOption("1month");
      setCustomEndDate(undefined);
      setCustomStartDate(undefined);
      setCopyNewStartDate(undefined);
      setCopyNewEndDate(undefined);
      setNotes("");
      setGenerateInvoice(true);
      setResetProofPhotos(true);
      setCarryForwardCreatives(true);
      setMarkOriginalCompleted(true);
    } catch (error: any) {
      console.error("Error processing campaign:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to process campaign",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh]">
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
            {/* Current Campaign Info */}
            <div className="rounded-lg bg-muted p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Current Period</p>
                  <p className="font-semibold">
                    {format(new Date(campaign.start_date), "MMM dd")} - {format(currentEndDate, "MMM dd, yyyy")}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">Status</p>
                  <p className="font-semibold">{campaign.status}</p>
                </div>
              </div>
            </div>

            {/* Extension Type */}
            <div className="space-y-3">
              <Label>Action Type</Label>
              <RadioGroup
                value={extensionType}
                onValueChange={(v) => setExtensionType(v as ExtensionType)}
                className="space-y-3"
              >
                <div className={cn(
                  "flex items-center space-x-3 rounded-lg border p-4 cursor-pointer transition-colors",
                  extensionType === "extend" && "border-primary bg-primary/5"
                )}>
                  <RadioGroupItem value="extend" id="extend" />
                  <div className="flex-1">
                    <Label htmlFor="extend" className="cursor-pointer font-medium flex items-center gap-2">
                      <CalendarPlus className="h-4 w-4" />
                      Extend Current Campaign
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Add time from current end date. Same campaign ID.
                    </p>
                  </div>
                </div>
                <div className={cn(
                  "flex items-center space-x-3 rounded-lg border p-4 cursor-pointer transition-colors",
                  extensionType === "renew" && "border-primary bg-primary/5"
                )}>
                  <RadioGroupItem value="renew" id="renew" />
                  <div className="flex-1">
                    <Label htmlFor="renew" className="cursor-pointer font-medium flex items-center gap-2">
                      <RefreshCw className="h-4 w-4" />
                      Renew (Month-on-Month)
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Add time from today. Resets proof photos. Same campaign ID.
                    </p>
                  </div>
                </div>
                <div className={cn(
                  "flex items-center space-x-3 rounded-lg border p-4 cursor-pointer transition-colors",
                  extensionType === "copy_new" && "border-primary bg-primary/5"
                )}>
                  <RadioGroupItem value="copy_new" id="copy_new" />
                  <div className="flex-1">
                    <Label htmlFor="copy_new" className="cursor-pointer font-medium flex items-center gap-2">
                      <Copy className="h-4 w-4" />
                      Copy as New Campaign
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Create a new campaign with new ID, dates & fresh invoice.
                    </p>
                  </div>
                </div>
              </RadioGroup>
            </div>

            {/* Date Selection for Copy New - Start & End Date pickers */}
            {extensionType === "copy_new" && (
              <div className="space-y-4">
                <div className="space-y-3">
                  <Label>New Campaign Start Date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start text-left">
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {copyNewStartDate ? format(copyNewStartDate, "MMMM dd, yyyy") : format(getDefaultCopyNewStartDate(), "MMMM dd, yyyy")}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={copyNewStartDate || getDefaultCopyNewStartDate()}
                        onSelect={(date) => {
                          setCopyNewStartDate(date);
                          // Reset end date if it's before new start
                          if (date && copyNewEndDate && copyNewEndDate <= date) {
                            setCopyNewEndDate(addMonths(date, 1));
                          }
                        }}
                        initialFocus
                        className="p-3 pointer-events-auto"
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                
                <div className="space-y-3">
                  <Label>New Campaign End Date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start text-left">
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {copyNewEndDate ? format(copyNewEndDate, "MMMM dd, yyyy") : format(addMonths(copyNewStartDate || getDefaultCopyNewStartDate(), 1), "MMMM dd, yyyy")}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={copyNewEndDate || addMonths(copyNewStartDate || getDefaultCopyNewStartDate(), 1)}
                        onSelect={setCopyNewEndDate}
                        disabled={(date) => date <= (copyNewStartDate || getDefaultCopyNewStartDate())}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                {/* Duration Summary */}
                <div className="rounded-lg bg-muted/50 p-3 text-sm">
                  <span className="text-muted-foreground">Duration: </span>
                  <span className="font-medium">{newDurationDays} days</span>
                </div>
              </div>
            )}

            {/* Duration Options - Only for extend/renew */}
            {extensionType !== "copy_new" && (
              <div className="space-y-3">
                <Label>Duration</Label>
                <RadioGroup
                  value={durationOption}
                  onValueChange={(v) => setDurationOption(v as DurationOption)}
                  className="space-y-2"
                >
                  <div className="grid grid-cols-2 gap-2">
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
                  </div>
                  
                  {/* Custom Date Option */}
                  <div
                    className={cn(
                      "flex items-center gap-3 rounded-lg border p-3 cursor-pointer transition-colors",
                      durationOption === "custom" && "border-primary bg-primary/5"
                    )}
                    onClick={() => setDurationOption("custom")}
                  >
                    <RadioGroupItem value="custom" id="custom" />
                    <Label htmlFor="custom" className="cursor-pointer">Custom End Date</Label>
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
                            disabled={(date) => date <= newStartDate}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                    )}
                  </div>
                </RadioGroup>
              </div>
            )}

            {/* New Dates Preview */}
            <div className="rounded-lg border border-primary/30 bg-primary/5 p-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium text-primary">
                  {extensionType === "copy_new" ? "New Campaign Dates" : "New End Date"}
                </p>
                {extensionType === "copy_new" && (
                  <span className="text-xs bg-primary text-primary-foreground px-2 py-0.5 rounded-full">
                    NEW ID
                  </span>
                )}
              </div>
              <p className="text-2xl font-bold">
                {extensionType === "copy_new" 
                  ? `${format(newStartDate, "MMM dd")} - ${format(newEndDate, "MMM dd, yyyy")}`
                  : format(newEndDate, "MMMM dd, yyyy")
                }
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                {extensionType === "copy_new" 
                  ? `${newDurationDays} days duration`
                  : `+${extensionDays} days from current end`
                }
              </p>
            </div>

            <Separator />

            {/* Workflow Options */}
            <div className="space-y-4">
              <Label className="text-base font-semibold">Workflow Options</Label>
              
              <div className="space-y-3">
                <div className="flex items-start gap-3 p-3 rounded-lg border">
                  <Checkbox
                    id="generateInvoice"
                    checked={generateInvoice}
                    onCheckedChange={(checked) => setGenerateInvoice(checked as boolean)}
                  />
                  <div className="flex-1">
                    <Label htmlFor="generateInvoice" className="cursor-pointer flex items-center gap-2 font-medium">
                      <FileText className="h-4 w-4 text-blue-500" />
                      Generate Invoice
                    </Label>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Create a draft invoice for the {extensionType === "copy_new" ? "new campaign" : "extension period"}
                    </p>
                    {generateInvoice && renewalAmount > 0 && (
                      <p className="text-sm font-medium text-green-600 mt-1 flex items-center gap-1">
                        <IndianRupee className="h-3 w-3" />
                        Estimated: ₹{renewalAmount.toLocaleString('en-IN')}
                      </p>
                    )}
                  </div>
                </div>

                {extensionType !== "copy_new" && (
                  <div className="flex items-start gap-3 p-3 rounded-lg border">
                    <Checkbox
                      id="resetProofPhotos"
                      checked={resetProofPhotos}
                      onCheckedChange={(checked) => setResetProofPhotos(checked as boolean)}
                    />
                    <div className="flex-1">
                      <Label htmlFor="resetProofPhotos" className="cursor-pointer flex items-center gap-2 font-medium">
                        <Camera className="h-4 w-4 text-purple-500" />
                        Reset Proof Photos
                      </Label>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Archive current photos and allow new proof uploads for the new period
                      </p>
                    </div>
                  </div>
                )}

                {extensionType === "copy_new" && (
                  <div className="flex items-start gap-3 p-3 rounded-lg border">
                    <Checkbox
                      id="markOriginalCompleted"
                      checked={markOriginalCompleted}
                      onCheckedChange={(checked) => setMarkOriginalCompleted(checked as boolean)}
                    />
                    <div className="flex-1">
                      <Label htmlFor="markOriginalCompleted" className="cursor-pointer font-medium">
                        Mark Original as Completed
                      </Label>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Set current campaign status to "Completed"
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label htmlFor="notes">Notes (Optional)</Label>
              <Textarea
                id="notes"
                placeholder="Add any notes about this renewal..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="min-h-[80px]"
              />
            </div>
          </div>
        </ScrollArea>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={loading} className="min-w-[140px]">
            {loading ? (
              <>
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : extensionType === "copy_new" ? (
              <>
                <Copy className="mr-2 h-4 w-4" />
                Create New Campaign
              </>
            ) : extensionType === "extend" ? (
              <>
                <CalendarPlus className="mr-2 h-4 w-4" />
                Extend Campaign
              </>
            ) : (
              <>
                <RefreshCw className="mr-2 h-4 w-4" />
                Renew Campaign
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

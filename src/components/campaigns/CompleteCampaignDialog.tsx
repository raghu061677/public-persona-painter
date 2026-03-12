/**
 * CompleteCampaignDialog — Explicitly mark a campaign as Completed.
 *
 * Rules:
 *  - Confirmation required
 *  - No silent invoice generation
 *  - No hidden side effects
 *  - Logs status change in campaign_status_history and timeline
 */

import { useState } from "react";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import {
  AlertDialog, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, CheckCircle2, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface CompleteCampaignDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  campaign: {
    id: string;
    campaign_name: string;
    client_name: string;
    start_date: string;
    end_date: string;
    status: string;
    company_id?: string;
    total_assets?: number;
    grand_total?: number;
  };
  onSuccess: () => void;
}

export function CompleteCampaignDialog({
  open, onOpenChange, campaign, onSuccess,
}: CompleteCampaignDialogProps) {
  const [loading, setLoading] = useState(false);
  const [notes, setNotes] = useState("");
  const [completionDate, setCompletionDate] = useState<Date>(new Date());

  const handleComplete = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const completionDateStr = format(completionDate, "yyyy-MM-dd");

      // Update campaign status
      const { error } = await supabase.from("campaigns").update({
        status: "Completed",
        updated_at: new Date().toISOString(),
      }).eq("id", campaign.id);
      if (error) throw error;

      // Log status history
      await supabase.from("campaign_status_history").insert({
        campaign_id: campaign.id,
        old_status: campaign.status as any,
        new_status: "Completed" as const,
        notes: `Campaign marked complete on ${completionDateStr}. ${notes || ""}`.trim(),
        changed_by: user.id,
      });

      // Log timeline
      await supabase.from("campaign_timeline").insert({
        campaign_id: campaign.id,
        company_id: campaign.company_id,
        event_type: "campaign_completed",
        event_title: "Campaign Completed",
        event_description: `Campaign marked as completed. ${notes || ""}`.trim(),
        created_by: user.id,
        metadata: {
          completion_date: completionDateStr,
          previous_status: campaign.status,
        },
      });

      toast({
        title: "Campaign Completed",
        description: `${campaign.campaign_name} has been marked as completed.`,
      });

      onSuccess();
      onOpenChange(false);
      setNotes("");
    } catch (error: any) {
      console.error("Error completing campaign:", error);
      toast({ title: "Error", description: error.message || "Failed to complete campaign", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="sm:max-w-[480px]">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-green-600" />
            Complete Campaign
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-3">
              <p>
                Mark <strong>{campaign.campaign_name}</strong> as operationally complete.
              </p>
              <div className="rounded-lg bg-muted p-3 text-sm space-y-1">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Client</span>
                  <span className="font-medium">{campaign.client_name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Period</span>
                  <span className="font-medium">{format(new Date(campaign.start_date), "MMM dd")} – {format(new Date(campaign.end_date), "MMM dd, yyyy")}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Assets</span>
                  <span className="font-medium">{campaign.total_assets || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total</span>
                  <span className="font-medium">₹{(campaign.grand_total || 0).toLocaleString("en-IN")}</span>
                </div>
              </div>
              <div className="rounded-lg bg-amber-50 dark:bg-amber-950/30 p-3 text-sm text-amber-800 dark:text-amber-200">
                <p><strong>Note:</strong> No invoices will be generated. Use the Billing & Invoices module for invoicing.</p>
              </div>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>Completion Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className={cn("w-full justify-start text-left font-normal")}>
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {format(completionDate, "MMMM dd, yyyy")}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar mode="single" selected={completionDate} onSelect={(d) => { if (d) setCompletionDate(d); }} initialFocus className="p-3 pointer-events-auto" />
              </PopoverContent>
            </Popover>
          </div>

          <div className="space-y-2">
            <Label>Completion Notes (Optional)</Label>
            <Textarea placeholder="Any notes about campaign completion..." value={notes} onChange={(e) => setNotes(e.target.value)} className="min-h-[60px]" />
          </div>
        </div>

        <AlertDialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>Cancel</Button>
          <Button onClick={handleComplete} disabled={loading} className="bg-green-600 hover:bg-green-700">
            {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Processing...</> : <><CheckCircle2 className="mr-2 h-4 w-4" />Mark Complete</>}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

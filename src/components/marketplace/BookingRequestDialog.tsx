import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface BookingRequestDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  asset: any;
}

export function BookingRequestDialog({ open, onOpenChange, asset }: BookingRequestDialogProps) {
  const { toast } = useToast();
  const [startDate, setStartDate] = useState<Date>();
  const [endDate, setEndDate] = useState<Date>();
  const [proposedRate, setProposedRate] = useState(asset.card_rate);
  const [campaignName, setCampaignName] = useState("");
  const [clientName, setClientName] = useState("");
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Get current user's company
  const { data: userCompany } = useQuery({
    queryKey: ["user-company"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("company_users")
        .select("company_id, companies(id, name, type)")
        .eq("user_id", user.id)
        .single();

      if (error) throw error;
      return data;
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!startDate || !endDate) {
      toast({
        title: "Missing dates",
        description: "Please select start and end dates",
        variant: "destructive",
      });
      return;
    }

    if (!userCompany) {
      toast({
        title: "Error",
        description: "Could not identify your company",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase.from("booking_requests").insert({
        asset_id: asset.id,
        requester_company_id: userCompany.company_id,
        owner_company_id: asset.company_id,
        requested_by: user.id,
        start_date: format(startDate, "yyyy-MM-dd"),
        end_date: format(endDate, "yyyy-MM-dd"),
        proposed_rate: proposedRate,
        campaign_name: campaignName || null,
        client_name: clientName || null,
        notes: notes || null,
        status: "pending",
      });

      if (error) throw error;

      toast({
        title: "Request submitted",
        description: "The media owner will review your booking request",
      });

      onOpenChange(false);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Request Booking</DialogTitle>
          <DialogDescription>
            Submit a booking request for {asset.location}, {asset.area}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Asset Info */}
          <div className="bg-muted p-4 rounded-lg space-y-2">
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Asset ID</span>
              <span className="text-sm font-medium">{asset.id}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Type</span>
              <span className="text-sm font-medium">{asset.media_type}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Dimensions</span>
              <span className="text-sm font-medium">{asset.dimensions}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Card Rate</span>
              <span className="text-sm font-bold">₹{asset.card_rate.toLocaleString()}</span>
            </div>
          </div>

          {/* Campaign Details */}
          <div className="space-y-2">
            <Label htmlFor="campaignName">Campaign Name (Optional)</Label>
            <Input
              id="campaignName"
              value={campaignName}
              onChange={(e) => setCampaignName(e.target.value)}
              placeholder="e.g., Summer 2025 Campaign"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="clientName">Client Name (Optional)</Label>
            <Input
              id="clientName"
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
              placeholder="e.g., ABC Corporation"
            />
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
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
                  <Calendar mode="single" selected={startDate} onSelect={setStartDate} />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
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
                  <Calendar mode="single" selected={endDate} onSelect={setEndDate} />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {/* Proposed Rate */}
          <div className="space-y-2">
            <Label htmlFor="proposedRate">Proposed Rate (₹) *</Label>
            <Input
              id="proposedRate"
              type="number"
              value={proposedRate}
              onChange={(e) => setProposedRate(Number(e.target.value))}
              min={0}
            />
            <p className="text-xs text-muted-foreground">
              Card rate: ₹{asset.card_rate.toLocaleString()}
            </p>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Additional Notes (Optional)</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any special requirements or questions..."
              rows={3}
            />
          </div>

          {/* Commission Notice */}
          <div className="bg-blue-50 dark:bg-blue-950 p-3 rounded-lg text-sm">
            <p className="text-blue-900 dark:text-blue-100">
              <strong>Note:</strong> A 2% platform fee will be applied to approved bookings
            </p>
          </div>

          {/* Actions */}
          <div className="flex gap-2 justify-end">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Submitting..." : "Submit Request"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

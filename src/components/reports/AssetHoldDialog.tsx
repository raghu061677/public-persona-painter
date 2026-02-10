import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/contexts/CompanyContext";
import { ClientSelect } from "@/components/shared/ClientSelect";
import { format, addDays } from "date-fns";
import { Shield, Loader2 } from "lucide-react";

interface AssetHoldDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  assetId: string;
  assetLabel: string;
  /** If the asset is currently booked, pass the booking end date so we can default start after it */
  currentBookingEnd?: string | null;
  /** Fallback start date (e.g. report range start) */
  fallbackStartDate?: string;
  onSuccess?: () => void;
}

interface ClientOption {
  id: string;
  name: string;
}

export function AssetHoldDialog({
  open,
  onOpenChange,
  assetId,
  assetLabel,
  currentBookingEnd,
  fallbackStartDate,
  onSuccess,
}: AssetHoldDialogProps) {
  const { company } = useCompany();
  const { toast } = useToast();

  const [clients, setClients] = useState<ClientOption[]>([]);
  const [clientId, setClientId] = useState("");
  const [holdType, setHoldType] = useState<string>("SOFT_HOLD");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  // Load clients
  useEffect(() => {
    if (!open || !company?.id) return;
    supabase
      .from("clients")
      .select("id, name")
      .eq("company_id", company.id)
      .order("name")
      .then(({ data }) => {
        setClients((data as ClientOption[]) || []);
      });
  }, [open, company?.id]);

  // Set default dates when dialog opens
  useEffect(() => {
    if (!open) return;
    let defaultStart: string;
    if (currentBookingEnd) {
      defaultStart = format(addDays(new Date(currentBookingEnd), 1), "yyyy-MM-dd");
    } else {
      defaultStart = fallbackStartDate || format(new Date(), "yyyy-MM-dd");
    }
    setStartDate(defaultStart);
    setEndDate(format(addDays(new Date(defaultStart), 30), "yyyy-MM-dd"));
    setClientId("");
    setHoldType("SOFT_HOLD");
    setNotes("");
  }, [open, currentBookingEnd, fallbackStartDate]);

  const handleSave = async () => {
    if (!company?.id) return;
    if (!startDate || !endDate) {
      toast({ title: "Missing dates", variant: "destructive" });
      return;
    }

    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const selectedClient = clients.find((c) => c.id === clientId);

      const { error } = await supabase.from("asset_holds").insert({
        company_id: company.id,
        asset_id: assetId,
        client_id: clientId || null,
        client_name: selectedClient?.name || null,
        hold_type: holdType,
        start_date: startDate,
        end_date: endDate,
        notes: notes || null,
        created_by: user?.id || null,
      });

      if (error) {
        // The trigger raises descriptive exceptions
        toast({
          title: "Cannot create hold",
          description: error.message?.includes("overlapping")
            ? error.message
            : error.message || "Failed to create hold",
          variant: "destructive",
        });
        return;
      }

      toast({ title: "Asset blocked successfully", description: `${assetLabel} held from ${startDate} to ${endDate}` });
      onOpenChange(false);
      onSuccess?.();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            Block Asset for Client
          </DialogTitle>
          <DialogDescription>
            Reserve <strong>{assetLabel}</strong> for a future campaign.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>Client (optional for internal block)</Label>
            <ClientSelect
              clients={clients}
              value={clientId}
              onSelect={setClientId}
              placeholder="Select client or leave blank..."
            />
          </div>

          <div className="space-y-2">
            <Label>Hold Type</Label>
            <Select value={holdType} onValueChange={setHoldType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="OPTION">Option (soft, low priority)</SelectItem>
                <SelectItem value="SOFT_HOLD">Soft Hold</SelectItem>
                <SelectItem value="HARD_BLOCK">Hard Block (reserved)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Start Date</Label>
              <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>End Date</Label>
              <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Notes</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Optional notes about this hold..."
              rows={2}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Confirm Hold
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

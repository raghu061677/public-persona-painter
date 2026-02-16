import { useState, useEffect } from "react";
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
import { CalendarIcon, UserPlus } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Checkbox } from "@/components/ui/checkbox";

interface MountingAssignmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  campaignId: string;
  assets: any[];
  onAssigned: () => void;
}

export function MountingAssignmentDialog({
  open,
  onOpenChange,
  campaignId,
  assets,
  onAssigned,
}: MountingAssignmentDialogProps) {
  const [loading, setLoading] = useState(false);
  const [selectedAssets, setSelectedAssets] = useState<Set<string>>(new Set());
  const [mounterName, setMounterName] = useState("");
  const [mounterPhone, setMounterPhone] = useState("");
  const [scheduledDate, setScheduledDate] = useState<Date>();
  const [instructions, setInstructions] = useState("");

  const handleAssign = async () => {
    if (!mounterName || !mounterPhone || !scheduledDate || selectedAssets.size === 0) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields and select at least one asset",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      // Status hierarchy - don't regress past these levels
      const statusHierarchy = ['Pending', 'Assigned', 'Installed', 'Proof Uploaded', 'Verified'];
      const assignedIndex = statusHierarchy.indexOf('Assigned');

      // Update each selected asset
      for (const assetId of Array.from(selectedAssets)) {
        const asset = assets.find(a => a.id === assetId);
        const currentIndex = asset ? statusHierarchy.indexOf(asset.status) : -1;
        const shouldUpdateStatus = currentIndex < assignedIndex || currentIndex === -1;

        const updateData: any = {
          mounter_name: mounterName,
          mounter_phone: mounterPhone,
          assigned_at: new Date().toISOString(),
        };
        if (shouldUpdateStatus) {
          updateData.status = "Assigned" as const;
        }

        const { error } = await supabase
          .from("campaign_assets")
          .update(updateData)
          .eq("id", assetId);

        if (error) throw error;
      }

      // Log activity
      await supabase.from("activity_logs").insert({
        user_id: (await supabase.auth.getUser()).data.user?.id,
        action: "assign_mounting",
        resource_type: "campaign",
        resource_id: campaignId,
        details: {
          mounter_name: mounterName,
          assets_count: selectedAssets.size,
          scheduled_date: format(scheduledDate, "yyyy-MM-dd"),
        },
      });

      toast({
        title: "Success",
        description: `Assigned ${selectedAssets.size} asset(s) to ${mounterName}`,
      });

      onAssigned();
      onOpenChange(false);
      resetForm();
    } catch (error: any) {
      console.error("Error assigning mounting:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to assign mounting tasks",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setSelectedAssets(new Set());
    setMounterName("");
    setMounterPhone("");
    setScheduledDate(undefined);
    setInstructions("");
  };

  const toggleAsset = (assetId: string) => {
    const newSelected = new Set(selectedAssets);
    if (newSelected.has(assetId)) {
      newSelected.delete(assetId);
    } else {
      newSelected.add(assetId);
    }
    setSelectedAssets(newSelected);
  };

  const selectAll = () => {
    if (selectedAssets.size === assets.length) {
      setSelectedAssets(new Set());
    } else {
      setSelectedAssets(new Set(assets.map((a) => a.id)));
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Assign Mounting Tasks
          </DialogTitle>
          <DialogDescription>
            Assign mounting and installation tasks to field team
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="mounter-name">Mounter Name *</Label>
              <Input
                id="mounter-name"
                value={mounterName}
                onChange={(e) => setMounterName(e.target.value)}
                placeholder="Enter mounter name"
              />
            </div>

            <div>
              <Label htmlFor="mounter-phone">Phone Number *</Label>
              <Input
                id="mounter-phone"
                value={mounterPhone}
                onChange={(e) => setMounterPhone(e.target.value)}
                placeholder="+91 XXXXX XXXXX"
              />
            </div>
          </div>

          <div>
            <Label>Scheduled Date *</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !scheduledDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {scheduledDate ? format(scheduledDate, "PPP") : "Pick a date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={scheduledDate}
                  onSelect={(date) => date && setScheduledDate(date)}
                />
              </PopoverContent>
            </Popover>
          </div>

          <div>
            <Label htmlFor="instructions">Instructions (Optional)</Label>
            <Textarea
              id="instructions"
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              placeholder="Add mounting instructions or special requirements"
              rows={2}
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <Label>Select Assets *</Label>
              <Button variant="ghost" size="sm" onClick={selectAll}>
                {selectedAssets.size === assets.length ? "Deselect All" : "Select All"}
              </Button>
            </div>
            <div className="border rounded-lg p-4 max-h-[300px] overflow-y-auto space-y-2">
              {assets.map((asset) => (
                <div
                  key={asset.id}
                  className="flex items-center space-x-2 p-2 hover:bg-accent rounded"
                >
                  <Checkbox
                    checked={selectedAssets.has(asset.id)}
                    onCheckedChange={() => toggleAsset(asset.id)}
                  />
                  <div className="flex-1">
                    <p className="font-medium text-sm">
                      {asset.asset_id} - {asset.location}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {asset.city}, {asset.area} • {asset.media_type}
                    </p>
                  </div>
                  <span className="text-xs px-2 py-1 rounded bg-muted">
                    {asset.status}
                  </span>
                </div>
              ))}
            </div>
            <p className="text-sm text-muted-foreground mt-2">
              {selectedAssets.size} of {assets.length} asset(s) selected
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleAssign} disabled={loading}>
            {loading ? "Assigning..." : "Assign Tasks"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { ListChecks, RefreshCw } from "lucide-react";

interface BulkStatusUpdateDialogProps {
  selectedCampaigns: string[];
  onUpdate: () => void;
  onClearSelection: () => void;
}

export function BulkStatusUpdateDialog({
  selectedCampaigns,
  onUpdate,
  onClearSelection,
}: BulkStatusUpdateDialogProps) {
  const [open, setOpen] = useState(false);
  const [newStatus, setNewStatus] = useState("");
  const [notes, setNotes] = useState("");
  const [processing, setProcessing] = useState(false);

  const statusOptions = [
    { value: "Planned", label: "Planned" },
    { value: "Assigned", label: "Assigned" },
    { value: "InProgress", label: "In Progress" },
    { value: "PhotoUploaded", label: "Photo Uploaded" },
    { value: "Verified", label: "Verified" },
    { value: "Completed", label: "Completed" },
  ];

  const handleBulkUpdate = async () => {
    if (!newStatus) {
      toast({
        title: "Error",
        description: "Please select a status",
        variant: "destructive",
      });
      return;
    }

    if (selectedCampaigns.length === 0) {
      toast({
        title: "Error",
        description: "No campaigns selected",
        variant: "destructive",
      });
      return;
    }

    setProcessing(true);
    try {
      const updates: any = {
        status: newStatus,
        updated_at: new Date().toISOString(),
      };

      if (notes.trim()) {
        updates.notes = notes;
      }

      const { error } = await supabase
        .from("campaigns")
        .update(updates)
        .in("id", selectedCampaigns);

      if (error) throw error;

      toast({
        title: "Success",
        description: `Updated ${selectedCampaigns.length} campaign(s) to ${newStatus}`,
      });

      setOpen(false);
      setNewStatus("");
      setNotes("");
      onClearSelection();
      onUpdate();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update campaigns",
        variant: "destructive",
      });
    } finally {
      setProcessing(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" disabled={selectedCampaigns.length === 0}>
          <ListChecks className="mr-2 h-4 w-4" />
          Bulk Status Update
          {selectedCampaigns.length > 0 && (
            <Badge variant="secondary" className="ml-2">
              {selectedCampaigns.length}
            </Badge>
          )}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            Update Status for {selectedCampaigns.length} Campaign(s)
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>New Status *</Label>
            <Select value={newStatus} onValueChange={setNewStatus}>
              <SelectTrigger>
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                {statusOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Notes (Optional)</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add notes about this status change..."
              rows={3}
            />
          </div>

          <div className="bg-muted/50 rounded-lg p-3 text-sm">
            <p className="font-medium mb-1">Selected Campaigns:</p>
            <p className="text-muted-foreground">{selectedCampaigns.join(", ")}</p>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleBulkUpdate} disabled={processing}>
              {processing ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  Updating...
                </>
              ) : (
                "Update Campaigns"
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

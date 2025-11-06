import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface BulkPrintingMountingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedAssetIds: Set<string>;
  planId: string;
  onSuccess: () => void;
}

export function BulkPrintingMountingDialog({
  open,
  onOpenChange,
  selectedAssetIds,
  planId,
  onSuccess,
}: BulkPrintingMountingDialogProps) {
  const [printingCharges, setPrintingCharges] = useState("");
  const [mountingCharges, setMountingCharges] = useState("");
  const [loading, setLoading] = useState(false);

  const handleUpdate = async () => {
    if (!printingCharges && !mountingCharges) {
      toast({
        title: "Error",
        description: "Please enter at least one value",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const updates: any = {};
      if (printingCharges) updates.printing_charges = parseFloat(printingCharges);
      if (mountingCharges) updates.mounting_charges = parseFloat(mountingCharges);

      const { error } = await supabase
        .from("plan_items")
        .update(updates)
        .eq("plan_id", planId)
        .in("asset_id", Array.from(selectedAssetIds));

      if (error) throw error;

      toast({
        title: "Success",
        description: `Updated ${selectedAssetIds.size} asset(s)`,
      });

      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Bulk Update Printing & Mounting</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Update printing and mounting charges for {selectedAssetIds.size} selected asset(s)
          </p>

          <div>
            <Label>Printing Charges (₹)</Label>
            <Input
              type="number"
              value={printingCharges}
              onChange={(e) => setPrintingCharges(e.target.value)}
              placeholder="Enter printing charges"
            />
          </div>

          <div>
            <Label>Mounting Charges (₹)</Label>
            <Input
              type="number"
              value={mountingCharges}
              onChange={(e) => setMountingCharges(e.target.value)}
              placeholder="Enter mounting charges"
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdate} disabled={loading}>
              {loading ? "Updating..." : "Update"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

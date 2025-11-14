import { useState } from "react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";

interface BulkEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedAssetIds: string[];
  onSuccess: () => void;
}

interface BulkEditFields {
  status?: string;
  card_rate?: number;
  base_rent?: number;
  gst_percent?: number;
  is_public?: boolean;
}

export function BulkEditDialog({
  open,
  onOpenChange,
  selectedAssetIds,
  onSuccess,
}: BulkEditDialogProps) {
  const [loading, setLoading] = useState(false);
  const [fields, setFields] = useState({
    updateStatus: false,
    updateCardRate: false,
    updateBaseRent: false,
    updateGst: false,
    updateIsPublic: false,
  });
  
  const [values, setValues] = useState<BulkEditFields>({
    status: "Available",
    card_rate: 0,
    base_rent: 0,
    gst_percent: 18,
    is_public: false,
  });

  const handleSubmit = async () => {
    setLoading(true);
    
    try {
      // Build update object based on selected fields
      const updateData: any = {};
      
      if (fields.updateStatus) updateData.status = values.status;
      if (fields.updateCardRate) updateData.card_rate = values.card_rate;
      if (fields.updateBaseRent) updateData.base_rent = values.base_rent;
      if (fields.updateGst) updateData.gst_percent = values.gst_percent;
      if (fields.updateIsPublic) updateData.is_public = values.is_public;
      
      if (Object.keys(updateData).length === 0) {
        toast({
          title: "No fields selected",
          description: "Please select at least one field to update",
          variant: "destructive",
        });
        return;
      }

      const { error } = await supabase
        .from("media_assets")
        .update(updateData)
        .in("id", selectedAssetIds);

      if (error) throw error;

      toast({
        title: "Success",
        description: `Updated ${selectedAssetIds.length} assets successfully`,
      });

      onSuccess();
      onOpenChange(false);
      
      // Reset form
      setFields({
        updateStatus: false,
        updateCardRate: false,
        updateBaseRent: false,
        updateGst: false,
        updateIsPublic: false,
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update assets",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Bulk Edit Assets</DialogTitle>
          <DialogDescription>
            Update {selectedAssetIds.length} selected asset{selectedAssetIds.length !== 1 ? 's' : ''}. 
            Only checked fields will be updated.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Status */}
          <div className="flex items-start space-x-4">
            <Checkbox
              id="updateStatus"
              checked={fields.updateStatus}
              onCheckedChange={(checked) =>
                setFields({ ...fields, updateStatus: checked as boolean })
              }
              className="mt-2"
            />
            <div className="flex-1 space-y-2">
              <Label htmlFor="status" className={!fields.updateStatus ? "text-muted-foreground" : ""}>
                Status
              </Label>
              <Select
                value={values.status}
                onValueChange={(value) => setValues({ ...values, status: value })}
                disabled={!fields.updateStatus}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Available">Available</SelectItem>
                  <SelectItem value="Booked">Booked</SelectItem>
                  <SelectItem value="Under Maintenance">Under Maintenance</SelectItem>
                  <SelectItem value="Blocked">Blocked</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Card Rate */}
          <div className="flex items-start space-x-4">
            <Checkbox
              id="updateCardRate"
              checked={fields.updateCardRate}
              onCheckedChange={(checked) =>
                setFields({ ...fields, updateCardRate: checked as boolean })
              }
              className="mt-2"
            />
            <div className="flex-1 space-y-2">
              <Label htmlFor="card_rate" className={!fields.updateCardRate ? "text-muted-foreground" : ""}>
                Card Rate (₹)
              </Label>
              <Input
                id="card_rate"
                type="number"
                value={values.card_rate}
                onChange={(e) => setValues({ ...values, card_rate: parseFloat(e.target.value) || 0 })}
                disabled={!fields.updateCardRate}
                placeholder="Enter card rate"
              />
            </div>
          </div>

          {/* Base Rent */}
          <div className="flex items-start space-x-4">
            <Checkbox
              id="updateBaseRent"
              checked={fields.updateBaseRent}
              onCheckedChange={(checked) =>
                setFields({ ...fields, updateBaseRent: checked as boolean })
              }
              className="mt-2"
            />
            <div className="flex-1 space-y-2">
              <Label htmlFor="base_rent" className={!fields.updateBaseRent ? "text-muted-foreground" : ""}>
                Base Rent (₹)
              </Label>
              <Input
                id="base_rent"
                type="number"
                value={values.base_rent}
                onChange={(e) => setValues({ ...values, base_rent: parseFloat(e.target.value) || 0 })}
                disabled={!fields.updateBaseRent}
                placeholder="Enter base rent"
              />
            </div>
          </div>

          {/* GST Percent */}
          <div className="flex items-start space-x-4">
            <Checkbox
              id="updateGst"
              checked={fields.updateGst}
              onCheckedChange={(checked) =>
                setFields({ ...fields, updateGst: checked as boolean })
              }
              className="mt-2"
            />
            <div className="flex-1 space-y-2">
              <Label htmlFor="gst_percent" className={!fields.updateGst ? "text-muted-foreground" : ""}>
                GST (%)
              </Label>
              <Input
                id="gst_percent"
                type="number"
                value={values.gst_percent}
                onChange={(e) => setValues({ ...values, gst_percent: parseFloat(e.target.value) || 0 })}
                disabled={!fields.updateGst}
                placeholder="Enter GST percentage"
              />
            </div>
          </div>

          {/* Is Public */}
          <div className="flex items-start space-x-4">
            <Checkbox
              id="updateIsPublic"
              checked={fields.updateIsPublic}
              onCheckedChange={(checked) =>
                setFields({ ...fields, updateIsPublic: checked as boolean })
              }
              className="mt-2"
            />
            <div className="flex-1 space-y-2">
              <Label htmlFor="is_public" className={!fields.updateIsPublic ? "text-muted-foreground" : ""}>
                Public Visibility
              </Label>
              <Select
                value={values.is_public ? "true" : "false"}
                onValueChange={(value) => setValues({ ...values, is_public: value === "true" })}
                disabled={!fields.updateIsPublic}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="true">Public (Visible in Marketplace)</SelectItem>
                  <SelectItem value="false">Private (Hidden)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Update {selectedAssetIds.length} Asset{selectedAssetIds.length !== 1 ? 's' : ''}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

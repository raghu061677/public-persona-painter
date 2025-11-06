import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface AddMaintenanceDialogProps {
  assetId: string;
  onSuccess: () => void;
}

export function AddMaintenanceDialog({ assetId, onSuccess }: AddMaintenanceDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    maintenance_type: "",
    maintenance_date: new Date().toISOString().split('T')[0],
    description: "",
    vendor_name: "",
    cost: "",
    status: "Completed",
    notes: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.maintenance_type || !formData.maintenance_date) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    const { error } = await supabase
      .from('asset_maintenance')
      .insert({
        asset_id: assetId,
        maintenance_type: formData.maintenance_type,
        maintenance_date: formData.maintenance_date,
        description: formData.description || null,
        vendor_name: formData.vendor_name || null,
        cost: formData.cost ? parseFloat(formData.cost) : 0,
        status: formData.status,
        notes: formData.notes || null,
      });

    if (error) {
      toast({
        title: "Error",
        description: "Failed to add maintenance record",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Success",
        description: "Maintenance record added successfully",
      });
      setOpen(false);
      setFormData({
        maintenance_type: "",
        maintenance_date: new Date().toISOString().split('T')[0],
        description: "",
        vendor_name: "",
        cost: "",
        status: "Completed",
        notes: "",
      });
      onSuccess();
    }

    setLoading(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="mr-2 h-4 w-4" />
          Add Maintenance
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add Maintenance Record</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="maintenance_type">Type *</Label>
            <Select
              value={formData.maintenance_type}
              onValueChange={(value) => setFormData({ ...formData, maintenance_type: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Repair">Repair</SelectItem>
                <SelectItem value="Cleaning">Cleaning</SelectItem>
                <SelectItem value="Painting">Painting</SelectItem>
                <SelectItem value="Electrical">Electrical</SelectItem>
                <SelectItem value="Structural">Structural</SelectItem>
                <SelectItem value="Other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="maintenance_date">Date *</Label>
            <Input
              id="maintenance_date"
              type="date"
              value={formData.maintenance_date}
              onChange={(e) => setFormData({ ...formData, maintenance_date: e.target.value })}
              required
            />
          </div>

          <div>
            <Label htmlFor="description">Description</Label>
            <Input
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Brief description"
            />
          </div>

          <div>
            <Label htmlFor="vendor_name">Vendor Name</Label>
            <Input
              id="vendor_name"
              value={formData.vendor_name}
              onChange={(e) => setFormData({ ...formData, vendor_name: e.target.value })}
              placeholder="Vendor/contractor name"
            />
          </div>

          <div>
            <Label htmlFor="cost">Cost (₹)</Label>
            <Input
              id="cost"
              type="number"
              step="0.01"
              value={formData.cost}
              onChange={(e) => setFormData({ ...formData, cost: e.target.value })}
              placeholder="0.00"
            />
          </div>

          <div>
            <Label htmlFor="status">Status</Label>
            <Select
              value={formData.status}
              onValueChange={(value) => setFormData({ ...formData, status: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Scheduled">Scheduled</SelectItem>
                <SelectItem value="In Progress">In Progress</SelectItem>
                <SelectItem value="Completed">Completed</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Additional notes"
              rows={3}
            />
          </div>

          <div className="flex gap-2 justify-end">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Adding..." : "Add Record"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

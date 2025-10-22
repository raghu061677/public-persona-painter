import { useState } from "react";
import { useNavigate } from "react-router-dom";
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
import { toast } from "@/hooks/use-toast";

interface AddPlanFromAssetsModalProps {
  open: boolean;
  onClose: () => void;
  assetIds: string[];
}

export default function AddPlanFromAssetsModal({
  open,
  onClose,
  assetIds,
}: AddPlanFromAssetsModalProps) {
  const navigate = useNavigate();
  const [planName, setPlanName] = useState("");

  const handleCreate = () => {
    if (!planName.trim()) {
      toast({
        title: "Error",
        description: "Please enter a plan name",
        variant: "destructive",
      });
      return;
    }

    // Navigate to plan creation with pre-selected assets
    navigate(`/admin/plans/new?assets=${assetIds.join(',')}&name=${encodeURIComponent(planName)}`);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create Plan from Selected Assets</DialogTitle>
          <DialogDescription>
            {assetIds.length} asset(s) selected. Enter a name for the new plan.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="plan-name">Plan Name</Label>
            <Input
              id="plan-name"
              placeholder="Enter plan name..."
              value={planName}
              onChange={(e) => setPlanName(e.target.value)}
            />
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleCreate}>
            Create Plan
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

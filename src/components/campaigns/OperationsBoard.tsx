import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { UserPlus, Upload, CheckCircle2 } from "lucide-react";
import { getAssetStatusColor } from "@/utils/campaigns";
import { useNavigate } from "react-router-dom";
import { BulkOperationsDialog } from "./BulkOperationsDialog";

interface OperationsBoardProps {
  campaignId: string;
  assets: any[];
  onUpdate: () => void;
}

export function OperationsBoard({ campaignId, assets, onUpdate }: OperationsBoardProps) {
  const navigate = useNavigate();
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState<any>(null);
  const [mounterName, setMounterName] = useState("");
  const [assigning, setAssigning] = useState(false);

  const handleAssignMounter = async () => {
    if (!selectedAsset || !mounterName.trim()) {
      toast({
        title: "Error",
        description: "Please enter mounter name",
        variant: "destructive",
      });
      return;
    }

    setAssigning(true);
    try {
      const { error } = await supabase
        .from('campaign_assets')
        .update({
          mounter_name: mounterName,
          status: 'Assigned',
          assigned_at: new Date().toISOString(),
        })
        .eq('id', selectedAsset.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Mounter assigned successfully",
      });

      setAssignDialogOpen(false);
      setMounterName("");
      setSelectedAsset(null);
      onUpdate();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setAssigning(false);
    }
  };

  const handleStatusChange = async (assetId: string, newStatus: 'Pending' | 'Assigned' | 'Mounted' | 'PhotoUploaded' | 'Verified') => {
    try {
      const { error } = await supabase
        .from('campaign_assets')
        .update({ status: newStatus })
        .eq('id', assetId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Status updated successfully",
      });

      onUpdate();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const statusOptions: Array<'Pending' | 'Assigned' | 'Mounted' | 'PhotoUploaded' | 'Verified'> = [
    'Pending',
    'Assigned',
    'Mounted',
    'PhotoUploaded',
    'Verified',
  ];

  return (
    <div className="space-y-4">
      <div className="flex justify-end mb-4">
        <BulkOperationsDialog assets={assets} onUpdate={onUpdate} />
      </div>
      
      <div className="grid gap-4">
        {assets.map((asset) => (
          <Card key={asset.id}>
            <CardContent className="pt-6">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 space-y-3">
                  <div>
                    <h3 className="font-semibold">{asset.asset_id}</h3>
                    <p className="text-sm text-muted-foreground">
                      {asset.location}, {asset.area}, {asset.city}
                    </p>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <Label className="text-sm">Status:</Label>
                      <Select
                        value={asset.status}
                        onValueChange={(value) => handleStatusChange(asset.id, value as 'Pending' | 'Assigned' | 'Mounted' | 'PhotoUploaded' | 'Verified')}
                      >
                        <SelectTrigger className="w-40">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {statusOptions.map((status) => (
                            <SelectItem key={status} value={status}>
                              {status}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {asset.mounter_name && (
                      <div className="text-sm">
                        <span className="text-muted-foreground">Mounter:</span>{" "}
                        <span className="font-medium">{asset.mounter_name}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  {!asset.mounter_name ? (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setSelectedAsset(asset);
                        setAssignDialogOpen(true);
                      }}
                    >
                      <UserPlus className="h-4 w-4 mr-2" />
                      Assign Mounter
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => navigate(`/mobile/upload/${campaignId}/${asset.id}`)}
                    >
                      <Upload className="h-4 w-4 mr-2" />
                      Upload Photos
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={assignDialogOpen} onOpenChange={setAssignDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign Mounter</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="mounter-name">Mounter Name</Label>
              <Input
                id="mounter-name"
                value={mounterName}
                onChange={(e) => setMounterName(e.target.value)}
                placeholder="Enter mounter name"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setAssignDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleAssignMounter} disabled={assigning}>
                {assigning ? "Assigning..." : "Assign"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
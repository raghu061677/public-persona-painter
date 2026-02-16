import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
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
import { checkAndAutoGeneratePPT } from "@/lib/operations/autoGenerateProofPPT";
import { formatAssetDisplayCode } from "@/lib/assets/formatAssetDisplayCode";

interface OperationsBoardProps {
  campaignId: string;
  assets: any[];
  onUpdate: () => void;
  assetCodePrefix?: string | null;
  companyName?: string | null;
}

export function OperationsBoard({ campaignId, assets, onUpdate, assetCodePrefix, companyName }: OperationsBoardProps) {
  const navigate = useNavigate();
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState<any>(null);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [assigning, setAssigning] = useState(false);
  const [users, setUsers] = useState<Array<{ id: string; username: string }>>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);

  useEffect(() => {
    fetchOperationsUsers();
  }, []);

  const fetchOperationsUsers = async () => {
    setLoadingUsers(true);
    try {
      // Fetch users with operations role
      const { data: userRoles, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'operations');

      if (rolesError) throw rolesError;

      if (userRoles && userRoles.length > 0) {
        const userIds = userRoles.map(ur => ur.user_id);
        
        // Fetch profiles for these users
        const { data: profiles, error: profilesError } = await supabase
          .from('profiles')
          .select('id, username')
          .in('id', userIds);

        if (profilesError) throw profilesError;
        setUsers(profiles || []);
      }
    } catch (error: any) {
      console.error('Error fetching users:', error);
      toast({
        title: "Warning",
        description: "Could not load operations users",
        variant: "destructive",
      });
    } finally {
      setLoadingUsers(false);
    }
  };

  const handleAssignMounter = async () => {
    if (!selectedAsset || !selectedUserId) {
      toast({
        title: "Error",
        description: "Please select a mounter",
        variant: "destructive",
      });
      return;
    }

    const selectedUser = users.find(u => u.id === selectedUserId);
    if (!selectedUser) {
      toast({
        title: "Error",
        description: "Invalid user selection",
        variant: "destructive",
      });
      return;
    }

    setAssigning(true);
    try {
      // Don't regress status if asset has already progressed past Assigned
      const statusHierarchy = ['Pending', 'Assigned', 'Installed', 'Proof Uploaded', 'Verified'];
      const currentIndex = statusHierarchy.indexOf(selectedAsset.status);
      const assignedIndex = statusHierarchy.indexOf('Assigned');
      const shouldUpdateStatus = currentIndex < assignedIndex || currentIndex === -1;

      const updateData: any = {
        mounter_name: selectedUser.username,
        assigned_at: new Date().toISOString(),
      };
      if (shouldUpdateStatus) {
        updateData.status = 'Assigned';
      }

      const { error } = await supabase
        .from('campaign_assets')
        .update(updateData)
        .eq('id', selectedAsset.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: `Assigned to ${selectedUser.username}`,
      });

      setAssignDialogOpen(false);
      setSelectedUserId("");
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
      
      // Check if all assets are verified and auto-generate PPT if enabled
      if (newStatus === 'Verified') {
        const pptGenerated = await checkAndAutoGeneratePPT(campaignId);
        if (pptGenerated) {
          toast({
            title: "PPT Auto-Generated",
            description: "All proofs verified. Proof of Display PPT has been generated automatically.",
          });
        }
      }
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
        {assets.map((asset) => {
          const hasPhotos = (asset.photo_count || 0) > 0;
          const cardBorderClass = hasPhotos
            ? 'border-l-4 border-l-green-500'
            : 'border-l-4 border-l-red-400';
          return (
          <Card key={asset.id} className={cardBorderClass}>
            <CardContent className="pt-6">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 space-y-3">
                  <div>
                    <h3 className="font-semibold font-mono text-sm">{formatAssetDisplayCode({ mediaAssetCode: asset.media_asset_code, fallbackId: asset.asset_id, companyPrefix: assetCodePrefix, companyName })}</h3>
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
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => navigate(`/mobile/upload/${campaignId}/${asset.id}`)}
                      >
                        <Upload className="h-4 w-4 mr-2" />
                        Mobile Upload
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => navigate(`/admin/operations/${campaignId}/assets/${asset.asset_id}`)}
                      >
                        📸 Manage Photos
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        );
        })}
      </div>

      <Dialog open={assignDialogOpen} onOpenChange={setAssignDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign Mounter</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="mounter-select">Select Operations User</Label>
              {loadingUsers ? (
                <div className="text-sm text-muted-foreground">Loading users...</div>
              ) : users.length === 0 ? (
                <div className="text-sm text-muted-foreground">No operations users found. Please assign operations role to users first.</div>
              ) : (
                <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                  <SelectTrigger id="mounter-select">
                    <SelectValue placeholder="Choose a user..." />
                  </SelectTrigger>
                  <SelectContent>
                    {users.map((user) => (
                      <SelectItem key={user.id} value={user.id}>
                        {user.username || 'Unnamed User'}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setAssignDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleAssignMounter} disabled={assigning || !selectedUserId}>
                {assigning ? "Assigning..." : "Assign"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
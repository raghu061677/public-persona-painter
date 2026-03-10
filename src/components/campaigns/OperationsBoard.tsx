import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
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
} from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { UserPlus, Upload, Search, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { BulkOperationsDialog } from "./BulkOperationsDialog";
import { checkAndAutoGeneratePPT } from "@/lib/operations/autoGenerateProofPPT";
import { formatAssetDisplayCode } from "@/lib/assets/formatAssetDisplayCode";
import {
  normalizeCampaignAssetStatus,
  getCampaignAssetStatusOptions,
  isCampaignAssetStatusAtLeast,
  type CampaignAssetStatus,
} from "@/lib/constants/campaignAssetStatus";

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
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    fetchOperationsUsers();
  }, []);

  const fetchOperationsUsers = async () => {
    setLoadingUsers(true);
    try {
      const { data: userRoles, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'operations');

      if (rolesError) throw rolesError;

      if (userRoles && userRoles.length > 0) {
        const userIds = userRoles.map(ur => ur.user_id);
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

  // Filter assets by search query
  const filteredAssets = useMemo(() => {
    if (!searchQuery.trim()) return assets;
    const term = searchQuery.toLowerCase();
    return assets.filter(asset => {
      const displayCode = formatAssetDisplayCode({
        mediaAssetCode: asset.media_asset_code,
        fallbackId: asset.asset_id,
        companyPrefix: assetCodePrefix,
        companyName,
      });
      return (
        displayCode?.toLowerCase().includes(term) ||
        asset.asset_id?.toLowerCase().includes(term) ||
        asset.location?.toLowerCase().includes(term) ||
        asset.area?.toLowerCase().includes(term) ||
        asset.city?.toLowerCase().includes(term) ||
        asset.media_type?.toLowerCase().includes(term) ||
        asset.mounter_name?.toLowerCase().includes(term)
      );
    });
  }, [assets, searchQuery, assetCodePrefix, companyName]);

  const handleAssignMounter = async () => {
    if (!selectedAsset || !selectedUserId) {
      toast({ title: "Error", description: "Please select a mounter", variant: "destructive" });
      return;
    }

    const selectedUser = users.find(u => u.id === selectedUserId);
    if (!selectedUser) {
      toast({ title: "Error", description: "Invalid user selection", variant: "destructive" });
      return;
    }

    setAssigning(true);
    try {
      const shouldUpdateStatus = !isCampaignAssetStatusAtLeast(selectedAsset.status, 'Assigned');

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

      toast({ title: "Success", description: `Assigned to ${selectedUser.username}` });
      setAssignDialogOpen(false);
      setSelectedUserId("");
      setSelectedAsset(null);
      onUpdate();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setAssigning(false);
    }
  };

  const handleStatusChange = async (assetId: string, newStatus: CampaignAssetStatus) => {
    try {
      const updateData: any = { status: newStatus };
      if (newStatus === 'Completed' || newStatus === 'Verified') {
        updateData.completed_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from('campaign_assets')
        .update(updateData)
        .eq('id', assetId);

      if (error) throw error;

      toast({ title: "Success", description: "Status updated successfully" });
      onUpdate();

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
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const statusOptions = getCampaignAssetStatusOptions();

  return (
    <div className="space-y-4">
      {/* Search Bar + Bulk Operations */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="relative flex-1 min-w-[200px] w-full sm:max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by asset code, location, media type, mounter..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
          {searchQuery && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-1 top-1/2 transform -translate-y-1/2 h-7 w-7"
              onClick={() => setSearchQuery("")}
            >
              <X className="h-3 w-3" />
            </Button>
          )}
        </div>
        <div className="flex items-center gap-2">
          {filteredAssets.length !== assets.length && (
            <Badge variant="outline">{filteredAssets.length} of {assets.length} shown</Badge>
          )}
          <BulkOperationsDialog assets={assets} onUpdate={onUpdate} />
        </div>
      </div>
      
      <div className="grid gap-4">
        {filteredAssets.map((asset) => {
          const normalizedStatus = normalizeCampaignAssetStatus(asset.status);
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
                        value={normalizedStatus}
                        onValueChange={(value) => handleStatusChange(asset.id, value as CampaignAssetStatus)}
                      >
                        <SelectTrigger className="w-40">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {statusOptions.map((opt) => (
                            <SelectItem key={opt.value} value={opt.value}>
                              {opt.label}
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
                  ) : null}
                  {/* Upload & Manage Photos - available to ALL users */}
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => navigate(`/mobile/upload/${campaignId}/${asset.id}`)}
                    >
                      <Upload className="h-4 w-4 mr-2" />
                      Upload
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => navigate(`/admin/operations/${campaignId}/assets/${asset.asset_id}`)}
                    >
                      📸 Manage Photos
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
          );
        })}

        {filteredAssets.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            {searchQuery ? `No assets match "${searchQuery}"` : "No assets in this campaign"}
          </div>
        )}
      </div>

      {/* Assign Dialog */}
      <Dialog open={assignDialogOpen} onOpenChange={setAssignDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign Mounter</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Select Operations User</Label>
              {loadingUsers ? (
                <p className="text-sm text-muted-foreground">Loading users...</p>
              ) : users.length === 0 ? (
                <p className="text-sm text-muted-foreground">No operations users found. Add users with 'operations' role.</p>
              ) : (
                <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select user" />
                  </SelectTrigger>
                  <SelectContent>
                    {users.map((user) => (
                      <SelectItem key={user.id} value={user.id}>
                        {user.username}
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

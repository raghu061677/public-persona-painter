import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { Users, RefreshCw } from "lucide-react";

interface BulkOperationsDialogProps {
  assets: any[];
  onUpdate: () => void;
}

export function BulkOperationsDialog({ assets, onUpdate }: BulkOperationsDialogProps) {
  const [open, setOpen] = useState(false);
  const [selectedAssets, setSelectedAssets] = useState<string[]>([]);
  const [operation, setOperation] = useState<'assign' | 'reassign' | 'status'>('assign');
  const [selectedUserId, setSelectedUserId] = useState("");
  const [newStatus, setNewStatus] = useState<string>("");
  const [processing, setProcessing] = useState(false);
  const [users, setUsers] = useState<Array<{ id: string; username: string }>>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);

  useEffect(() => {
    if (open) {
      fetchOperationsUsers();
    }
  }, [open]);

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

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedAssets(assets.map(a => a.id));
    } else {
      setSelectedAssets([]);
    }
  };

  const handleSelectAsset = (assetId: string, checked: boolean) => {
    if (checked) {
      setSelectedAssets([...selectedAssets, assetId]);
    } else {
      setSelectedAssets(selectedAssets.filter(id => id !== assetId));
    }
  };

  const handleBulkOperation = async () => {
    if (selectedAssets.length === 0) {
      toast({
        title: "Error",
        description: "Please select at least one asset",
        variant: "destructive",
      });
      return;
    }

    if ((operation === 'assign' || operation === 'reassign') && !selectedUserId) {
      toast({
        title: "Error",
        description: "Please select a user",
        variant: "destructive",
      });
      return;
    }

    if (operation === 'status' && !newStatus) {
      toast({
        title: "Error",
        description: "Please select status",
        variant: "destructive",
      });
      return;
    }

    const selectedUser = users.find(u => u.id === selectedUserId);
    if ((operation === 'assign' || operation === 'reassign') && !selectedUser) {
      toast({
        title: "Error",
        description: "Invalid user selection",
        variant: "destructive",
      });
      return;
    }

    setProcessing(true);
    try {
      const updates: any = {};
      
      if (operation === 'assign' || operation === 'reassign') {
        updates.mounter_name = selectedUser!.username;
        updates.status = 'Assigned';
        updates.assigned_at = new Date().toISOString();
      } else {
        updates.status = newStatus;
      }

      const { error } = await supabase
        .from('campaign_assets')
        .update(updates)
        .in('id', selectedAssets);

      if (error) throw error;

      const actionText = operation === 'reassign' ? 'reassigned' : operation === 'assign' ? 'assigned' : 'updated';
      toast({
        title: "Success",
        description: `Successfully ${actionText} ${selectedAssets.length} asset(s)`,
      });

      setOpen(false);
      setSelectedAssets([]);
      setSelectedUserId("");
      setNewStatus("");
      onUpdate();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setProcessing(false);
    }
  };

  const statusOptions = ['Pending', 'Assigned', 'Mounted', 'PhotoUploaded', 'Verified'];

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Users className="mr-2 h-4 w-4" />
          Bulk Operations
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Bulk Operations</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6 py-4">
          {/* Operation Type */}
          <div className="space-y-2">
            <Label>Operation Type</Label>
            <Select value={operation} onValueChange={(v: any) => setOperation(v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="assign">Assign to User</SelectItem>
                <SelectItem value="reassign">Reassign to Different User</SelectItem>
                <SelectItem value="status">Update Status</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Operation Fields */}
          {(operation === 'assign' || operation === 'reassign') && (
            <div className="space-y-2">
              <Label>{operation === 'reassign' ? 'Reassign to User' : 'Assign to User'}</Label>
              {loadingUsers ? (
                <div className="text-sm text-muted-foreground">Loading users...</div>
              ) : users.length === 0 ? (
                <div className="text-sm text-muted-foreground p-3 border rounded-md bg-muted">
                  No operations users found. Please assign operations role to users first.
                </div>
              ) : (
                <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                  <SelectTrigger>
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
          )}

          {operation === 'status' && (
            <div className="space-y-2">
              <Label>New Status</Label>
              <Select value={newStatus} onValueChange={setNewStatus}>
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
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
          )}

          {/* Asset Selection */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Select Assets ({selectedAssets.length} selected)</Label>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleSelectAll(selectedAssets.length !== assets.length)}
              >
                {selectedAssets.length === assets.length ? "Deselect All" : "Select All"}
              </Button>
            </div>
            
            <div className="border rounded-md p-3 max-h-60 overflow-y-auto space-y-2">
              {assets.map((asset) => (
                <div key={asset.id} className="flex items-center space-x-2">
                  <Checkbox
                    id={asset.id}
                    checked={selectedAssets.includes(asset.id)}
                    onCheckedChange={(checked) => handleSelectAsset(asset.id, checked as boolean)}
                  />
                  <label
                    htmlFor={asset.id}
                    className="text-sm flex-1 cursor-pointer"
                  >
                    {asset.asset_id} - {asset.location}, {asset.city}
                  </label>
                </div>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleBulkOperation} 
              disabled={processing || ((operation === 'assign' || operation === 'reassign') && !selectedUserId) || (operation === 'status' && !newStatus)}
            >
              {processing ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                'Apply to Selected'
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

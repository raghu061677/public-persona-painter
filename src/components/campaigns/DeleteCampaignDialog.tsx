import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { AlertTriangle, Loader2 } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface DeleteCampaignDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  campaignId: string;
  campaignName: string;
  onDeleted?: () => void;
}

export function DeleteCampaignDialog({
  open,
  onOpenChange,
  campaignId,
  campaignName,
  onDeleted,
}: DeleteCampaignDialogProps) {
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDelete = async () => {
    if (!reason.trim()) {
      setError("Please provide a reason for deletion");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error("Not authenticated");

      const { data, error: rpcError } = await supabase.rpc("soft_delete_campaign", {
        p_campaign_id: campaignId,
        p_deletion_reason: reason.trim(),
        p_deleted_by: userData.user.id,
      });

      if (rpcError) throw rpcError;

      const result = data as { success: boolean; error?: string; message?: string; assets_released?: number };

      if (!result.success) {
        setError(result.error || "Failed to delete campaign");
        return;
      }

      toast({
        title: "Campaign Deleted",
        description: `${campaignName} has been deleted. ${result.assets_released || 0} asset bookings released.`,
      });

      onOpenChange(false);
      onDeleted?.();
    } catch (err: any) {
      console.error("Delete error:", err);
      setError(err.message || "Failed to delete campaign");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            Delete Campaign
          </AlertDialogTitle>
          <AlertDialogDescription>
            This will mark the campaign <strong>"{campaignName}"</strong> as deleted.
            The campaign data will be preserved for audit purposes but will no longer appear in lists.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-4 py-4">
          {error && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label htmlFor="reason">Reason for Deletion *</Label>
            <Textarea
              id="reason"
              placeholder="e.g., Duplicate campaign, Data entry error, Client cancelled..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
            />
            <p className="text-xs text-muted-foreground">
              This reason will be logged for audit purposes.
            </p>
          </div>

          <div className="bg-muted p-3 rounded-md text-sm space-y-1">
            <p className="font-medium">Note:</p>
            <ul className="list-disc list-inside text-muted-foreground space-y-1">
              <li>Campaigns with issued invoices cannot be deleted</li>
              <li>Campaigns with recorded payments cannot be deleted</li>
              <li>Asset bookings will be released automatically</li>
            </ul>
          </div>
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault();
              handleDelete();
            }}
            disabled={loading || !reason.trim()}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Deleting...
              </>
            ) : (
              "Delete Campaign"
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

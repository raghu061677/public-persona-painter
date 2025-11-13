import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, XCircle, Clock, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface PhotoData {
  id: string;
  asset_id: string;
  campaign_id: string | null;
  client_id: string | null;
  photo_url: string;
  category: string;
  uploaded_at: string;
  approval_status: string;
  approved_by: string | null;
  approved_at: string | null;
  rejection_reason: string | null;
}

interface PhotoApprovalDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  photo: PhotoData | null;
  onApprovalChange: () => void;
}

export function PhotoApprovalDialog({
  open,
  onOpenChange,
  photo,
  onApprovalChange,
}: PhotoApprovalDialogProps) {
  const [rejectionReason, setRejectionReason] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  const handleApprove = async () => {
    if (!photo) return;

    setIsProcessing(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { error } = await supabase
        .from("media_photos")
        .update({
          approval_status: "approved",
          approved_by: user?.id,
          approved_at: new Date().toISOString(),
          rejection_reason: null,
        })
        .eq("id", photo.id);

      if (error) throw error;

      toast({
        title: "Photo approved",
        description: "Photo has been approved and will appear in reports.",
      });

      onApprovalChange();
      onOpenChange(false);
    } catch (error: any) {
      console.error("Approval error:", error);
      toast({
        title: "Approval failed",
        description: error.message || "Failed to approve photo",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!photo) return;

    if (!rejectionReason.trim()) {
      toast({
        title: "Rejection reason required",
        description: "Please provide a reason for rejecting this photo",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { error } = await supabase
        .from("media_photos")
        .update({
          approval_status: "rejected",
          approved_by: user?.id,
          approved_at: new Date().toISOString(),
          rejection_reason: rejectionReason,
        })
        .eq("id", photo.id);

      if (error) throw error;

      toast({
        title: "Photo rejected",
        description: "Photo has been rejected and will not appear in reports.",
      });

      onApprovalChange();
      onOpenChange(false);
      setRejectionReason("");
    } catch (error: any) {
      console.error("Rejection error:", error);
      toast({
        title: "Rejection failed",
        description: error.message || "Failed to reject photo",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "approved":
        return (
          <Badge variant="default" className="bg-green-600">
            <CheckCircle className="h-3 w-3 mr-1" />
            Approved
          </Badge>
        );
      case "rejected":
        return (
          <Badge variant="destructive">
            <XCircle className="h-3 w-3 mr-1" />
            Rejected
          </Badge>
        );
      default:
        return (
          <Badge variant="secondary">
            <Clock className="h-3 w-3 mr-1" />
            Pending Review
          </Badge>
        );
    }
  };

  if (!photo) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Photo Review
            {getStatusBadge(photo.approval_status)}
          </DialogTitle>
          <DialogDescription>
            Review and approve/reject this photo for inclusion in reports
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Photo Preview */}
          <div className="border rounded-lg overflow-hidden bg-muted">
            <img
              src={photo.photo_url}
              alt={`${photo.asset_id} - ${photo.category}`}
              className="w-full h-auto max-h-96 object-contain"
            />
          </div>

          {/* Photo Details */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <Label className="text-muted-foreground">Asset ID</Label>
              <p className="font-medium">{photo.asset_id}</p>
            </div>
            <div>
              <Label className="text-muted-foreground">Category</Label>
              <p className="font-medium">{photo.category}</p>
            </div>
            <div>
              <Label className="text-muted-foreground">Campaign ID</Label>
              <p className="font-medium">{photo.campaign_id || "N/A"}</p>
            </div>
            <div>
              <Label className="text-muted-foreground">Uploaded</Label>
              <p className="font-medium">
                {new Date(photo.uploaded_at).toLocaleDateString()}
              </p>
            </div>
          </div>

          {/* Rejection Reason (if exists) */}
          {photo.rejection_reason && (
            <div className="border-l-4 border-destructive bg-destructive/10 p-3 rounded">
              <Label className="text-destructive font-semibold">Rejection Reason</Label>
              <p className="text-sm mt-1">{photo.rejection_reason}</p>
            </div>
          )}

          {/* Rejection Reason Input (for pending/new rejection) */}
          {photo.approval_status === "pending" && (
            <div className="space-y-2">
              <Label htmlFor="rejectionReason">
                Rejection Reason (Optional - required only if rejecting)
              </Label>
              <Textarea
                id="rejectionReason"
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Explain why this photo is being rejected..."
                rows={3}
              />
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isProcessing}
          >
            Cancel
          </Button>
          
          {photo.approval_status === "pending" && (
            <>
              <Button
                variant="destructive"
                onClick={handleReject}
                disabled={isProcessing}
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Rejecting...
                  </>
                ) : (
                  <>
                    <XCircle className="mr-2 h-4 w-4" />
                    Reject
                  </>
                )}
              </Button>
              <Button onClick={handleApprove} disabled={isProcessing}>
                {isProcessing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Approving...
                  </>
                ) : (
                  <>
                    <CheckCircle className="mr-2 h-4 w-4" />
                    Approve
                  </>
                )}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

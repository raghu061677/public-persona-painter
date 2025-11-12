import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { CheckCircle2, XCircle } from "lucide-react";

interface ProofApprovalDialogProps {
  asset: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdate: () => void;
}

export function ProofApprovalDialog({ asset, open, onOpenChange, onUpdate }: ProofApprovalDialogProps) {
  const [comments, setComments] = useState("");
  const [processing, setProcessing] = useState(false);

  const handleApproval = async (approved: boolean) => {
    setProcessing(true);
    try {
      const { error } = await supabase
        .from('campaign_assets')
        .update({
          status: approved ? 'Verified' : 'Mounted',
          photos: {
            ...asset.photos,
            approvalStatus: approved ? 'approved' : 'rejected',
            approvalComments: comments,
            approvedAt: new Date().toISOString(),
          }
        })
        .eq('id', asset.id);

      if (error) throw error;

      toast({
        title: approved ? "Proof Approved" : "Proof Rejected",
        description: approved 
          ? "Asset has been verified successfully"
          : "Mounter will be notified to re-upload photos",
      });

      onOpenChange(false);
      setComments("");
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

  const photoTypes = [
    { key: 'newspaperPhoto', label: 'Newspaper Photo' },
    { key: 'geoTaggedPhoto', label: 'Geo-Tagged Photo' },
    { key: 'trafficPhoto1', label: 'Traffic View 1' },
    { key: 'trafficPhoto2', label: 'Traffic View 2' },
  ];

  const photos = asset?.photos || {};

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Review & Approve Proof Photos</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Asset Info */}
          <div className="p-4 bg-muted rounded-md">
            <h3 className="font-semibold mb-2">{asset?.asset_id}</h3>
            <p className="text-sm text-muted-foreground">
              {asset?.location}, {asset?.area}, {asset?.city}
            </p>
          </div>

          {/* Photos Grid */}
          <div className="grid grid-cols-2 gap-4">
            {photoTypes.map((photoType) => (
              <div key={photoType.key} className="space-y-2">
                <Label>{photoType.label}</Label>
                {photos[photoType.key]?.url ? (
                  <img
                    src={photos[photoType.key].url}
                    alt={photoType.label}
                    className="w-full h-48 object-cover rounded-md border"
                  />
                ) : (
                  <div className="w-full h-48 bg-muted rounded-md flex items-center justify-center">
                    <p className="text-sm text-muted-foreground">No photo uploaded</p>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Comments */}
          <div className="space-y-2">
            <Label>Comments (Optional)</Label>
            <Textarea
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              placeholder="Add any comments or feedback..."
              rows={3}
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => handleApproval(false)}
              disabled={processing}
            >
              <XCircle className="mr-2 h-4 w-4" />
              Reject
            </Button>
            <Button
              onClick={() => handleApproval(true)}
              disabled={processing}
            >
              <CheckCircle2 className="mr-2 h-4 w-4" />
              Approve & Verify
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

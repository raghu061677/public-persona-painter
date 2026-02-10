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
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { Loader2 } from "lucide-react";

interface ReleaseHoldDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  holdId: string;
  assetLabel: string;
  clientName?: string | null;
  onSuccess?: () => void;
}

export function ReleaseHoldDialog({
  open,
  onOpenChange,
  holdId,
  assetLabel,
  clientName,
  onSuccess,
}: ReleaseHoldDialogProps) {
  const { toast } = useToast();
  const [releasing, setReleasing] = useState(false);

  const handleRelease = async () => {
    setReleasing(true);
    try {
      const { error } = await supabase
        .from("asset_holds")
        .update({ status: "RELEASED" })
        .eq("id", holdId);

      if (error) throw error;

      toast({ title: "Hold released", description: `${assetLabel} is now available` });
      onOpenChange(false);
      onSuccess?.();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setReleasing(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Release Hold?</AlertDialogTitle>
          <AlertDialogDescription>
            Release the hold on <strong>{assetLabel}</strong>
            {clientName ? ` (held for ${clientName})` : ""}? The asset will become available for booking.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={releasing}>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={handleRelease} disabled={releasing}>
            {releasing && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Release Hold
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

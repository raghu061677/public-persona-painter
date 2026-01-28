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
import { format } from "date-fns";

interface ApplyDatesToAssetsDialogProps {
  open: boolean;
  onClose: () => void;
  onApply: () => void;
  onSkip: () => void;
  startDate: Date;
  endDate: Date;
  assetCount: number;
}

export function ApplyDatesToAssetsDialog({
  open,
  onClose,
  onApply,
  onSkip,
  startDate,
  endDate,
  assetCount,
}: ApplyDatesToAssetsDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onClose}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Update Asset Dates</AlertDialogTitle>
          <AlertDialogDescription>
            You changed the campaign dates to{" "}
            <strong>{format(startDate, "dd MMM yyyy")}</strong> -{" "}
            <strong>{format(endDate, "dd MMM yyyy")}</strong>.
            <br /><br />
            Would you like to apply these new dates to all {assetCount} asset(s)?
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onSkip}>
            Keep Individual Dates
          </AlertDialogCancel>
          <AlertDialogAction onClick={onApply}>
            Apply to All Assets
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

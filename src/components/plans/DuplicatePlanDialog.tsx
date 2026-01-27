import { useState } from "react";
import { useNavigate } from "react-router-dom";
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
import { Copy, Loader2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { duplicatePlan } from "@/lib/plans/duplicatePlan";

interface DuplicatePlanDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  plan: {
    id: string;
    plan_name: string;
    client_name: string;
  };
  onSuccess?: () => void;
}

export function DuplicatePlanDialog({
  open,
  onOpenChange,
  plan,
  onSuccess,
}: DuplicatePlanDialogProps) {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const handleDuplicate = async () => {
    setLoading(true);
    try {
      const result = await duplicatePlan(plan.id);

      if (result.success && result.newPlanId) {
        toast({
          title: "Plan Duplicated",
          description: `Created ${result.newPlanId} as a copy of ${plan.id}`,
        });

        onOpenChange(false);
        onSuccess?.();

        // Navigate to the new plan's edit page so user can set dates
        navigate(`/admin/plans/edit/${result.newPlanId}`);
      } else {
        toast({
          title: "Duplication Failed",
          description: result.error || "Failed to duplicate plan",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <Copy className="h-5 w-5 text-primary" />
            Duplicate Plan
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-3">
              <p>
                Create a copy of <strong>{plan.plan_name}</strong> with the same assets and rates?
              </p>
              <div className="bg-muted p-3 rounded-md text-sm space-y-1">
                <p><strong>What will be copied:</strong></p>
                <ul className="list-disc list-inside text-muted-foreground">
                  <li>Client: {plan.client_name}</li>
                  <li>All selected media assets</li>
                  <li>Asset pricing (rates, printing, mounting)</li>
                  <li>Notes and configuration</li>
                </ul>
              </div>
              <div className="bg-amber-50 dark:bg-amber-950/30 p-3 rounded-md text-sm">
                <p className="text-amber-800 dark:text-amber-200">
                  <strong>Note:</strong> The new plan will have a fresh ID and <strong>Draft</strong> status. 
                  You'll be redirected to set new dates.
                </p>
              </div>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDuplicate}
            disabled={loading}
            className="bg-primary"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Duplicating...
              </>
            ) : (
              <>
                <Copy className="mr-2 h-4 w-4" />
                Duplicate Plan
              </>
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

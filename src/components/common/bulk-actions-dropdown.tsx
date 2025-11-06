import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { Progress } from "@/components/ui/progress";
import { ChevronDown, Trash2, Download, Edit, FolderPlus } from "lucide-react";
import { toast } from "@/hooks/use-toast";

export interface BulkAction {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  variant?: "default" | "destructive";
  requiresConfirmation?: boolean;
  confirmTitle?: string;
  confirmDescription?: string;
}

interface BulkActionsDropdownProps {
  selectedCount: number;
  actions: BulkAction[];
  onAction: (actionId: string) => Promise<void>;
  disabled?: boolean;
}

export function BulkActionsDropdown({
  selectedCount,
  actions,
  onAction,
  disabled = false,
}: BulkActionsDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState<BulkAction | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);

  const handleActionClick = async (action: BulkAction) => {
    setIsOpen(false);
    
    if (action.requiresConfirmation) {
      setConfirmAction(action);
    } else {
      await executeAction(action);
    }
  };

  const executeAction = async (action: BulkAction) => {
    setIsProcessing(true);
    setProgress(0);

    try {
      // Simulate progress for better UX
      const progressInterval = setInterval(() => {
        setProgress((prev) => Math.min(prev + 10, 90));
      }, 100);

      await onAction(action.id);

      clearInterval(progressInterval);
      setProgress(100);

      toast({
        title: "Success",
        description: `${action.label} completed successfully`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: `Failed to ${action.label.toLowerCase()}`,
        variant: "destructive",
      });
    } finally {
      setTimeout(() => {
        setIsProcessing(false);
        setProgress(0);
      }, 500);
    }
  };

  const handleConfirm = async () => {
    if (confirmAction) {
      await executeAction(confirmAction);
      setConfirmAction(null);
    }
  };

  return (
    <>
      <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            disabled={disabled || selectedCount === 0 || isProcessing}
            className="gap-2"
          >
            Bulk Actions ({selectedCount})
            <ChevronDown className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-56">
          {actions.map((action, index) => (
            <div key={action.id}>
              {index > 0 && action.variant === "destructive" && (
                <DropdownMenuSeparator />
              )}
              <DropdownMenuItem
                onClick={() => handleActionClick(action)}
                className={
                  action.variant === "destructive"
                    ? "text-destructive focus:text-destructive"
                    : ""
                }
              >
                <action.icon className="h-4 w-4 mr-2" />
                {action.label}
              </DropdownMenuItem>
            </div>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      {isProcessing && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="bg-card p-6 rounded-lg shadow-lg w-96 space-y-4">
            <h3 className="font-semibold text-lg">Processing...</h3>
            <Progress value={progress} className="w-full" />
            <p className="text-sm text-muted-foreground">
              Processing {selectedCount} item{selectedCount !== 1 ? "s" : ""}
            </p>
          </div>
        </div>
      )}

      <AlertDialog
        open={!!confirmAction}
        onOpenChange={() => setConfirmAction(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmAction?.confirmTitle || "Are you sure?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmAction?.confirmDescription ||
                `This will affect ${selectedCount} selected item${
                  selectedCount !== 1 ? "s" : ""
                }. This action cannot be undone.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirm}
              className={
                confirmAction?.variant === "destructive"
                  ? "bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  : ""
              }
            >
              Continue
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

// Common bulk actions for reuse
export const commonBulkActions = {
  delete: {
    id: "delete",
    label: "Delete Selected",
    icon: Trash2,
    variant: "destructive" as const,
    requiresConfirmation: true,
    confirmTitle: "Delete Items?",
    confirmDescription: "This will permanently delete the selected items. This action cannot be undone.",
  },
  export: {
    id: "export",
    label: "Export to Excel",
    icon: Download,
    variant: "default" as const,
  },
  changeStatus: {
    id: "changeStatus",
    label: "Change Status",
    icon: Edit,
    variant: "default" as const,
  },
  addToPlan: {
    id: "addToPlan",
    label: "Add to Plan",
    icon: FolderPlus,
    variant: "default" as const,
  },
};

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { FileText } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface TemplatesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// Deprecated: This component has been replaced by the Plan Templates page
// Users should navigate to /admin/plan-templates instead
export function TemplatesDialog({ open, onOpenChange }: TemplatesDialogProps) {
  const navigate = useNavigate();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Plan Templates
          </DialogTitle>
          <DialogDescription>
            Template management has moved to a dedicated page
          </DialogDescription>
        </DialogHeader>
        <div className="text-center py-6 space-y-4">
          <p className="text-muted-foreground">
            Access templates from the sidebar menu under Plans → Plan Templates
          </p>
          <Button onClick={() => {
            onOpenChange(false);
            navigate("/admin/plan-templates");
          }}>
            Go to Plan Templates
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

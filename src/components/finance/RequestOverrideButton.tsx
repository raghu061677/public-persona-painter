/**
 * Reusable component: "Request Admin Override" button + modal
 * Used in finance screens when a locked-period error occurs.
 */
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/contexts/CompanyContext";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Shield, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface Props {
  scopeTable: string;
  scopeRecordId: string;
  scopeAction: "INSERT" | "UPDATE" | "DELETE";
  payload?: Record<string, any>;
  onSuccess?: () => void;
  variant?: "default" | "outline" | "ghost" | "destructive";
  size?: "default" | "sm" | "lg" | "icon";
  className?: string;
}

export function RequestOverrideButton({
  scopeTable,
  scopeRecordId,
  scopeAction,
  payload,
  onSuccess,
  variant = "outline",
  size = "sm",
  className,
}: Props) {
  const { company } = useCompany();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit() {
    if (!reason.trim()) {
      toast.error("Reason is required");
      return;
    }
    if (!company?.id) return;

    setSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke("finance-request-override", {
        body: {
          company_id: company.id,
          scope_table: scopeTable,
          scope_record_id: scopeRecordId,
          scope_action: scopeAction,
          reason: reason.trim(),
          payload: payload || undefined,
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast.success("Override request submitted. Awaiting admin approval.");
      setOpen(false);
      setReason("");
      onSuccess?.();
    } catch (err: any) {
      toast.error(err.message || "Failed to submit request");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <Button variant={variant} size={size} className={className} onClick={() => setOpen(true)}>
        <Shield className="h-3.5 w-3.5 mr-1" />
        Request Admin Override
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Request Override for Locked Period</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <Label className="text-xs text-muted-foreground">Table</Label>
                <Input value={scopeTable} disabled className="font-mono text-xs" />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Action</Label>
                <Input value={scopeAction} disabled className="font-mono text-xs" />
              </div>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Record ID</Label>
              <Input value={scopeRecordId} disabled className="font-mono text-xs" />
            </div>
            <div>
              <Label>Reason for Override <span className="text-destructive">*</span></Label>
              <Textarea
                placeholder="Explain why this locked record needs to be modified..."
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={submitting || !reason.trim()}>
              {submitting && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
              Submit Request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

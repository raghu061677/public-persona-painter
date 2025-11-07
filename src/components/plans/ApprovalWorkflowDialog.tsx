import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, XCircle, Clock, User } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Approval {
  id: string;
  approval_level: string;
  required_role: string;
  status: string;
  approver_id: string | null;
  comments: string | null;
  approved_at: string | null;
  created_at: string;
}

interface ApprovalWorkflowDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  planId: string;
  planName: string;
  onApprovalComplete?: () => void;
}

export function ApprovalWorkflowDialog({
  open,
  onOpenChange,
  planId,
  planName,
  onApprovalComplete,
}: ApprovalWorkflowDialogProps) {
  const [approvals, setApprovals] = useState<Approval[]>([]);
  const [selectedApproval, setSelectedApproval] = useState<Approval | null>(null);
  const [comments, setComments] = useState("");
  const [loading, setLoading] = useState(false);

  const loadApprovals = async () => {
    const { data, error } = await supabase
      .from("plan_approvals")
      .select("*")
      .eq("plan_id", planId)
      .order("approval_level");

    if (error) {
      toast.error("Failed to load approvals");
      return;
    }

    setApprovals(data || []);
  };

  const handleApprove = async (approvalId: string, status: 'approved' | 'rejected') => {
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc("process_plan_approval", {
        p_approval_id: approvalId,
        p_status: status,
        p_comments: comments || null,
      }) as { data: any; error: any };

      if (error) throw error;

      const result = data as any;

      // Send notification
      await supabase.functions.invoke("send-approval-notification", {
        body: {
          planId,
          approvalLevel: selectedApproval?.approval_level,
          requiredRole: selectedApproval?.required_role,
          notificationType: status === 'approved' 
            ? (result?.plan_status === 'Approved' ? 'approval_completed' : 'approval_request')
            : 'approval_rejected',
        },
      });

      toast.success(result?.message || 'Approval processed');
      setComments("");
      setSelectedApproval(null);
      await loadApprovals();
      onApprovalComplete?.();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved':
        return <CheckCircle2 className="h-5 w-5 text-green-500" />;
      case 'rejected':
        return <XCircle className="h-5 w-5 text-red-500" />;
      default:
        return <Clock className="h-5 w-5 text-yellow-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return <Badge className="bg-green-500/10 text-green-700">Approved</Badge>;
      case 'rejected':
        return <Badge className="bg-red-500/10 text-red-700">Rejected</Badge>;
      default:
        return <Badge className="bg-yellow-500/10 text-yellow-700">Pending</Badge>;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Approval Workflow - {planName}</DialogTitle>
          <DialogDescription>
            Track and manage multi-level approvals for this plan
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {approvals.map((approval) => (
            <div
              key={approval.id}
              className="border rounded-lg p-4 space-y-3"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {getStatusIcon(approval.status)}
                  <div>
                    <p className="font-medium">Level {approval.approval_level}</p>
                    <p className="text-sm text-muted-foreground capitalize">
                      {approval.required_role} Approval
                    </p>
                  </div>
                </div>
                {getStatusBadge(approval.status)}
              </div>

              {approval.status === 'pending' && !selectedApproval ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSelectedApproval(approval);
                    loadApprovals();
                  }}
                >
                  <User className="h-4 w-4 mr-2" />
                  Take Action
                </Button>
              ) : selectedApproval?.id === approval.id ? (
                <div className="space-y-3 bg-muted/50 p-3 rounded">
                  <Textarea
                    placeholder="Add comments (optional)"
                    value={comments}
                    onChange={(e) => setComments(e.target.value)}
                    className="min-h-[80px]"
                  />
                  <div className="flex gap-2">
                    <Button
                      onClick={() => handleApprove(approval.id, 'approved')}
                      disabled={loading}
                      className="flex-1"
                    >
                      <CheckCircle2 className="h-4 w-4 mr-2" />
                      Approve
                    </Button>
                    <Button
                      onClick={() => handleApprove(approval.id, 'rejected')}
                      disabled={loading}
                      variant="destructive"
                      className="flex-1"
                    >
                      <XCircle className="h-4 w-4 mr-2" />
                      Reject
                    </Button>
                    <Button
                      onClick={() => {
                        setSelectedApproval(null);
                        setComments("");
                      }}
                      variant="outline"
                      disabled={loading}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : null}

              {approval.comments && (
                <div className="text-sm bg-muted p-2 rounded">
                  <p className="font-medium">Comments:</p>
                  <p className="text-muted-foreground">{approval.comments}</p>
                </div>
              )}

              {approval.approved_at && (
                <p className="text-xs text-muted-foreground">
                  {approval.status === 'approved' ? 'Approved' : 'Rejected'} on{' '}
                  {new Date(approval.approved_at).toLocaleDateString('en-IN')}
                </p>
              )}
            </div>
          ))}

          {approvals.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <p>No approval workflow configured for this plan.</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

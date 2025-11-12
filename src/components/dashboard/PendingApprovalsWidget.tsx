import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { CheckCircle2, XCircle, FileText, Clock, AlertCircle } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { formatCurrency } from "@/utils/mediaAssets";
import { formatDate } from "@/utils/plans";

interface PendingApproval {
  id: string;
  plan_id: string;
  approval_level: string;
  required_role: string;
  status: string;
  created_at: string;
  plans: {
    id: string;
    plan_name: string;
    client_name: string;
    grand_total: number;
    start_date: string;
    end_date: string;
  };
}

export function PendingApprovalsWidget() {
  const navigate = useNavigate();
  const [approvals, setApprovals] = useState<PendingApproval[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedApproval, setSelectedApproval] = useState<PendingApproval | null>(null);
  const [actionType, setActionType] = useState<"approve" | "reject" | null>(null);
  const [comments, setComments] = useState("");
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    fetchPendingApprovals();

    // Subscribe to approval changes
    const channel = supabase
      .channel('pending-approvals-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'plan_approvals'
        },
        () => {
          fetchPendingApprovals();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchPendingApprovals = async () => {
    setLoading(true);
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setLoading(false);
      return;
    }

    // Get user roles
    const { data: userRoles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id);

    if (!userRoles || userRoles.length === 0) {
      setLoading(false);
      return;
    }

    const roles = userRoles.map(ur => ur.role);

    const { data, error } = await supabase
      .from("plan_approvals")
      .select(`
        *,
        plans (
          id,
          plan_name,
          client_name,
          grand_total,
          start_date,
          end_date
        )
      `)
      .eq("status", "pending")
      .in("required_role", roles)
      .order("created_at", { ascending: false });

    if (!error && data) {
      setApprovals(data as PendingApproval[]);
    }
    setLoading(false);
  };

  const handleAction = (approval: PendingApproval, type: "approve" | "reject") => {
    setSelectedApproval(approval);
    setActionType(type);
    setComments("");
  };

  const processApproval = async () => {
    if (!selectedApproval || !actionType) return;

    setProcessing(true);
    try {
      const status = actionType === "approve" ? "approved" : "rejected";
      
      await supabase.rpc("process_plan_approval", {
        p_approval_id: selectedApproval.id,
        p_status: status,
        p_comments: comments || null,
      });

      toast({
        title: "Success",
        description: `Plan ${actionType === "approve" ? "approved" : "rejected"} successfully`,
        variant: actionType === "approve" ? "default" : "destructive",
      });

      setSelectedApproval(null);
      setActionType(null);
      setComments("");
      fetchPendingApprovals();
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

  if (loading) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-lg font-semibold">Pending Approvals</CardTitle>
          <Clock className="h-5 w-5 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-lg font-semibold">Pending Approvals</CardTitle>
          <Badge variant="outline" className="bg-orange-100 text-orange-800 border-orange-300">
            {approvals.length} Pending
          </Badge>
        </CardHeader>
        <CardContent>
          {approvals.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <CheckCircle2 className="h-12 w-12 text-green-600 mb-3" />
              <p className="text-sm font-medium">All caught up!</p>
              <p className="text-xs text-muted-foreground mt-1">
                No pending approvals at the moment
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {approvals.slice(0, 5).map((approval) => (
                <div
                  key={approval.id}
                  className="flex items-start justify-between gap-3 p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <FileText className="h-4 w-4 text-primary flex-shrink-0" />
                      <h4 
                        className="font-medium text-sm truncate cursor-pointer hover:text-primary"
                        onClick={() => navigate(`/admin/plans/${approval.plan_id}`)}
                      >
                        {approval.plans.plan_name}
                      </h4>
                    </div>
                    <p className="text-xs text-muted-foreground mb-2">
                      Client: {approval.plans.client_name}
                    </p>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span className="font-semibold text-primary">
                        {formatCurrency(approval.plans.grand_total)}
                      </span>
                      <span>Level: {approval.approval_level}</span>
                    </div>
                  </div>
                  <div className="flex gap-1 flex-shrink-0">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 w-8 p-0 text-green-600 hover:text-green-700 hover:bg-green-50"
                      onClick={() => handleAction(approval, "approve")}
                    >
                      <CheckCircle2 className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                      onClick={() => handleAction(approval, "reject")}
                    >
                      <XCircle className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
              {approvals.length > 5 && (
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={() => navigate("/admin/plans?status=Sent")}
                >
                  View All {approvals.length} Approvals
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Action Dialog */}
      <Dialog open={!!selectedApproval} onOpenChange={() => setSelectedApproval(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {actionType === "approve" ? "Approve Plan" : "Reject Plan"}
            </DialogTitle>
          </DialogHeader>
          {selectedApproval && (
            <div className="space-y-4">
              <div className="rounded-lg bg-muted p-4 space-y-2">
                <h4 className="font-semibold text-sm">{selectedApproval.plans.plan_name}</h4>
                <p className="text-xs text-muted-foreground">
                  Client: {selectedApproval.plans.client_name}
                </p>
                <p className="text-sm font-semibold text-primary">
                  Amount: {formatCurrency(selectedApproval.plans.grand_total)}
                </p>
                <p className="text-xs text-muted-foreground">
                  Period: {formatDate(selectedApproval.plans.start_date)} - {formatDate(selectedApproval.plans.end_date)}
                </p>
              </div>

              <div>
                <Label>
                  {actionType === "approve" ? "Approval Comments (Optional)" : "Rejection Reason *"}
                </Label>
                <Textarea
                  value={comments}
                  onChange={(e) => setComments(e.target.value)}
                  placeholder={
                    actionType === "approve" 
                      ? "Add any comments..." 
                      : "Please provide a reason for rejection..."
                  }
                  rows={3}
                  className="mt-1.5"
                />
              </div>

              {actionType === "reject" && !comments.trim() && (
                <div className="flex items-center gap-2 text-xs text-amber-600 bg-amber-50 p-2 rounded">
                  <AlertCircle className="h-4 w-4 flex-shrink-0" />
                  <span>Rejection reason is required</span>
                </div>
              )}

              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => setSelectedApproval(null)}
                  disabled={processing}
                >
                  Cancel
                </Button>
                <Button
                  onClick={processApproval}
                  disabled={processing || (actionType === "reject" && !comments.trim())}
                  className={
                    actionType === "approve"
                      ? "bg-green-600 hover:bg-green-700"
                      : ""
                  }
                  variant={actionType === "reject" ? "destructive" : "default"}
                >
                  {processing ? (
                    <div className="flex items-center gap-2">
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                      Processing...
                    </div>
                  ) : actionType === "approve" ? (
                    <>
                      <CheckCircle2 className="h-4 w-4 mr-2" />
                      Approve
                    </>
                  ) : (
                    <>
                      <XCircle className="h-4 w-4 mr-2" />
                      Reject
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

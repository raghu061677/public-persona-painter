import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { CheckCircle2, XCircle, Clock, User, AlertTriangle, ArrowRight } from "lucide-react";
import { formatDate } from "@/utils/plans";

interface ApprovalRecord {
  id: string;
  approval_level: string;
  required_role: string;
  status: string;
  approver_id: string | null;
  approved_at: string | null;
  comments: string | null;
  created_at: string;
  approverUsername?: string;
}

interface ApprovalHistoryTimelineProps {
  planId: string;
}

const getLevelLabel = (level: string) => {
  switch (level) {
    case "L1": return "Level 1 — Sales";
    case "L2": return "Level 2 — Finance";
    case "L3": return "Level 3 — Management";
    default: return level;
  }
};

const getStatusIcon = (status: string) => {
  switch (status) {
    case "approved":
      return <CheckCircle2 className="h-5 w-5 text-green-600" />;
    case "rejected":
      return <XCircle className="h-5 w-5 text-red-600" />;
    case "pending":
      return <Clock className="h-5 w-5 text-orange-500 animate-pulse" />;
    default:
      return <Clock className="h-5 w-5 text-muted-foreground" />;
  }
};

export function ApprovalHistoryTimeline({ planId }: ApprovalHistoryTimelineProps) {
  const [approvals, setApprovals] = useState<ApprovalRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchApprovalHistory();
  }, [planId]);

  const fetchApprovalHistory = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("plan_approvals")
      .select("*")
      .eq("plan_id", planId)
      .order("approval_level", { ascending: true });

    if (!error && data) {
      const approvalsWithUsers = await Promise.all(
        data.map(async (approval) => {
          if (approval.approver_id) {
            const { data: profile } = await supabase
              .from("profiles")
              .select("username")
              .eq("id", approval.approver_id)
              .single();
            return { ...approval, approverUsername: profile?.username || "Unknown User" };
          }
          return approval;
        })
      );
      setApprovals(approvalsWithUsers);
    }
    setLoading(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (approvals.length === 0) {
    return (
      <p className="text-sm text-muted-foreground text-center py-6">
        No approval workflow has been initiated for this plan yet.
      </p>
    );
  }

  const rejected = approvals.find(a => a.status === "rejected");
  const currentPending = approvals.find(a => a.status === "pending");
  const allApproved = approvals.every(a => a.status === "approved");

  return (
    <div className="space-y-4">
      {/* Summary banner */}
      {rejected && (
        <div className="flex items-start gap-3 rounded-lg border border-red-300 bg-red-50 p-4">
          <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5 shrink-0" />
          <div>
            <p className="font-semibold text-sm text-red-800">Plan Rejected at {getLevelLabel(rejected.approval_level)}</p>
            {rejected.comments && (
              <p className="text-sm text-red-700 mt-1">Reason: {rejected.comments}</p>
            )}
            {rejected.approverUsername && (
              <p className="text-xs text-red-600 mt-1">
                By {rejected.approverUsername} • {rejected.approved_at ? formatDate(rejected.approved_at) : ""}
              </p>
            )}
          </div>
        </div>
      )}

      {!rejected && currentPending && (
        <div className="flex items-center gap-3 rounded-lg border border-orange-300 bg-orange-50 p-3">
          <ArrowRight className="h-4 w-4 text-orange-600 shrink-0" />
          <p className="text-sm text-orange-800 font-medium">
            Awaiting approval: {getLevelLabel(currentPending.approval_level)} ({currentPending.required_role})
          </p>
        </div>
      )}

      {allApproved && (
        <div className="flex items-center gap-3 rounded-lg border border-green-300 bg-green-50 p-3">
          <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0" />
          <p className="text-sm text-green-800 font-medium">All approval levels completed</p>
        </div>
      )}

      {/* Timeline */}
      <div className="space-y-0">
        {approvals.map((approval, index) => (
          <div key={approval.id} className="flex gap-4">
            <div className="flex flex-col items-center">
              <div className={`flex h-9 w-9 items-center justify-center rounded-full border-2 bg-background ${
                approval.status === "pending" ? "border-orange-400" :
                approval.status === "approved" ? "border-green-400" :
                approval.status === "rejected" ? "border-red-400" : "border-border"
              }`}>
                {getStatusIcon(approval.status)}
              </div>
              {index < approvals.length - 1 && (
                <div className={`w-0.5 flex-1 min-h-[24px] ${
                  approval.status === "approved" ? "bg-green-300" : "bg-border"
                }`} />
              )}
            </div>

            <div className="flex-1 pb-5 -mt-0.5">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <h4 className="font-medium text-sm">{getLevelLabel(approval.approval_level)}</h4>
                <Badge variant="outline" className={
                  approval.status === "approved" ? "bg-green-100 text-green-800 border-green-300" :
                  approval.status === "rejected" ? "bg-red-100 text-red-800 border-red-300" :
                  approval.status === "pending" ? "bg-orange-100 text-orange-800 border-orange-300" : ""
                }>
                  {approval.status.charAt(0).toUpperCase() + approval.status.slice(1)}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">Role: {approval.required_role}</p>

              {approval.status !== "pending" && (
                <div className="flex items-center gap-2 mt-2">
                  <Avatar className="h-5 w-5">
                    <AvatarFallback className="text-[10px] bg-muted">
                      {approval.approverUsername?.charAt(0).toUpperCase() || <User className="h-3 w-3" />}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-xs">{approval.approverUsername || "Unknown"}</span>
                  <span className="text-xs text-muted-foreground">
                    • {approval.approved_at ? formatDate(approval.approved_at) : ""}
                  </span>
                </div>
              )}

              {approval.comments && (
                <div className="mt-2 rounded bg-muted/50 p-2">
                  <p className="text-xs">{approval.comments}</p>
                </div>
              )}

              {approval.status === "pending" && (
                <p className="text-xs text-muted-foreground mt-1">
                  Waiting for {approval.required_role} approval
                </p>
              )}
            </div>
          </div>
        ))}
      </div>

      <p className="text-[11px] text-muted-foreground">
        Workflow created: {approvals[0]?.created_at ? formatDate(approvals[0].created_at) : "—"}
      </p>
    </div>
  );
}

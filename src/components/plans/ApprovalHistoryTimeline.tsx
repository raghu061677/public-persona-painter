import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { CheckCircle2, XCircle, Clock, User } from "lucide-react";
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
      // Fetch usernames for approvers
      const approvalsWithUsers = await Promise.all(
        data.map(async (approval) => {
          if (approval.approver_id) {
            const { data: profile } = await supabase
              .from("profiles")
              .select("username")
              .eq("id", approval.approver_id)
              .single();
            
            return {
              ...approval,
              approverUsername: profile?.username || "Unknown User",
            };
          }
          return approval;
        })
      );
      setApprovals(approvalsWithUsers);
    }
    setLoading(false);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "approved":
        return <CheckCircle2 className="h-5 w-5 text-green-600" />;
      case "rejected":
        return <XCircle className="h-5 w-5 text-red-600" />;
      case "pending":
        return <Clock className="h-5 w-5 text-orange-600" />;
      default:
        return <Clock className="h-5 w-5 text-gray-400" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "approved":
        return <Badge className="bg-green-100 text-green-800 border-green-300">Approved</Badge>;
      case "rejected":
        return <Badge className="bg-red-100 text-red-800 border-red-300">Rejected</Badge>;
      case "pending":
        return <Badge className="bg-orange-100 text-orange-800 border-orange-300">Pending</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getLevelLabel = (level: string) => {
    switch (level) {
      case "L1":
        return "Level 1 - Sales";
      case "L2":
        return "Level 2 - Finance";
      case "L3":
        return "Level 3 - Management";
      default:
        return level;
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Approval History</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (approvals.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Approval History</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-8">
            No approval workflow has been initiated for this plan yet.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Approval History</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {approvals.map((approval, index) => (
            <div key={approval.id} className="flex gap-4">
              {/* Timeline Line */}
              <div className="flex flex-col items-center">
                <div className="flex h-10 w-10 items-center justify-center rounded-full border-2 bg-background">
                  {getStatusIcon(approval.status)}
                </div>
                {index < approvals.length - 1 && (
                  <div className="h-full w-0.5 bg-border mt-2" />
                )}
              </div>

              {/* Content */}
              <div className="flex-1 pb-6">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h4 className="font-semibold text-sm">
                      {getLevelLabel(approval.approval_level)}
                    </h4>
                    <p className="text-xs text-muted-foreground">
                      Required Role: {approval.required_role}
                    </p>
                  </div>
                  {getStatusBadge(approval.status)}
                </div>

                {approval.status !== "pending" && (
                  <>
                    <div className="flex items-center gap-2 mt-3 mb-2">
                      <Avatar className="h-6 w-6">
                        <AvatarFallback className="text-xs bg-muted">
                          {approval.approverUsername?.charAt(0).toUpperCase() || <User className="h-3 w-3" />}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-sm font-medium">
                        {approval.approverUsername || "Unknown User"}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        • {approval.approved_at ? formatDate(approval.approved_at) : ""}
                      </span>
                    </div>

                    {approval.comments && (
                      <div className="mt-2 rounded-lg bg-muted/50 p-3">
                        <p className="text-xs text-muted-foreground mb-1">Comments:</p>
                        <p className="text-sm">{approval.comments}</p>
                      </div>
                    )}
                  </>
                )}

                {approval.status === "pending" && (
                  <div className="mt-2 text-sm text-muted-foreground">
                    Awaiting approval from {approval.required_role} role
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

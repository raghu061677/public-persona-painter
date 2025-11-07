import { supabase } from "@/integrations/supabase/client";

export async function initiatePlanApprovalWorkflow(planId: string): Promise<void> {
  try {
    await supabase.rpc("create_plan_approval_workflow", {
      p_plan_id: planId,
    });

    // Send initial approval notification
    await supabase.functions.invoke("send-approval-notification", {
      body: {
        planId,
        approvalLevel: "L1",
        requiredRole: "sales",
        notificationType: "approval_request",
      },
    });
  } catch (error) {
    console.error("Error initiating approval workflow:", error);
    throw error;
  }
}

export async function processApproval(
  approvalId: string,
  status: 'approved' | 'rejected',
  comments?: string
): Promise<any> {
  const { data, error } = await supabase.rpc("process_plan_approval", {
    p_approval_id: approvalId,
    p_status: status,
    p_comments: comments || null,
  });

  if (error) throw error;
  return data;
}

export async function getPlanApprovals(planId: string): Promise<any[]> {
  const { data, error } = await supabase
    .from("plan_approvals")
    .select("*")
    .eq("plan_id", planId)
    .order("approval_level");

  if (error) throw error;
  return data || [];
}

export async function getPendingApprovalsForUser(userId: string): Promise<any[]> {
  // Get user roles
  const { data: userRoles } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId);

  if (!userRoles || userRoles.length === 0) return [];

  const roles = userRoles.map(ur => ur.role);

  const { data, error } = await supabase
    .from("plan_approvals")
    .select("*, plans(*)")
    .eq("status", "pending")
    .in("required_role", roles);

  if (error) throw error;
  return data || [];
}

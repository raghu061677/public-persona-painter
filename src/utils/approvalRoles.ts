import { supabase } from "@/integrations/supabase/client";

/**
 * Centralized effective-role resolver for the approval system.
 * Merges roles from: user_roles, company_users, and active delegations.
 * Used by: ApprovalsQueue, PendingApprovalsWidget, ResponsiveSidebar, PlanDetail.
 */
export async function getEffectiveApprovalRoles(userId: string): Promise<string[]> {
  const roleSet = new Set<string>();

  // 1. user_roles table
  const { data: userRoles } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId);

  if (userRoles) {
    userRoles.forEach(ur => roleSet.add(ur.role));
  }

  // 2. company_users role (maps to approval roles)
  const { data: companyUsers } = await supabase
    .from("company_users")
    .select("role")
    .eq("user_id", userId);

  if (companyUsers) {
    companyUsers.forEach(cu => {
      if (cu.role) roleSet.add(cu.role);
    });
  }

  // 3. Active approval delegations
  const { data: delegations } = await supabase
    .from("approval_delegations")
    .select("role")
    .eq("delegate_id", userId)
    .eq("is_active", true)
    .gte("end_date", new Date().toISOString());

  if (delegations) {
    delegations.forEach(d => roleSet.add(d.role));
  }

  return Array.from(roleSet);
}

/**
 * Get pending approvals count for a user based on their effective roles.
 */
export async function getPendingApprovalCount(userId: string): Promise<number> {
  const roles = await getEffectiveApprovalRoles(userId);
  if (roles.length === 0) return 0;

  const { count } = await supabase
    .from("plan_approvals")
    .select("*", { count: "exact", head: true })
    .eq("status", "pending")
    .in("required_role", roles as any);

  return count || 0;
}

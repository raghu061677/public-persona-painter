import { supabase } from "@/integrations/supabase/client";
import { generatePlanCode } from "@/lib/codeGenerator";

export interface DuplicatePlanResult {
  success: boolean;
  newPlanId?: string;
  error?: string;
}

/**
 * Duplicates an existing plan with all its assets and pricing.
 * Creates a new plan with a fresh ID and Draft status.
 * 
 * Copies:
 * - Client details
 * - Plan name (with " (Copy)" suffix)
 * - All plan items with pricing
 * - Notes and configuration
 * 
 * Does NOT copy:
 * - Original plan ID
 * - Timestamps (uses new ones)
 * - Status (resets to Draft)
 * - Share tokens
 * - Approval history
 */
export async function duplicatePlan(sourcePlanId: string): Promise<DuplicatePlanResult> {
  try {
    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: "Not authenticated" };
    }

    // Fetch source plan
    const { data: sourcePlan, error: planError } = await supabase
      .from("plans")
      .select("*")
      .eq("id", sourcePlanId)
      .single();

    if (planError || !sourcePlan) {
      return { success: false, error: "Source plan not found" };
    }

    // Fetch plan items
    const { data: sourceItems, error: itemsError } = await supabase
      .from("plan_items")
      .select("*")
      .eq("plan_id", sourcePlanId);

    if (itemsError) {
      return { success: false, error: "Failed to fetch plan items" };
    }

    // Generate new plan ID
    const newPlanId = await generatePlanCode();

    // Prepare new plan data - spread source and override specific fields
    const newPlanData = {
      ...sourcePlan,
      id: newPlanId,
      plan_name: `${sourcePlan.plan_name} (Copy)`,
      // Reset dates - user will set new dates after duplication
      start_date: null as any,
      end_date: null as any,
      // Reset status
      status: "Draft" as const,
      // Reset share/approval data
      share_token: null,
      share_link_active: false,
      converted_at: null,
      converted_to_campaign_id: null,
      // Metadata
      created_by: user.id,
      created_from: `duplicate:${sourcePlanId}`,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    // Insert new plan
    const { error: insertPlanError } = await supabase
      .from("plans")
      .insert(newPlanData);

    if (insertPlanError) {
      console.error("Error creating duplicate plan:", insertPlanError);
      return { success: false, error: insertPlanError.message };
    }

    // Duplicate plan items
    if (sourceItems && sourceItems.length > 0) {
      const newItems = sourceItems.map(item => {
        // Remove id, we'll get a new one; keep all other fields
        const { id, plan_id, created_at, ...rest } = item;
        return {
          ...rest,
          plan_id: newPlanId,
          created_at: new Date().toISOString(),
        };
      });

      const { error: insertItemsError } = await supabase
        .from("plan_items")
        .insert(newItems);

      if (insertItemsError) {
        console.error("Error copying plan items:", insertItemsError);
        // Plan was created but items failed - still return success with warning
        return { 
          success: true, 
          newPlanId,
          error: "Plan created but some items may not have been copied" 
        };
      }
    }

    // Log activity
    try {
      await supabase.rpc("log_activity", {
        p_action: "duplicate",
        p_resource_type: "plan",
        p_resource_id: newPlanId,
        p_resource_name: newPlanData.plan_name,
        p_details: {
          source_plan_id: sourcePlanId,
          items_count: sourceItems?.length || 0,
        },
      });
    } catch (logError) {
      console.warn("Failed to log activity:", logError);
    }

    return { success: true, newPlanId };
  } catch (error: any) {
    console.error("Error duplicating plan:", error);
    return { success: false, error: error.message || "An unexpected error occurred" };
  }
}

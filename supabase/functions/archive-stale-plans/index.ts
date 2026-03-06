import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const body = await req.json().catch(() => ({}));
    const companyId = body.company_id as string | undefined;
    const dryRun = body.dry_run === true;

    // Build query for eligible plans:
    // 1. created_at > 30 days ago
    // 2. status NOT in approved/converted (unapproved & unconverted)
    // 3. not already archived
    // 4. no linked campaign
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - 30);
    const cutoffISO = cutoffDate.toISOString();

    let query = supabase
      .from("plans")
      .select("id, company_id, status, created_at, converted_to_campaign_id, plan_name, client_name")
      .eq("is_archived", false)
      .lt("created_at", cutoffISO)
      .not("status", "in", '("Approved","Converted")')
      .is("converted_to_campaign_id", null);

    if (companyId) {
      query = query.eq("company_id", companyId);
    }

    const { data: eligiblePlans, error: fetchError } = await query;

    if (fetchError) {
      console.error("Error fetching eligible plans:", fetchError);
      return new Response(
        JSON.stringify({ error: fetchError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!eligiblePlans || eligiblePlans.length === 0) {
      return new Response(
        JSON.stringify({ message: "No stale plans found", archived_count: 0, plans: [] }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (dryRun) {
      return new Response(
        JSON.stringify({
          dry_run: true,
          eligible_count: eligiblePlans.length,
          plans: eligiblePlans.map((p) => ({
            id: p.id,
            plan_name: p.plan_name,
            client_name: p.client_name,
            status: p.status,
            created_at: p.created_at,
            company_id: p.company_id,
          })),
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Archive eligible plans
    const now = new Date().toISOString();
    const planIds = eligiblePlans.map((p) => p.id);

    const { error: updateError } = await supabase
      .from("plans")
      .update({
        is_archived: true,
        archived_at: now,
        archived_reason: "auto_archive_stale_unapproved_plan",
      })
      .in("id", planIds);

    if (updateError) {
      console.error("Error archiving plans:", updateError);
      return new Response(
        JSON.stringify({ error: updateError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Write activity logs for each archived plan
    const activityLogs = eligiblePlans.map((p) => ({
      action: "plan_auto_archived",
      resource_type: "plan",
      resource_id: p.id,
      resource_name: p.plan_name || p.id,
      details: {
        company_id: p.company_id,
        archived_reason: "auto_archive_stale_unapproved_plan",
        archived_at: now,
        original_status: p.status,
      },
    }));

    // Insert activity logs (best-effort, don't fail the whole operation)
    const { error: logError } = await supabase
      .from("activity_logs")
      .insert(activityLogs);

    if (logError) {
      console.warn("Failed to write activity logs:", logError);
    }

    return new Response(
      JSON.stringify({
        message: `Archived ${planIds.length} stale plan(s)`,
        archived_count: planIds.length,
        plan_ids: planIds,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Unexpected error:", err);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("No authorization header");
    }

    // Verify the user's JWT token
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);
    
    if (authError || !user) {
      throw new Error("Unauthorized");
    }

    // Check if user is admin
    const { data: userRoles } = await supabaseClient
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id);

    const isAdmin = userRoles?.some(r => r.role === "admin");
    if (!isAdmin) {
      throw new Error("Only admins can view user activities");
    }

    // Get all profiles
    const { data: profiles, error: profilesError } = await supabaseClient
      .from("profiles")
      .select("id, username");

    if (profilesError) throw profilesError;

    // Get auth users for email and last sign in using admin API
    const { data: { users: authUsers }, error: usersError } = 
      await supabaseClient.auth.admin.listUsers();
    
    if (usersError) throw usersError;

    // Get activity data for each user
    const activitiesData = await Promise.all(
      (profiles || []).map(async (profile) => {
        const authUser = authUsers?.find(u => u.id === profile.id);

        // Get total actions count from activity_logs
        const { count } = await supabaseClient
          .from("activity_logs")
          .select("*", { count: "exact", head: true })
          .eq("user_id", profile.id);

        // Get recent 5 actions
        const { data: recentActions } = await supabaseClient
          .from("activity_logs")
          .select("action, resource_type, created_at")
          .eq("user_id", profile.id)
          .order("created_at", { ascending: false })
          .limit(5);

        return {
          id: profile.id,
          username: profile.username || "Unknown",
          email: authUser?.email || "",
          last_login: authUser?.last_sign_in_at || null,
          total_actions: count || 0,
          recent_actions: (recentActions || []).map(action => ({
            activity_type: action.action,
            activity_description: `${action.action} on ${action.resource_type}`,
            created_at: action.created_at,
          })),
        };
      })
    );

    return new Response(JSON.stringify({ data: activitiesData }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

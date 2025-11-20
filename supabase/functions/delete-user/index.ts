import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Initialize Supabase client with service role key
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Verify authentication
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Invalid authentication token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify user is platform admin
    const { data: adminCheck } = await supabaseClient
      .rpc('is_platform_admin', { _user_id: user.id });

    if (!adminCheck) {
      return new Response(
        JSON.stringify({ error: "Only platform admins can delete users" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse request body
    const { userId, companyId } = await req.json();

    if (!userId) {
      return new Response(
        JSON.stringify({ error: "userId is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Deleting user ${userId} from company ${companyId}`);

    // Delete from company_users
    const { error: companyUserError } = await supabaseClient
      .from('company_users')
      .delete()
      .eq('user_id', userId);

    if (companyUserError) {
      console.error('Error deleting from company_users:', companyUserError);
    }

    // Delete from user_roles
    const { error: rolesError } = await supabaseClient
      .from('user_roles')
      .delete()
      .eq('user_id', userId);

    if (rolesError) {
      console.error('Error deleting from user_roles:', rolesError);
    }

    // Delete from profiles
    const { error: profileError } = await supabaseClient
      .from('profiles')
      .delete()
      .eq('id', userId);

    if (profileError) {
      console.error('Error deleting from profiles:', profileError);
    }

    // Delete from Supabase Auth
    const { error: authDeleteError } = await supabaseClient.auth.admin.deleteUser(userId);

    if (authDeleteError) {
      console.error('Error deleting user from Auth:', authDeleteError);
      return new Response(
        JSON.stringify({ 
          error: "Failed to delete user from authentication system",
          details: authDeleteError.message 
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Log the activity
    await supabaseClient
      .from('activity_logs')
      .insert({
        user_id: user.id,
        action: 'delete_user',
        resource_type: 'user',
        resource_id: userId,
        details: { deleted_by: user.id, company_id: companyId }
      });

    console.log(`Successfully deleted user ${userId}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "User deleted successfully" 
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error in delete-user function:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
    return new Response(
      JSON.stringify({ 
        error: "Internal server error", 
        details: errorMessage 
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.76.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-application-name',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    // Get current user from auth header
    const authHeader = req.headers.get('Authorization')!;
    const token = authHeader.replace('Bearer ', '');
    
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);
    
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse request body
    const { user_id, company_id, name, email, phone, role, status } = await req.json();

    if (!user_id || !company_id) {
      return new Response(
        JSON.stringify({ error: 'user_id and company_id are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if user has permission to edit this company's users
    const { data: companyUsers, error: roleError } = await supabaseClient
      .from('company_users')
      .select('role, company_id, companies(type)')
      .eq('user_id', user.id)
      .eq('status', 'active');

    const isPlatformAdmin = companyUsers?.some(cu => 
      cu.role === 'admin' && (cu.companies as any)?.type === 'platform_admin'
    );

    const isCompanyAdmin = companyUsers?.some(cu => 
      cu.role === 'admin' && cu.company_id === company_id
    );

    if (roleError || (!isPlatformAdmin && !isCompanyAdmin)) {
      return new Response(
        JSON.stringify({ error: 'Forbidden - Admin access required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('update-company-user: Updating user:', user_id);

    // Update email if changed
    if (email) {
      const { error: emailError } = await supabaseClient.auth.admin.updateUserById(
        user_id,
        { email }
      );

      if (emailError) {
        console.error('Error updating email:', emailError);
        throw emailError;
      }
    }

    // Update profile
    if (name) {
      const { error: profileError } = await supabaseClient
        .from('profiles')
        .update({ username: name })
        .eq('id', user_id);

      if (profileError) {
        console.error('Error updating profile:', profileError);
      }
    }

    // Update company_users
    const updates: any = {};
    if (role) updates.role = role;
    if (status) updates.status = status;

    if (Object.keys(updates).length > 0) {
      const { error: companyUserError } = await supabaseClient
        .from('company_users')
        .update(updates)
        .eq('user_id', user_id)
        .eq('company_id', company_id);

      if (companyUserError) {
        console.error('Error updating company user:', companyUserError);
        throw companyUserError;
      }
    }

    console.log('update-company-user: Successfully updated user:', user_id);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'User updated successfully'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error updating company user:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

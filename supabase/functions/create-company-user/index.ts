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

    // Check if user is platform admin
    const { data: companyUsers, error: roleError } = await supabaseClient
      .from('company_users')
      .select('role, companies(type)')
      .eq('user_id', user.id)
      .eq('status', 'active');

    const isPlatformAdmin = companyUsers?.some(cu => 
      cu.role === 'admin' && (cu.companies as any)?.type === 'platform_admin'
    );

    if (roleError || !isPlatformAdmin) {
      return new Response(
        JSON.stringify({ error: 'Forbidden - Platform admin access required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse request body
    const { company_id, email, name, phone, role } = await req.json();

    if (!company_id || !email || !name) {
      return new Response(
        JSON.stringify({ error: 'company_id, email, and name are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('create-company-user: Creating user for company:', company_id);

    // Create auth user
    const { data: newUser, error: createError } = await supabaseClient.auth.admin.createUser({
      email,
      email_confirm: true,
      user_metadata: {
        username: name
      }
    });

    if (createError) {
      console.error('Error creating auth user:', createError);
      throw createError;
    }

    // Create profile
    const { error: profileError } = await supabaseClient
      .from('profiles')
      .insert({
        id: newUser.user.id,
        username: name
      });

    if (profileError) {
      console.error('Error creating profile:', profileError);
      // Don't fail completely, profile might already exist
    }

    // Create company_users association
    const { error: companyUserError } = await supabaseClient
      .from('company_users')
      .insert({
        company_id,
        user_id: newUser.user.id,
        role: role || 'user',
        status: 'active',
        is_primary: false,
        invited_by: user.id
      });

    if (companyUserError) {
      console.error('Error creating company user:', companyUserError);
      throw companyUserError;
    }

    console.log('create-company-user: Successfully created user:', newUser.user.id);

    return new Response(
      JSON.stringify({
        success: true,
        user: {
          id: newUser.user.id,
          email: newUser.user.email,
          username: name,
          role: role || 'user',
          status: 'active',
          company_id
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error creating company user:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

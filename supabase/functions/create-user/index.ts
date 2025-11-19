import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.76.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    console.log('create-user function called');
    
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    // Verify the requesting user's authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'No authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user: requestingUser }, error: authError } = await supabaseClient.auth.getUser(token);
    
    if (authError || !requestingUser) {
      console.error('Auth error:', authError);
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Requesting user:', requestingUser.id);

    const { email, password, username, role, company_id } = await req.json()

    if (!email || !password || !username || !role || !company_id) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: email, password, username, role, company_id' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('Creating user:', { email, username, role, company_id });

    // Check if requesting user has permission (admin in that company or platform admin)
    const { data: requestingUserCompanies } = await supabaseClient
      .from('company_users')
      .select('role, company_id, companies(type)')
      .eq('user_id', requestingUser.id)
      .eq('status', 'active');

    const isPlatformAdmin = requestingUserCompanies?.some(
      (cu: any) => cu.companies?.type === 'platform_admin'
    );

    const isCompanyAdmin = requestingUserCompanies?.some(
      (cu: any) => cu.company_id === company_id && cu.role === 'admin'
    );

    if (!isPlatformAdmin && !isCompanyAdmin) {
      console.error('Insufficient permissions');
      return new Response(
        JSON.stringify({ error: 'Insufficient permissions to create users for this company' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create the user in auth
    const { data: authData, error: authCreateError } = await supabaseClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { username }
    })

    if (authCreateError) {
      console.error('Auth create error:', authCreateError)
      return new Response(
        JSON.stringify({ error: authCreateError.message }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const userId = authData.user.id
    console.log('User created in auth:', userId);

    // Create profile
    const { error: profileError } = await supabaseClient
      .from('profiles')
      .insert({
        id: userId,
        username: username,
      })

    if (profileError) {
      console.error('Profile error:', profileError)
      // Don't fail the entire operation if profile creation fails
    }

    // Link user to company
    const { error: companyUserError } = await supabaseClient
      .from('company_users')
      .insert({
        company_id: company_id,
        user_id: userId,
        role: role,
        is_primary: false,
        status: 'active',
        invited_by: requestingUser.id
      })

    if (companyUserError) {
      console.error('Company user error:', companyUserError)
      return new Response(
        JSON.stringify({ error: 'Failed to link user to company: ' + companyUserError.message }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('User linked to company');

    // Log activity
    const { error: logError } = await supabaseClient
      .from('activity_logs')
      .insert({
        user_id: requestingUser.id,
        action: 'create_user',
        resource_type: 'user_management',
        resource_id: userId,
        resource_name: username,
        details: { email, role, company_id }
      })

    if (logError) {
      console.error('Log error:', logError)
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        user_id: userId,
        message: 'User created and added to company successfully'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

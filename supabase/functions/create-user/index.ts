import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.76.1'
import { corsHeaders } from '../_shared/cors.ts'

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    console.log('create-user: Function called');
    console.log('create-user: Method:', req.method);
    
    // Validate environment variables
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !serviceRoleKey) {
      console.error('create-user: Missing environment variables');
      return new Response(
        JSON.stringify({ error: 'Server configuration error' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    const supabaseClient = createClient(
      supabaseUrl,
      serviceRoleKey,
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

    console.log('create-user: Requesting user:', requestingUser.id);

    // Parse request body
    let requestBody;
    try {
      requestBody = await req.json();
      console.log('create-user: Request body parsed:', {
        hasEmail: !!requestBody.email,
        hasPassword: !!requestBody.password,
        hasUsername: !!requestBody.username,
        hasRole: !!requestBody.role,
        hasCompanyId: !!requestBody.company_id,
        companyId: requestBody.company_id
      });
    } catch (parseError: any) {
      console.error('create-user: Failed to parse request body:', parseError);
      return new Response(
        JSON.stringify({ error: 'Invalid request body' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { email, password, username, role, company_id } = requestBody;

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

    // Additional permission check in user_roles table
    const { data: userRoles } = await supabaseClient
      .from('user_roles')
      .select('role')
      .eq('user_id', requestingUser.id);

    const hasPlatformRole = userRoles?.some((r: any) => r.role === 'platform_admin');

    if (!isPlatformAdmin && !isCompanyAdmin && !hasPlatformRole) {
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

    // Link user to company - use upsert to handle case where trigger already created record
    const { error: companyUserError } = await supabaseClient
      .from('company_users')
      .upsert({
        company_id: company_id,
        user_id: userId,
        role: role,
        is_primary: false,
        status: 'active',
        invited_by: requestingUser.id
      }, {
        onConflict: 'company_id,user_id',
        ignoreDuplicates: false
      })

    if (companyUserError) {
      console.error('Company user error:', companyUserError)
      return new Response(
        JSON.stringify({ error: 'Failed to link user to company: ' + companyUserError.message }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('User linked to company');

    // Log activity using RPC to get proper user name
    const { error: logError } = await supabaseClient.rpc('log_activity', {
      p_action: 'create_user',
      p_resource_type: 'user_management',
      p_resource_id: userId,
      p_resource_name: username,
      p_details: { email, role, company_id },
      p_user_id: requestingUser.id
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

  } catch (error: any) {
    console.error('create-user: Caught error:', error);
    console.error('create-user: Error type:', typeof error);
    console.error('create-user: Error details:', {
      message: error?.message,
      stack: error?.stack,
      name: error?.name,
      cause: error?.cause
    });
    
    const errorMessage = error instanceof Error ? error.message : (error?.toString() || 'Unknown error');
    return new Response(
      JSON.stringify({ 
        error: errorMessage,
        type: typeof error,
        details: error?.toString()
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

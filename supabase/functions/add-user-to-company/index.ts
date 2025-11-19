import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Verify the requester is authenticated
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Authorization required');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);

    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    // Check if user is platform admin or company admin
    const { data: companyUsers } = await supabaseClient
      .from('company_users')
      .select('company_id, role, companies!inner(type)')
      .eq('user_id', user.id)
      .eq('status', 'active');

    const isPlatformAdmin = companyUsers?.some(
      (cu: any) => cu.companies.type === 'platform_admin'
    );

    const { companyId, userName, userEmail, userPassword, userRole } = await req.json();

    if (!companyId || !userName || !userEmail || !userPassword || !userRole) {
      throw new Error('Missing required fields');
    }

    // Check if user has permission to add users to this company
    const hasCompanyAccess = isPlatformAdmin || companyUsers?.some(
      (cu: any) => cu.company_id === companyId && cu.role === 'admin'
    );

    if (!hasCompanyAccess) {
      throw new Error('User not allowed to add users to this company');
    }

    // Create auth user
    console.log('Creating auth user:', userEmail);
    const { data: authUser, error: authError } = await supabaseClient.auth.admin.createUser({
      email: userEmail,
      password: userPassword,
      email_confirm: true,
      user_metadata: {
        name: userName,
      },
    });

    if (authError) {
      console.error('Auth error:', authError);
      throw new Error(`Failed to create user: ${authError.message}`);
    }

    if (!authUser?.user) {
      throw new Error('User creation failed - no user returned');
    }

    console.log('Auth user created:', authUser.user.id);

    // Upsert profile (in case a trigger already created it)
    const { error: profileError } = await supabaseClient
      .from('profiles')
      .upsert({
        id: authUser.user.id,
        username: userName,
      }, {
        onConflict: 'id'
      });

    if (profileError) {
      console.error('Profile error:', profileError);
      // Don't fail if profile already exists
      if (profileError.code !== '23505') {
        throw new Error(`Failed to create profile: ${profileError.message}`);
      }
    }

    console.log('Profile created/updated for user:', authUser.user.id);

    // Link user to company
    const { error: companyUserError } = await supabaseClient
      .from('company_users')
      .insert({
        company_id: companyId,
        user_id: authUser.user.id,
        role: userRole,
        status: 'active',
        invited_by: user.id,
      });

    if (companyUserError) {
      console.error('Company user error:', companyUserError);
      throw new Error(`Failed to link user to company: ${companyUserError.message}`);
    }

    console.log('User linked to company successfully');

    return new Response(
      JSON.stringify({
        success: true,
        user: {
          id: authUser.user.id,
          email: userEmail,
          name: userName,
          role: userRole,
        },
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error: any) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});

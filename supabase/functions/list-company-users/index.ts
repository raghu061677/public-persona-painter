import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.76.1";
import { corsHeaders } from '../_shared/cors.ts';

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

    // Parse request body for company_id
    const { company_id } = await req.json();

    if (!company_id) {
      return new Response(
        JSON.stringify({ error: 'company_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('list-company-users: Fetching users for company:', company_id);

    // Fetch company users associations
    const { data: companyUsersList, error: companyUsersError } = await supabaseClient
      .from('company_users')
      .select('user_id, role, status, joined_at, is_primary')
      .eq('company_id', company_id);

    if (companyUsersError) {
      console.error('Error fetching company users:', companyUsersError);
      throw companyUsersError;
    }

    const userIds = companyUsersList?.map(cu => cu.user_id) || [];

    if (userIds.length === 0) {
      return new Response(
        JSON.stringify({ success: true, users: [] }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch auth users
    const { data: { users: authUsers }, error: authError } = await supabaseClient.auth.admin.listUsers();

    if (authError) {
      console.error('Error fetching auth users:', authError);
      throw authError;
    }

    // Filter to only users in this company
    const filteredAuthUsers = authUsers.filter(u => userIds.includes(u.id));

    // Fetch profiles
    const { data: profiles } = await supabaseClient
      .from('profiles')
      .select('id, username, avatar_url, created_at')
      .in('id', userIds);

    // Combine the data
    const usersWithData = filteredAuthUsers.map(u => {
      const profile = profiles?.find(p => p.id === u.id);
      const companyUser = companyUsersList?.find(cu => cu.user_id === u.id);
      
      return {
        id: u.id,
        email: u.email,
        username: profile?.username || u.email?.split('@')[0] || 'Unknown',
        avatar_url: profile?.avatar_url,
        created_at: u.created_at,
        role: companyUser?.role || 'user',
        status: companyUser?.status || 'active',
        is_primary: companyUser?.is_primary || false,
        joined_at: companyUser?.joined_at,
        last_sign_in_at: u.last_sign_in_at,
        company_id: company_id
      };
    });

    console.log('list-company-users: Returning', usersWithData.length, 'users');

    return new Response(
      JSON.stringify({ success: true, users: usersWithData }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error listing company users:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

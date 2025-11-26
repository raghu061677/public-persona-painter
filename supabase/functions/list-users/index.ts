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

    console.log('list-users: Authenticated user:', user.id);

    // Check if user has admin role in company_users table
    const { data: companyUsers, error: roleError } = await supabaseClient
      .from('company_users')
      .select('role, companies(type)')
      .eq('user_id', user.id)
      .eq('status', 'active');

    const isAdmin = companyUsers?.some(cu => cu.role === 'admin' || (cu.companies as any)?.type === 'platform_admin');

    if (roleError || !isAdmin) {
      console.error('Permission denied:', roleError);
      return new Response(
        JSON.stringify({ error: 'Forbidden - Admin access required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('list-users: User has admin access');

    // Get the requesting user's company ID
    const { data: userCompanyAssoc, error: companyError } = await supabaseClient
      .from('company_users')
      .select('company_id, role')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .single();

    const isPlatformAdmin = companyUsers?.some(cu => (cu.companies as any)?.type === 'platform_admin');
    
    let companyUserRoles;
    
    if (isPlatformAdmin) {
      // Platform admins can see all users
      console.log('list-users: Platform admin - fetching all users');
      const { data: allCompanyUsers } = await supabaseClient
        .from('company_users')
        .select('user_id, role, company_id')
        .eq('status', 'active');
      companyUserRoles = allCompanyUsers;
    } else {
      // Company admins can only see users from their company
      const userCompanyId = userCompanyAssoc?.company_id;
      
      if (!userCompanyId) {
        return new Response(
          JSON.stringify({ error: 'Company not found' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      console.log('list-users: Company admin - fetching users for company:', userCompanyId);
      const { data: companySpecificUsers } = await supabaseClient
        .from('company_users')
        .select('user_id, role, company_id')
        .eq('company_id', userCompanyId)
        .eq('status', 'active');
      companyUserRoles = companySpecificUsers;
    }

    console.log('list-users: Found', companyUserRoles?.length, 'company user associations');

    // Get unique user IDs
    const userIds = [...new Set(companyUserRoles?.map(r => r.user_id) || [])];

    if (userIds.length === 0) {
      return new Response(
        JSON.stringify({ users: [] }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch auth users only for the filtered user IDs
    console.log('list-users: Fetching auth details for', userIds.length, 'users');
    const authUsersPromises = userIds.map(async (id) => {
      try {
        const { data, error } = await supabaseClient.auth.admin.getUserById(id);
        if (error || !data.user) return null;
        return data.user;
      } catch {
        return null;
      }
    });
    const authUsersResults = await Promise.all(authUsersPromises);
    const users = authUsersResults.filter((u): u is NonNullable<typeof u> => u !== null);

    console.log('list-users: Found', users.length, 'auth users');

    // Fetch profiles for filtered users
    const { data: profiles } = await supabaseClient
      .from('profiles')
      .select('id, username, avatar_url, created_at')
      .in('id', userIds);

    console.log('list-users: Found', profiles?.length, 'profiles');

    // Combine the data
    const usersWithData = users.map(u => {
      const profile = profiles?.find(p => p.id === u.id);
      const userCompanyRoles = companyUserRoles?.filter(r => r.user_id === u.id) || [];
      const userRoles = userCompanyRoles.map(r => r.role);
      
      return {
        id: u.id,
        email: u.email,
        username: profile?.username || u.email?.split('@')[0] || 'Unknown',
        avatar_url: profile?.avatar_url,
        created_at: u.created_at,
        roles: userRoles,
        status: (u as any).banned_until ? 'Suspended' : (u.email_confirmed_at ? 'Active' : 'Pending'),
        last_sign_in_at: u.last_sign_in_at
      };
    });

    console.log('list-users: Returning', usersWithData.length, 'users with data');

    return new Response(
      JSON.stringify({ users: usersWithData }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error listing users:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
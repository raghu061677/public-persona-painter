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

    // Fetch all users from auth.users using admin API
    console.log('list-users: Fetching all users...');
    const { data: { users }, error: listError } = await supabaseClient.auth.admin.listUsers();

    if (listError) {
      console.error('list-users: Error fetching users:', listError);
      throw listError;
    }

    console.log('list-users: Found', users?.length, 'auth users');

    // Fetch profiles for all users
    const { data: profiles } = await supabaseClient
      .from('profiles')
      .select('id, username, avatar_url, created_at');

    console.log('list-users: Found', profiles?.length, 'profiles');

    // Fetch company associations for all users
    const { data: companyUserRoles } = await supabaseClient
      .from('company_users')
      .select('user_id, role, company_id')
      .eq('status', 'active');

    console.log('list-users: Found', companyUserRoles?.length, 'company user associations');

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
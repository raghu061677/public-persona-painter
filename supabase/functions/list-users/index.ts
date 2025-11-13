import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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

    // Check if user has admin role
    const { data: userRoles, error: roleError } = await supabaseClient
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id);

    if (roleError || !userRoles?.some(r => r.role === 'admin')) {
      return new Response(
        JSON.stringify({ error: 'Forbidden - Admin access required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch all users from auth.users using admin API
    const { data: { users }, error: listError } = await supabaseClient.auth.admin.listUsers();

    if (listError) {
      throw listError;
    }

    // Fetch profiles and roles for all users
    const { data: profiles } = await supabaseClient
      .from('profiles')
      .select('id, username, avatar_url, created_at');

    const { data: roles } = await supabaseClient
      .from('user_roles')
      .select('user_id, role');

    // Combine the data
    const usersWithData = users.map(u => {
      const profile = profiles?.find(p => p.id === u.id);
      const userRoles = roles?.filter(r => r.user_id === u.id).map(r => r.role) || [];
      
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
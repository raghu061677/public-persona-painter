import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
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
    
    const { data: { user: currentUser }, error: userError } = await supabaseClient.auth.getUser(token);
    
    if (userError || !currentUser) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if user has admin role using service role client
    const { data: userRoles, error: roleError } = await supabaseClient
      .from('user_roles')
      .select('role')
      .eq('user_id', currentUser.id);

    const isAdmin = userRoles?.some(r => r.role === 'admin') || currentUser.email === 'admin@go-ads.in';

    if (!isAdmin) {
      return new Response(
        JSON.stringify({ error: 'Forbidden - Admin access required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse request body
    const { userId, username, role, isActive } = await req.json();

    if (!userId) {
      return new Response(
        JSON.stringify({ error: 'User ID is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Update profile if username provided
    if (username) {
      const { error: profileError } = await supabaseClient
        .from('profiles')
        .update({ username })
        .eq('id', userId);

      if (profileError) {
        throw new Error(`Failed to update profile: ${profileError.message}`);
      }
    }

    // Update role if provided
    if (role) {
      // Delete old roles
      await supabaseClient.from('user_roles').delete().eq('user_id', userId);
      
      // Insert new role
      const { error: roleInsertError } = await supabaseClient
        .from('user_roles')
        .insert({ user_id: userId, role: role });

      if (roleInsertError) {
        throw new Error(`Failed to update role: ${roleInsertError.message}`);
      }
    }

    // Update user status if isActive is provided
    if (typeof isActive === 'boolean') {
      if (isActive) {
        // Activate user - unban if banned and confirm email if not confirmed
        const { error: updateError } = await supabaseClient.auth.admin.updateUserById(
          userId,
          { 
            ban_duration: 'none',
            email_confirm: true  // Confirm email to activate the user
          }
        );
        if (updateError) {
          console.error('Error activating user:', updateError);
          throw new Error(`Failed to activate user: ${updateError.message}`);
        }
      } else {
        // Deactivate user - ban them
        const { error: banError } = await supabaseClient.auth.admin.updateUserById(
          userId,
          { ban_duration: '876000h' } // 100 years (effectively permanent)
        );
        if (banError) {
          console.error('Error deactivating user:', banError);
          throw new Error(`Failed to deactivate user: ${banError.message}`);
        }
      }
    }

    return new Response(
      JSON.stringify({ success: true, message: 'User updated successfully' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error updating user:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

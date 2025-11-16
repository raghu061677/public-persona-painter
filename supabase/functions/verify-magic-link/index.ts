import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RequestBody {
  token: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { token } = await req.json() as RequestBody;

    console.log('Verifying magic link token');

    // Find user with valid token
    const { data: portalUser, error: userError } = await supabase
      .from('client_portal_users')
      .select('*, clients!inner(id, name)')
      .eq('magic_link_token', token)
      .eq('is_active', true)
      .single();

    if (userError || !portalUser) {
      console.error('Invalid token:', userError);
      return new Response(
        JSON.stringify({ 
          error: 'Invalid or expired magic link' 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if token is expired
    const expiresAt = new Date(portalUser.magic_link_expires_at);
    if (expiresAt < new Date()) {
      console.log('Token expired');
      
      // Clear expired token
      await supabase
        .from('client_portal_users')
        .update({
          magic_link_token: null,
          magic_link_expires_at: null,
        })
        .eq('id', portalUser.id);

      return new Response(
        JSON.stringify({ 
          error: 'Magic link has expired. Please request a new one.' 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Token is valid - update user and clear token
    const { error: updateError } = await supabase
      .from('client_portal_users')
      .update({
        magic_link_token: null,
        magic_link_expires_at: null,
        last_login: new Date().toISOString(),
      })
      .eq('id', portalUser.id);

    if (updateError) {
      console.error('Error updating user:', updateError);
      throw updateError;
    }

    // Log successful access
    await supabase.from('client_portal_access_logs').insert({
      client_id: portalUser.client_id,
      action: 'magic_link_verified',
      metadata: {
        email: portalUser.email,
        portal_user_id: portalUser.id,
      },
    });

    console.log('Magic link verified successfully for:', portalUser.email);

    // Return user session data
    return new Response(
      JSON.stringify({ 
        success: true,
        user: {
          id: portalUser.id,
          email: portalUser.email,
          name: portalUser.name,
          client_id: portalUser.client_id,
          client_name: portalUser.clients.name,
        },
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in verify-magic-link:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Internal server error' 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

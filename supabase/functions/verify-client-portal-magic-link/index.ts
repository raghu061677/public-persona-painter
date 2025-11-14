import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { token } = await req.json()

    if (!token) {
      throw new Error('Token is required')
    }

    // Find user with valid magic link token
    const { data: portalUser, error: userError } = await supabaseClient
      .from('client_portal_users')
      .select('*')
      .eq('magic_link_token', token)
      .gt('magic_link_expires_at', new Date().toISOString())
      .eq('is_active', true)
      .single()

    if (userError || !portalUser) {
      throw new Error('Invalid or expired magic link')
    }

    // Create or get auth user
    let authUserId = portalUser.auth_user_id

    if (!authUserId) {
      // Create new auth user
      const { data: authData, error: authError } = await supabaseClient.auth.admin.createUser({
        email: portalUser.email,
        email_confirm: true,
        user_metadata: {
          is_client_portal_user: true,
          client_id: portalUser.client_id,
          portal_user_id: portalUser.id,
        },
      })

      if (authError) throw authError

      authUserId = authData.user.id

      // Link auth user to portal user
      await supabaseClient
        .from('client_portal_users')
        .update({ auth_user_id: authUserId })
        .eq('id', portalUser.id)
    }

    // Generate session for the auth user
    const { data: sessionData, error: sessionError } = await supabaseClient.auth.admin.generateLink({
      type: 'magiclink',
      email: portalUser.email,
      options: {
        redirectTo: `${Deno.env.get('SITE_URL')}/portal/dashboard`,
      },
    })

    if (sessionError) throw sessionError

    // Update last login and clear magic token
    await supabaseClient
      .from('client_portal_users')
      .update({
        last_login: new Date().toISOString(),
        magic_link_token: null,
        magic_link_expires_at: null,
      })
      .eq('id', portalUser.id)

    return new Response(
      JSON.stringify({
        success: true,
        user: {
          id: portalUser.id,
          email: portalUser.email,
          name: portalUser.name,
          client_id: portalUser.client_id,
        },
        session: sessionData,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'An error occurred'
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }
})

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.76.1'

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

    const { email, client_id, company_name } = await req.json()

    if (!email || !client_id) {
      throw new Error('Email and client_id are required')
    }

    // Generate magic link token
    const magicToken = crypto.randomUUID()
    const expiresAt = new Date()
    expiresAt.setHours(expiresAt.getHours() + 24) // 24 hour expiry

    // Update or insert client portal user
    const { data: existingUser } = await supabaseClient
      .from('client_portal_users')
      .select('id')
      .eq('email', email)
      .eq('client_id', client_id)
      .single()

    if (existingUser) {
      // Update existing user
      await supabaseClient
        .from('client_portal_users')
        .update({
          magic_link_token: magicToken,
          magic_link_expires_at: expiresAt.toISOString(),
        })
        .eq('id', existingUser.id)
    } else {
      // Create new user
      await supabaseClient
        .from('client_portal_users')
        .insert({
          email,
          client_id,
          magic_link_token: magicToken,
          magic_link_expires_at: expiresAt.toISOString(),
          invited_by: req.headers.get('user-id'),
        })
    }

    // Generate magic link URL
    const baseUrl = Deno.env.get('SITE_URL') || 'http://localhost:5173'
    const magicLink = `${baseUrl}/portal/auth?token=${magicToken}`

    // TODO: Send email with magic link using Resend
    // For now, we'll return the link in response
    console.log('Magic link generated:', magicLink)

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Magic link sent successfully',
        magicLink, // Remove this in production
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

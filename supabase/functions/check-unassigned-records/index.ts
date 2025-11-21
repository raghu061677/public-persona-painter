import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7'
import { corsHeaders } from '../_shared/cors.ts'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
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
    )

    // Count records without company_id in each table
    const counts = {
      assets: 0,
      clients: 0,
      leads: 0,
      campaigns: 0,
      plans: 0,
    }

    // Check media_assets
    const { count: assetsCount, error: assetsError } = await supabaseClient
      .from('media_assets')
      .select('id', { count: 'exact', head: true })
      .is('company_id', null)

    if (!assetsError) {
      counts.assets = assetsCount || 0
    }

    // Check clients
    const { count: clientsCount, error: clientsError } = await supabaseClient
      .from('clients')
      .select('id', { count: 'exact', head: true })
      .is('company_id', null)

    if (!clientsError) {
      counts.clients = clientsCount || 0
    }

    // Check leads (if exists)
    const { count: leadsCount, error: leadsError } = await supabaseClient
      .from('leads')
      .select('id', { count: 'exact', head: true })
      .is('company_id', null)

    if (!leadsError) {
      counts.leads = leadsCount || 0
    }

    // Check campaigns
    const { count: campaignsCount, error: campaignsError } = await supabaseClient
      .from('campaigns')
      .select('id', { count: 'exact', head: true })
      .is('company_id', null)

    if (!campaignsError) {
      counts.campaigns = campaignsCount || 0
    }

    // Check plans
    const { count: plansCount, error: plansError } = await supabaseClient
      .from('plans')
      .select('id', { count: 'exact', head: true })
      .is('company_id', null)

    if (!plansError) {
      counts.plans = plansCount || 0
    }

    return new Response(
      JSON.stringify({
        success: true,
        counts,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error) {
    console.error('Check error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
    return new Response(
      JSON.stringify({
        success: false,
        error: errorMessage,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }
})
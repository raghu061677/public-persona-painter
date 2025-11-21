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

    const { targetCompanyId } = await req.json()

    if (!targetCompanyId) {
      throw new Error('Target company ID is required')
    }

    // Verify the target company exists
    const { data: company, error: companyError } = await supabaseClient
      .from('companies')
      .select('id, name')
      .eq('id', targetCompanyId)
      .single()

    if (companyError || !company) {
      throw new Error('Target company not found')
    }

    const results = {
      assets: 0,
      clients: 0,
      leads: 0,
      campaigns: 0,
      plans: 0,
    }

    // Migrate media_assets
    const { data: assets, error: assetsError } = await supabaseClient
      .from('media_assets')
      .update({ company_id: targetCompanyId })
      .is('company_id', null)
      .select('id')

    if (assetsError) {
      console.error('Assets migration error:', assetsError)
    } else {
      results.assets = assets?.length || 0
    }

    // Migrate clients
    const { data: clients, error: clientsError } = await supabaseClient
      .from('clients')
      .update({ company_id: targetCompanyId })
      .is('company_id', null)
      .select('id')

    if (clientsError) {
      console.error('Clients migration error:', clientsError)
    } else {
      results.clients = clients?.length || 0
    }

    // Migrate leads (if table exists)
    const { data: leads, error: leadsError } = await supabaseClient
      .from('leads')
      .update({ company_id: targetCompanyId })
      .is('company_id', null)
      .select('id')

    if (leadsError) {
      console.error('Leads migration error:', leadsError)
    } else {
      results.leads = leads?.length || 0
    }

    // Migrate campaigns
    const { data: campaigns, error: campaignsError } = await supabaseClient
      .from('campaigns')
      .update({ company_id: targetCompanyId })
      .is('company_id', null)
      .select('id')

    if (campaignsError) {
      console.error('Campaigns migration error:', campaignsError)
    } else {
      results.campaigns = campaigns?.length || 0
    }

    // Migrate plans
    const { data: plans, error: plansError } = await supabaseClient
      .from('plans')
      .update({ company_id: targetCompanyId })
      .is('company_id', null)
      .select('id')

    if (plansError) {
      console.error('Plans migration error:', plansError)
    } else {
      results.plans = plans?.length || 0
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Successfully migrated data to ${company.name}`,
        results,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error) {
    console.error('Migration error:', error)
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
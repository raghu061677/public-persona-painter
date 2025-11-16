import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
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

    const { companyId, userId } = await req.json()

    if (!companyId || !userId) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    let deletedCounts = {
      campaigns: 0,
      campaign_assets: 0,
      plans: 0,
      leads: 0,
      clients: 0,
      assets: 0
    }

    // Delete in correct order due to foreign key constraints

    // 1. Delete campaign assets
    const { count: campaignAssetsCount } = await supabaseClient
      .from('campaign_assets')
      .delete({ count: 'exact' })
      .like('campaign_id', 'CAM-DEMO-%')

    deletedCounts.campaign_assets = campaignAssetsCount || 0

    // 2. Delete campaigns
    const { count: campaignsCount } = await supabaseClient
      .from('campaigns')
      .delete({ count: 'exact' })
      .eq('company_id', companyId)
      .like('id', 'CAM-DEMO-%')

    deletedCounts.campaigns = campaignsCount || 0

    // 3. Delete plans
    const { count: plansCount } = await supabaseClient
      .from('plans')
      .delete({ count: 'exact' })
      .eq('company_id', companyId)
      .like('id', 'PLAN-DEMO-%')

    deletedCounts.plans = plansCount || 0

    // 4. Delete leads
    const { count: leadsCount } = await supabaseClient
      .from('leads')
      .delete({ count: 'exact' })
      .eq('company_id', companyId)
      .in('email', ['ravi@newstartup.com', 'anjali@fashionbrand.com'])

    deletedCounts.leads = leadsCount || 0

    // 5. Delete clients
    const { count: clientsCount } = await supabaseClient
      .from('clients')
      .delete({ count: 'exact' })
      .eq('company_id', companyId)
      .like('id', 'CLT-DEMO-%')

    deletedCounts.clients = clientsCount || 0

    // 6. Delete media assets
    const { count: assetsCount } = await supabaseClient
      .from('media_assets')
      .delete({ count: 'exact' })
      .eq('company_id', companyId)
      .like('id', '%-DEMO-%')

    deletedCounts.assets = assetsCount || 0

    // Log activity
    await supabaseClient
      .from('activity_logs')
      .insert({
        user_id: userId,
        action: 'clear_demo_data',
        resource_type: 'demo_system',
        resource_name: 'Demo Data Cleared',
        details: deletedCounts
      })

    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'Demo data cleared successfully',
        deleted: deletedCounts
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

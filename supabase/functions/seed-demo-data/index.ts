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

    // Seed demo clients
    const demoClients = [
      {
        id: 'CLT-DEMO-001',
        company_id: companyId,
        name: 'ABC Beverages Ltd',
        contact_person: 'Rajesh Kumar',
        email: 'rajesh@abcbeverages.com',
        phone: '+91-9876543210',
        gst_number: '36AAACB1234C1Z5',
        billing_address_line1: '123 MG Road',
        billing_city: 'Hyderabad',
        billing_state: 'Telangana',
        billing_pincode: '500001',
        created_by: userId
      },
      {
        id: 'CLT-DEMO-002',
        company_id: companyId,
        name: 'XYZ Electronics Pvt Ltd',
        contact_person: 'Priya Sharma',
        email: 'priya@xyzelec.com',
        phone: '+91-9988776655',
        gst_number: '36AABCX5678D1Z9',
        billing_address_line1: '456 Jubilee Hills',
        billing_city: 'Hyderabad',
        billing_state: 'Telangana',
        billing_pincode: '500033',
        created_by: userId
      },
      {
        id: 'CLT-DEMO-003',
        company_id: companyId,
        name: 'Matrix Real Estate',
        contact_person: 'Suresh Reddy',
        email: 'suresh@matrixrealty.com',
        phone: '+91-9123456789',
        gst_number: '36AAACM9012E1Z3',
        billing_address_line1: '789 Banjara Hills',
        billing_city: 'Hyderabad',
        billing_state: 'Telangana',
        billing_pincode: '500034',
        created_by: userId
      }
    ]

    const { error: clientsError } = await supabaseClient
      .from('clients')
      .upsert(demoClients, { onConflict: 'id' })

    if (clientsError) {
      console.error('Clients error:', clientsError)
    }

    // Seed demo media assets
    const demoAssets = [
      {
        id: 'HYD-BSQ-DEMO-001',
        company_id: companyId,
        city: 'Hyderabad',
        area: 'Kukatpally',
        location: 'JNTU Main Road',
        media_type: 'Bus Shelter',
        dimensions: '10x5 ft',
        total_sqft: 50,
        card_rate: 15000,
        status: 'Available',
        latitude: 17.4924,
        longitude: 78.3916,
        direction: 'North',
        category: 'premium',
        created_by: userId
      },
      {
        id: 'HYD-HRD-DEMO-002',
        company_id: companyId,
        city: 'Hyderabad',
        area: 'Madhapur',
        location: 'Hitech City Junction',
        media_type: 'Hoarding',
        dimensions: '20x10 ft',
        total_sqft: 200,
        card_rate: 50000,
        status: 'Available',
        latitude: 17.4485,
        longitude: 78.3908,
        direction: 'East',
        category: 'premium',
        created_by: userId
      },
      {
        id: 'HYD-UNI-DEMO-003',
        company_id: companyId,
        city: 'Hyderabad',
        area: 'Gachibowli',
        location: 'DLF Cyber City',
        media_type: 'Unipole',
        dimensions: '30x15 ft',
        total_sqft: 450,
        card_rate: 80000,
        status: 'Available',
        latitude: 17.4404,
        longitude: 78.3516,
        direction: 'South',
        category: 'premium',
        created_by: userId
      },
      {
        id: 'HYD-BSQ-DEMO-004',
        company_id: companyId,
        city: 'Hyderabad',
        area: 'Ameerpet',
        location: 'Metro Station',
        media_type: 'Bus Shelter',
        dimensions: '10x5 ft',
        total_sqft: 50,
        card_rate: 12000,
        status: 'Booked',
        latitude: 17.4374,
        longitude: 78.4482,
        direction: 'West',
        category: 'standard',
        created_by: userId
      }
    ]

    const { error: assetsError } = await supabaseClient
      .from('media_assets')
      .upsert(demoAssets, { onConflict: 'id' })

    if (assetsError) {
      console.error('Assets error:', assetsError)
    }

    // Seed demo plan
    const demoPlan = {
      id: 'PLAN-DEMO-001',
      company_id: companyId,
      client_id: 'CLT-DEMO-001',
      client_name: 'ABC Beverages Ltd',
      plan_name: 'Summer Campaign 2025',
      plan_type: 'standard',
      start_date: '2025-06-01',
      end_date: '2025-08-31',
      status: 'Approved',
      total_amount: 120000,
      gst_amount: 21600,
      gst_percent: 18,
      grand_total: 141600,
      created_by: userId
    }

    const { error: planError } = await supabaseClient
      .from('plans')
      .upsert(demoPlan, { onConflict: 'id' })

    if (planError) {
      console.error('Plan error:', planError)
    }

    // Seed demo campaign
    const demoCampaign = {
      id: 'CAM-DEMO-001',
      company_id: companyId,
      plan_id: 'PLAN-DEMO-001',
      client_id: 'CLT-DEMO-001',
      client_name: 'ABC Beverages Ltd',
      campaign_name: 'Summer Campaign 2025',
      start_date: '2025-06-01',
      end_date: '2025-08-31',
      status: 'running',
      total_amount: 120000,
      gst_amount: 21600,
      gst_percent: 18,
      grand_total: 141600,
      total_assets: 2,
      created_by: userId
    }

    const { error: campaignError } = await supabaseClient
      .from('campaigns')
      .upsert(demoCampaign, { onConflict: 'id' })

    if (campaignError) {
      console.error('Campaign error:', campaignError)
    }

    // Seed demo leads
    const demoLeads = [
      {
        company_id: companyId,
        name: 'Ravi Verma',
        email: 'ravi@newstartup.com',
        phone: '+91-9111222333',
        company: 'New Startup Pvt Ltd',
        source: 'website',
        status: 'new',
        requirement: 'Need 5 hoardings in Kukatpally for product launch'
      },
      {
        company_id: companyId,
        name: 'Anjali Desai',
        email: 'anjali@fashionbrand.com',
        phone: '+91-9222333444',
        company: 'Fashion Brand Co',
        source: 'whatsapp',
        status: 'qualified',
        requirement: 'Bus shelters near malls for festive season'
      }
    ]

    const { error: leadsError } = await supabaseClient
      .from('leads')
      .insert(demoLeads)

    if (leadsError) {
      console.error('Leads error:', leadsError)
    }

    // Log activity
    await supabaseClient
      .from('activity_logs')
      .insert({
        user_id: userId,
        action: 'seed_demo_data',
        resource_type: 'demo_system',
        resource_name: 'Demo Data Seeded',
        details: { 
          clients: demoClients.length,
          assets: demoAssets.length,
          plans: 1,
          campaigns: 1,
          leads: demoLeads.length
        }
      })

    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'Demo data seeded successfully',
        data: {
          clients: demoClients.length,
          assets: demoAssets.length,
          plans: 1,
          campaigns: 1,
          leads: demoLeads.length
        }
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

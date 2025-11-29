import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'
import { corsHeaders } from '../_shared/cors.ts'

// Version 8.0 - Complete workflow standardization with PascalCase statuses and full media asset propagation
console.log('Convert Plan to Campaign function v8.0 - PascalCase statuses + media field propagation')

interface ConvertPlanRequest {
  plan_id: string
  campaign_name?: string
  start_date?: string
  end_date?: string
  notes?: string
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // 1. Authenticate user
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 2. Get user's company
    const { data: companyUser, error: companyError } = await supabase
      .from('company_users')
      .select('company_id')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .single()

    if (companyError || !companyUser) {
      return new Response(
        JSON.stringify({ error: 'No active company association found' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const companyId = companyUser.company_id

    // 3. Parse request body
    const body: ConvertPlanRequest = await req.json()
    const { plan_id, campaign_name, start_date, end_date, notes } = body

    if (!plan_id) {
      return new Response(
        JSON.stringify({ error: 'plan_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('[v8.0] Converting plan:', plan_id, 'for company:', companyId)

    // 4. Fetch plan with validation
    const { data: plan, error: planError } = await supabase
      .from('plans')
      .select('*')
      .eq('id', plan_id)
      .eq('company_id', companyId)
      .single()

    if (planError || !plan) {
      return new Response(
        JSON.stringify({ error: 'Plan not found or access denied' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check if already converted
    if (plan.status === 'Converted') {
      const { data: existingCampaign } = await supabase
        .from('campaigns')
        .select('id')
        .eq('plan_id', plan_id)
        .maybeSingle()

      if (existingCampaign) {
        return new Response(
          JSON.stringify({ 
            error: 'Plan already converted',
            existing_campaign_id: existingCampaign.id 
          }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    }

    // Check if plan is approved (recommended but not enforced)
    if (plan.status !== 'Approved' && plan.status !== 'approved') {
      console.warn('[v8.0] WARNING: Converting non-approved plan. Status:', plan.status)
    }

    // 5. Fetch plan items WITH media asset details
    const { data: planItems, error: itemsError } = await supabase
      .from('plan_items')
      .select(`
        *,
        media_assets!inner(
          id,
          media_type,
          state,
          district,
          city,
          area,
          location,
          direction,
          dimensions,
          total_sqft,
          illumination_type,
          illumination,
          latitude,
          longitude,
          card_rate,
          base_rent
        )
      `)
      .eq('plan_id', plan_id)

    if (itemsError || !planItems || planItems.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No plan items found' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('[v8.0] Found', planItems.length, 'plan items with media asset details')

    // 6. Check for booking conflicts
    const assetIds = planItems.map((item: any) => item.asset_id)
    const finalStartDate = start_date || plan.start_date
    const finalEndDate = end_date || plan.end_date

    const { data: conflicts } = await supabase
      .from('media_assets')
      .select('id, location, status, booked_from, booked_to')
      .in('id', assetIds)
      .eq('status', 'Booked')
      .or(`and(booked_from.lte.${finalEndDate},booked_to.gte.${finalStartDate})`)

    if (conflicts && conflicts.length > 0) {
      return new Response(
        JSON.stringify({
          error: 'Some assets are already booked',
          conflicts: conflicts.map((c: any) => ({
            asset_id: c.id,
            location: c.location,
            booked_from: c.booked_from,
            booked_to: c.booked_to
          }))
        }),
        { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 7. Generate campaign ID
    const { data: campaignCode, error: codeError } = await supabase.rpc('generate_campaign_id')
    if (codeError || !campaignCode) {
      return new Response(
        JSON.stringify({ error: 'Failed to generate campaign ID' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('[v8.0] Generated campaign ID:', campaignCode)

    // 8. FORCE STATUS TO 'Planned' (PascalCase standard)
    const normalizedStatus = 'Planned' as const

    // 9. Create campaign record
    const campaignInsertData = {
      id: campaignCode,
      company_id: companyId,
      plan_id: plan_id,
      campaign_name: campaign_name || plan.plan_name,
      client_id: plan.client_id,
      client_name: plan.client_name,
      start_date: finalStartDate,
      end_date: finalEndDate,
      status: normalizedStatus, // Always 'Planned' for new campaigns
      total_amount: plan.total_amount,
      gst_percent: plan.gst_percent,
      gst_amount: plan.gst_amount,
      grand_total: plan.grand_total,
      total_assets: planItems.length,
      notes: notes || plan.notes || '',
      created_by: user.id,
    }

    console.log('[v8.0] Creating campaign with status:', normalizedStatus)

    const { data: campaign, error: campaignError } = await supabase
      .from('campaigns')
      .insert(campaignInsertData)
      .select()
      .single()

    if (campaignError) {
      console.error('[v8.0] Campaign insert error:', campaignError)
      return new Response(
        JSON.stringify({ 
          error: 'Failed to create campaign', 
          details: campaignError.message 
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('[v8.0] Campaign created successfully:', campaign.id)

    // 10. Create campaign_items (for finance tracking)
    const campaignItemsData = planItems.map((item: any) => ({
      campaign_id: campaignCode,
      plan_item_id: item.id,
      asset_id: item.asset_id,
      start_date: finalStartDate,
      end_date: finalEndDate,
      card_rate: item.card_rate || item.media_assets.card_rate || 0,
      negotiated_rate: item.sales_price || item.card_rate || 0,
      printing_charge: item.printing_charges || 0,
      mounting_charge: item.mounting_charges || 0,
      quantity: 1,
      final_price: item.total_with_gst || 0,
    }))

    const { error: campaignItemsError } = await supabase
      .from('campaign_items')
      .insert(campaignItemsData)

    if (campaignItemsError) {
      console.error('[v8.0] Campaign items error:', campaignItemsError)
      // Don't fail the entire operation, just log
    }

    // 11. Create campaign_assets (for operations tracking) with FULL media asset data
    const campaignAssetsData = planItems.map((item: any) => {
      const asset = item.media_assets
      
      return {
        campaign_id: campaignCode,
        asset_id: item.asset_id,
        // Media asset snapshot fields from plan_items (or fallback to media_assets)
        media_type: item.media_type || asset.media_type || 'Unknown',
        city: item.city || asset.city || '',
        area: item.area || asset.area || '',
        location: item.location || asset.location || '',
        latitude: item.latitude || asset.latitude || null,
        longitude: item.longitude || asset.longitude || null,
        // Pricing snapshot
        card_rate: item.card_rate || asset.card_rate || 0,
        printing_charges: item.printing_charges || 0,
        mounting_charges: item.mounting_charges || 0,
        // Status always starts as 'Pending' for operations
        status: 'Pending',
      }
    })

    const { error: assetsError } = await supabase
      .from('campaign_assets')
      .insert(campaignAssetsData)

    if (assetsError) {
      console.error('[v8.0] Campaign assets error:', assetsError)
      return new Response(
        JSON.stringify({ 
          error: 'Failed to create campaign assets', 
          details: assetsError.message 
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('[v8.0] Created', campaignAssetsData.length, 'campaign assets')

    // 12. Update media assets booking status
    const bookingUpdates = assetIds.map(assetId => ({
      id: assetId,
      status: 'Booked',
      booked_from: finalStartDate,
      booked_to: finalEndDate,
      current_campaign_id: campaignCode,
    }))

    for (const update of bookingUpdates) {
      await supabase
        .from('media_assets')
        .update({
          status: update.status,
          booked_from: update.booked_from,
          booked_to: update.booked_to,
          current_campaign_id: update.current_campaign_id,
        })
        .eq('id', update.id)
    }

    // 13. Update plan status to 'Converted'
    await supabase
      .from('plans')
      .update({ status: 'Converted' })
      .eq('id', plan_id)

    console.log('[v8.0] Plan marked as Converted')

    // 14. Success response
    return new Response(
      JSON.stringify({
        success: true,
        campaign_id: campaignCode,
        campaign: campaign,
        message: `Campaign ${campaignCode} created successfully with status: ${normalizedStatus}`,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('[v8.0] Unexpected error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

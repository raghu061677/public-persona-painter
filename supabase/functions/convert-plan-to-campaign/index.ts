import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'
import { corsHeaders } from '../_shared/cors.ts'

// Version 2.0 - Fixed campaign status enum to use 'Planned' instead of 'Active'
console.log('Convert Plan to Campaign function v2.0 started')

interface ConvertPlanRequest {
  plan_id: string
  campaign_name?: string
  start_date?: string
  end_date?: string
  notes?: string
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    
    // Get the authorization header
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      throw new Error('No authorization header')
    }

    // Verify the user
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: userError } = await supabase.auth.getUser(token)
    
    if (userError || !user) {
      throw new Error('Unauthorized')
    }

    // Get user's company
    const { data: companyUser, error: companyError } = await supabase
      .from('company_users')
      .select('company_id')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .single()

    if (companyError || !companyUser) {
      throw new Error('No active company association found')
    }

    const companyId = companyUser.company_id

    // Parse request body
    const { plan_id, campaign_name, start_date, end_date, notes }: ConvertPlanRequest = await req.json()

    if (!plan_id) {
      throw new Error('plan_id is required')
    }

    console.log(`Converting plan ${plan_id} to campaign...`)
    console.log('Campaign data:', { campaign_name, start_date, end_date, notes })

    // 1. Load and validate the plan
    const { data: plan, error: planError } = await supabase
      .from('plans')
      .select('*')
      .eq('id', plan_id)
      .eq('company_id', companyId)
      .single()

    if (planError || !plan) {
      throw new Error('Plan not found or access denied')
    }

    // Validate plan status
    if (plan.status === 'converted') {
      throw new Error('Plan has already been converted to a campaign')
    }

    if (plan.status === 'rejected') {
      throw new Error('Cannot convert a rejected plan')
    }

    // 2. Load plan items
    const { data: planItems, error: itemsError } = await supabase
      .from('plan_items')
      .select('*')
      .eq('plan_id', plan_id)

    if (itemsError) {
      throw new Error(`Failed to load plan items: ${itemsError.message}`)
    }

    if (!planItems || planItems.length === 0) {
      throw new Error('Plan has no items to convert')
    }

    // 3. Check for asset booking overlaps
    for (const item of planItems) {
      const { data: overlaps, error: overlapError } = await supabase
        .from('media_assets')
        .select('id, booked_from, booked_to, current_campaign_id')
        .eq('id', item.asset_id)
        .eq('status', 'Booked')
        .not('current_campaign_id', 'is', null)

      if (overlapError) {
        console.error('Overlap check error:', overlapError)
        continue // Don't fail on overlap check errors, just log
      }

      if (overlaps && overlaps.length > 0) {
        const overlap = overlaps[0]
        const itemStart = new Date(plan.start_date)
        const itemEnd = new Date(plan.end_date)
        const bookedStart = overlap.booked_from ? new Date(overlap.booked_from) : null
        const bookedEnd = overlap.booked_to ? new Date(overlap.booked_to) : null

        // Check if dates overlap
        if (bookedStart && bookedEnd) {
          const hasOverlap = itemStart <= bookedEnd && itemEnd >= bookedStart
          if (hasOverlap) {
            throw new Error(
              `Asset ${item.asset_id} is already booked for the period ${bookedStart.toLocaleDateString()} - ${bookedEnd.toLocaleDateString()} (Campaign: ${overlap.current_campaign_id})`
            )
          }
        }
      }
    }

    // 4. Generate campaign code (CMP-<year>-<sequential>)
    const year = new Date().getFullYear()
    const { data: lastCampaign } = await supabase
      .from('campaigns')
      .select('id')
      .like('id', `CMP-${year}-%`)
      .order('id', { ascending: false })
      .limit(1)

    let nextNum = 1
    if (lastCampaign && lastCampaign.length > 0) {
      const lastId = lastCampaign[0].id
      const match = lastId.match(/CMP-\d{4}-(\d+)/)
      if (match) {
        nextNum = parseInt(match[1]) + 1
      }
    }

    const campaignCode = `CMP-${year}-${String(nextNum).padStart(4, '0')}`

    // 5. Calculate date range (use provided dates or fall back to plan dates)
    const finalStartDate = start_date || plan.start_date
    const finalEndDate = end_date || plan.end_date

    // 6. Create campaign record - MUST use 'Planned' status (valid enum values: Planned, Assigned, InProgress, PhotoUploaded, Verified, Completed)
    const campaignInsertData = {
      id: campaignCode,
      company_id: companyId,
      client_id: plan.client_id,
      plan_id: plan.id,
      campaign_name: campaign_name || plan.plan_name || `Campaign for ${plan.client_name}`,
      client_name: plan.client_name,
      start_date: finalStartDate,
      end_date: finalEndDate,
      status: 'Planned' as const,
      total_assets: planItems.length,
      total_amount: plan.total_amount || 0,
      gst_percent: plan.gst_percent || 18,
      gst_amount: plan.gst_amount || 0,
      grand_total: plan.grand_total || 0,
      notes: notes || plan.notes,
      created_by: user.id,
    }
    
    console.log('[v2.0] Inserting campaign with status:', campaignInsertData.status)
    console.log('[v2.0] Full campaign data:', JSON.stringify(campaignInsertData, null, 2))
    
    const { data: campaign, error: campaignError } = await supabase
      .from('campaigns')
      .insert(campaignInsertData)
      .select()
      .single()

    if (campaignError) {
      throw new Error(`Failed to create campaign: ${campaignError.message}`)
    }

    console.log(`Created campaign: ${campaignCode}`)

    // 7. Create campaign_items (use final dates)
    const campaignItems = planItems.map((item: any) => ({
      campaign_id: campaignCode,
      plan_item_id: item.id,
      asset_id: item.asset_id,
      start_date: finalStartDate,
      end_date: finalEndDate,
      card_rate: item.card_rate || 0,
      negotiated_rate: item.negotiated_rate || item.card_rate || 0,
      printing_charge: item.printing_charges || 0,
      mounting_charge: item.mounting_charges || 0,
      final_price: item.total_with_gst || item.card_rate || 0,
      quantity: 1,
    }))

    const { error: itemsInsertError } = await supabase
      .from('campaign_items')
      .insert(campaignItems)

    if (itemsInsertError) {
      // Rollback campaign if items fail
      await supabase.from('campaigns').delete().eq('id', campaignCode)
      throw new Error(`Failed to create campaign items: ${itemsInsertError.message}`)
    }

    // 8. Create campaign_assets (for operations)
    const campaignAssets = planItems.map((item: any) => ({
      campaign_id: campaignCode,
      asset_id: item.asset_id,
      city: item.city,
      area: item.area,
      location: item.location,
      media_type: item.media_type,
      card_rate: item.card_rate || 0,
      printing_charges: item.printing_charges || 0,
      mounting_charges: item.mounting_charges || 0,
      status: 'Pending',
    }))

    const { error: assetsInsertError } = await supabase
      .from('campaign_assets')
      .insert(campaignAssets)

    if (assetsInsertError) {
      console.error('Failed to create campaign assets:', assetsInsertError)
      // Don't fail the entire conversion, just log
    }

    // 9. Update media_assets to mark as booked (use final dates)
    for (const item of planItems) {
      const { error: assetUpdateError } = await supabase
        .from('media_assets')
        .update({
          status: 'Booked',
          booked_from: finalStartDate,
          booked_to: finalEndDate,
          current_campaign_id: campaignCode,
        })
        .eq('id', item.asset_id)

      if (assetUpdateError) {
        console.error(`Failed to update asset ${item.asset_id}:`, assetUpdateError)
        // Don't fail conversion, just log
      }
    }

    // 10. Update plan status
    const { error: planUpdateError } = await supabase
      .from('plans')
      .update({
        status: 'converted',
        converted_to_campaign_id: campaignCode,
        converted_at: new Date().toISOString(),
      })
      .eq('id', plan_id)

    if (planUpdateError) {
      console.error('Failed to update plan status:', planUpdateError)
      // Don't fail, campaign is created
    }

    console.log(`Successfully converted plan ${plan_id} to campaign ${campaignCode}`)

    return new Response(
      JSON.stringify({
        success: true,
        campaign_id: campaignCode,
        campaign_code: campaignCode,
        campaign,
        message: `Plan successfully converted to campaign ${campaignCode}`,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error) {
    console.error('Error in convert-plan-to-campaign:', error)
    
    const errorMessage = error instanceof Error ? error.message : 'Failed to convert plan to campaign'
    
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

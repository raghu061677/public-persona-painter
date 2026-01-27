// supabase/functions/convert-plan-to-campaign/index.ts
// v9.0 - Schema-validated conversion with proper error handling

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

/**
 * Get effective selling price - Single source of truth for pricing
 * Priority: sales_price (if > 0) > card_rate
 */
function getEffectivePrice(salesPrice: number | null | undefined, cardRate: number | null | undefined): number {
  // Use sales_price if it's a positive number
  if (salesPrice != null && salesPrice > 0) {
    return salesPrice;
  }
  // Fallback to card_rate
  return cardRate || 0;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    if (req.method !== "POST") {
      return jsonError("Only POST is allowed", 405);
    }

    const body = await req.json().catch(() => null) as { plan_id?: string; planId?: string } | null;
    const planId = body?.plan_id || body?.planId;

    if (!planId) {
      return jsonError("Missing required field: plan_id or planId", 400);
    }

    console.log("[v9.0] Converting plan to campaign:", planId);

    // 1) Get current user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return jsonError("Missing authorization header", 401);
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);

    if (userError || !user) {
      console.error("[v9.0] Auth error:", userError);
      return jsonError("Unauthorized – could not load current user", 401);
    }

    // 2) Get user's company
    const { data: companyRow, error: companyError } = await supabase
      .from("company_users")
      .select("company_id")
      .eq("user_id", user.id)
      .eq("status", "active")
      .maybeSingle();

    if (companyError) {
      console.error("[v9.0] Error loading company:", companyError);
      return jsonError("Could not determine company for current user", 400);
    }

    if (!companyRow?.company_id) {
      return jsonError("No active company found for current user", 400);
    }

    const companyId: string = companyRow.company_id;
    console.log("[v9.0] User company ID:", companyId);

    // 3) Load Plan (must be Approved)
    const { data: plan, error: planError } = await supabase
      .from("plans")
      .select(`
        id,
        plan_name,
        status,
        company_id,
        client_id,
        client_name,
        start_date,
        end_date,
        duration_days,
        total_amount,
        gst_percent,
        gst_amount,
        grand_total,
        notes,
        converted_to_campaign_id
      `)
      .eq("id", planId)
      .eq("company_id", companyId)
      .maybeSingle();

    if (planError) {
      console.error("[v9.0] Error loading plan:", planError);
      return jsonError("Could not load plan", 500);
    }

    if (!plan) {
      return jsonError("Plan not found for this company", 404);
    }

    // Check if already converted - return success with existing campaign (idempotent)
    if (plan.converted_to_campaign_id) {
      console.log("[v9.0] Plan already converted to campaign:", plan.converted_to_campaign_id);
      const { data: existingCampaign } = await supabase
        .from('campaigns')
        .select('status')
        .eq('id', plan.converted_to_campaign_id)
        .single();
      
      return new Response(
        JSON.stringify({
          success: true,
          message: "Plan was already converted to campaign",
          campaign_id: plan.converted_to_campaign_id,
          campaign_code: plan.converted_to_campaign_id,
          plan_id: plan.id,
          already_converted: true,
          status: existingCampaign?.status || 'Draft',
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (plan.status !== "Approved") {
      return jsonError(`Plan status is "${plan.status}" - must be "Approved" to convert`, 400);
    }

    console.log("[v9.0] Plan validated:", plan.id, "Status:", plan.status);

    // 4) Load Plan Items
    const { data: planItems, error: itemsError } = await supabase
      .from("plan_items")
      .select(`
        id,
        plan_id,
        asset_id,
        location,
        city,
        area,
        media_type,
        dimensions,
        card_rate,
        sales_price,
        printing_charges,
        mounting_charges,
        total_with_gst,
        state,
        district,
        latitude,
        longitude,
        illumination_type,
        direction,
        total_sqft
      `)
      .eq("plan_id", planId);

    if (itemsError) {
      console.error("[v9.0] Error loading plan items:", itemsError);
      return jsonError("Could not load plan items", 500);
    }

    if (!planItems || planItems.length === 0) {
      return jsonError("Plan has no items to convert", 400);
    }

    console.log(`[v9.0] Loaded ${planItems.length} plan items`);
    
    // Log pricing for each item to debug negotiated price issues
    planItems.forEach((item, idx) => {
      const effectivePrice = getEffectivePrice(item.sales_price, item.card_rate);
      console.log(`[v9.0] Item ${idx + 1}: asset=${item.asset_id}, card_rate=${item.card_rate}, sales_price=${item.sales_price}, effective_price=${effectivePrice}`);
    });

    // 5) Check for booking conflicts with detailed information
    const assetIds = planItems.map(item => item.asset_id);
    const { data: bookedAssets } = await supabase
      .from("media_assets")
      .select("id, location, area, city, status, booked_from, booked_to, current_campaign_id")
      .in("id", assetIds)
      .eq("status", "Booked");

    // Filter for actual date overlaps (booked_from <= plan.end_date AND booked_to >= plan.start_date)
    const conflicts = (bookedAssets || []).filter(asset => {
      if (!asset.booked_from || !asset.booked_to) return false;
      const bookedFrom = new Date(asset.booked_from);
      const bookedTo = new Date(asset.booked_to);
      const planStart = new Date(plan.start_date);
      const planEnd = new Date(plan.end_date);
      return bookedFrom <= planEnd && bookedTo >= planStart;
    });

    if (conflicts.length > 0) {
      console.warn("[v9.0] Booking conflicts found:", conflicts);
      
      // Fetch campaign details for conflicting assets
      const campaignIds = [...new Set(conflicts.map(c => c.current_campaign_id).filter(Boolean))];
      const { data: campaignDetails } = await supabase
        .from("campaigns")
        .select("id, campaign_name, client_name")
        .in("id", campaignIds);
      
      const campaignMap = new Map((campaignDetails || []).map(c => [c.id, c]));
      
      const conflictDetails = conflicts.map(asset => ({
        asset_id: asset.id,
        location: asset.location || asset.area || '',
        city: asset.city || '',
        booked_from: asset.booked_from,
        booked_to: asset.booked_to,
        campaign_id: asset.current_campaign_id,
        campaign_name: campaignMap.get(asset.current_campaign_id)?.campaign_name || 'Unknown',
        client_name: campaignMap.get(asset.current_campaign_id)?.client_name || 'Unknown',
      }));
      
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: `${conflicts.length} asset(s) already booked during this period`,
          conflicts: conflictDetails,
        }),
        {
          status: 409,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // 6) Generate Campaign ID
    const { data: campaignIdData, error: campaignIdError } = await supabase
      .rpc("generate_campaign_id", { p_user_id: user.id });

    if (campaignIdError) {
      console.error("[v9.0] Error generating campaign ID:", campaignIdError);
      return jsonError("Failed to generate campaign ID", 500);
    }

    const campaignId = campaignIdData as string;
    console.log("[v9.0] Generated campaign ID:", campaignId);

    // 7) Insert Campaign - Use 'Draft' status, trigger will auto-update based on dates
    const campaignInsertPayload = {
      id: campaignId,
      plan_id: plan.id,
      company_id: companyId,
      client_id: plan.client_id,
      client_name: plan.client_name,
      campaign_name: plan.plan_name,
      status: 'Draft', // Will be auto-updated by trg_auto_set_campaign_status trigger
      start_date: plan.start_date,
      end_date: plan.end_date,
      total_assets: planItems.length,
      total_amount: plan.total_amount,
      gst_percent: plan.gst_percent,
      gst_amount: plan.gst_amount,
      grand_total: plan.grand_total,
      notes: plan.notes || "",
      created_by: user.id,
      created_from: 'plan',
    };

    console.log("[v9.0] Campaign insert payload:", JSON.stringify(campaignInsertPayload, null, 2));

    const { data: campaign, error: campaignError } = await supabase
      .from("campaigns")
      .insert(campaignInsertPayload)
      .select("id")
      .maybeSingle();

    if (campaignError) {
      console.error("[v9.0] Error inserting campaign:", campaignError);
      return jsonError(`Failed to create campaign: ${campaignError.message}`, 500);
    }

    if (!campaign) {
      return jsonError("Campaign insert did not return a record", 500);
    }

    console.log("[v9.0] Campaign created successfully:", campaign.id);

    // 8) Insert campaign_items (for financial tracking)
    // Use getEffectivePrice helper for consistent pricing
    const campaignItemsPayload = planItems.map((item) => {
      const effectivePrice = getEffectivePrice(item.sales_price, item.card_rate);
      return {
        campaign_id: campaignId,
        plan_item_id: item.id,
        asset_id: item.asset_id,
        start_date: plan.start_date,
        end_date: plan.end_date,
        card_rate: item.card_rate || 0,
        negotiated_rate: effectivePrice, // Use effective price (sales_price if > 0, else card_rate)
        printing_charge: item.printing_charges || 0,
        mounting_charge: item.mounting_charges || 0,
        final_price: item.total_with_gst || 0,
        quantity: 1,
      };
    });

    const { error: campaignItemsError } = await supabase
      .from("campaign_items")
      .insert(campaignItemsPayload);

    if (campaignItemsError) {
      console.error("[v9.0] Error inserting campaign items:", campaignItemsError);
      return jsonError(`Campaign created but failed to attach items: ${campaignItemsError.message}`, 500);
    }

    console.log(`[v9.0] Created ${campaignItemsPayload.length} campaign items`);

    // 9) Insert campaign_assets (for operations tracking with full snapshot)
    // Use getEffectivePrice helper for consistent pricing
    const campaignAssetsPayload = planItems.map((item) => {
      const effectivePrice = getEffectivePrice(item.sales_price, item.card_rate);
      return {
        campaign_id: campaignId,
        asset_id: item.asset_id,
        // Pricing snapshot - use effective price for negotiated_rate
        card_rate: item.card_rate || 0,
        negotiated_rate: effectivePrice, // Use effective price (sales_price if > 0, else card_rate)
        printing_charges: item.printing_charges || 0,
        mounting_charges: item.mounting_charges || 0,
        total_price: item.total_with_gst || 0,
        // Media snapshot
        media_type: item.media_type || "Unknown",
        state: item.state || "",
        district: item.district || "",
        city: item.city || "",
        area: item.area || "",
        location: item.location || "",
        direction: item.direction || "",
        dimensions: item.dimensions || "",
        total_sqft: item.total_sqft || null,
        illumination_type: item.illumination_type || "",
        latitude: item.latitude || null,
        longitude: item.longitude || null,
        // Booking dates
        booking_start_date: plan.start_date,
        booking_end_date: plan.end_date,
        // Status
        status: "Pending" as const,
      };
    });

    const { error: campaignAssetsError } = await supabase
      .from("campaign_assets")
      .insert(campaignAssetsPayload);

    if (campaignAssetsError) {
      console.error("[v9.0] Error inserting campaign assets:", campaignAssetsError);
      return jsonError(`Failed to create campaign assets: ${campaignAssetsError.message}`, 500);
    }

    console.log(`[v9.0] Created ${campaignAssetsPayload.length} campaign assets`);

    // 10) Update media assets to "Booked"
    const { error: assetUpdateError } = await supabase
      .from("media_assets")
      .update({
        status: "Booked",
        booked_from: plan.start_date,
        booked_to: plan.end_date,
        current_campaign_id: campaignId,
      })
      .in("id", assetIds);

    if (assetUpdateError) {
      console.error("[v9.0] Error updating asset statuses:", assetUpdateError);
      // Non-fatal - campaign is still created
    } else {
      console.log(`[v9.0] Updated ${assetIds.length} assets to Booked status`);
    }

    // 11) Update Plan to mark as converted
    const { error: planUpdateError } = await supabase
      .from("plans")
      .update({
        status: "Converted",
        converted_to_campaign_id: campaignId,
        converted_at: new Date().toISOString(),
      })
      .eq("id", planId);

    if (planUpdateError) {
      console.error("[v9.0] Error updating plan after conversion:", planUpdateError);
      // Non-fatal
    }

    console.log("[v9.0] Plan marked as Converted");

    // 12) Log timeline event
    try {
      await supabase.functions.invoke('add-timeline-event', {
        body: {
          campaign_id: campaignId,
          company_id: companyId,
          event_type: 'draft_created',
          event_title: 'Campaign Created from Plan',
          event_description: `Converted from plan ${plan.plan_name}`,
          created_by: user.id,
          metadata: { plan_id: planId },
        },
      });
    } catch (timelineError) {
      console.error('[v9.0] Error logging timeline event:', timelineError);
      // Non-fatal
    }

    // 13) Call auto_update_campaign_status to set correct status based on dates
    try {
      await supabase.rpc('auto_update_campaign_status');
    } catch (statusError) {
      console.error('[v9.0] Error updating campaign status:', statusError);
      // Non-fatal - trigger should have already set correct status
    }

    // Get the actual status after insert
    const { data: createdCampaign } = await supabase
      .from('campaigns')
      .select('status')
      .eq('id', campaignId)
      .single();

    // 14) Success response
    return new Response(
      JSON.stringify({
        success: true,
        message: "Plan converted to campaign successfully",
        campaign_id: campaignId,
        campaign_code: campaignId,
        plan_id: plan.id,
        total_items: planItems.length,
        status: createdCampaign?.status || 'Draft',
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    console.error("[v9.0] Unexpected error in convert-plan-to-campaign:", err);
    return jsonError(`Unexpected error: ${err instanceof Error ? err.message : "Unknown error"}`, 500);
  }
});

function jsonError(message: string, status = 400): Response {
  return new Response(
    JSON.stringify({ success: false, error: message }),
    {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    }
  );
}

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { corsHeaders } from "../_shared/cors.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "No auth header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Verify JWT
    const token = authHeader.replace("Bearer ", "");
    const anonClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!);
    const { data: { user }, error: authError } = await anonClient.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { action, request_id, counter_offer_price, counter_notes, rejection_reason } = await req.json();

    if (!request_id || !action) {
      return new Response(JSON.stringify({ error: "request_id and action required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch the marketplace request with listing details
    const { data: request, error: fetchError } = await supabase
      .from("marketplace_requests")
      .select(`
        *,
        listing:marketplace_listings(
          *,
          media_asset:media_assets(
            id, city, area, location, media_type, dimensions, total_sqft,
            card_rate, base_rate, printing_charge, mounting_charge,
            company_id, direction, illumination_type, district, state,
            latitude, longitude, municipal_authority, municipal_id
          )
        )
      `)
      .eq("id", request_id)
      .single();

    if (fetchError || !request) {
      return new Response(JSON.stringify({ error: "Request not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify the current user owns the listing
    const { data: companyUser } = await supabase
      .from("company_users")
      .select("company_id")
      .eq("user_id", user.id)
      .single();

    if (!companyUser || companyUser.company_id !== request.listing?.company_id) {
      return new Response(JSON.stringify({ error: "Not authorized to manage this request" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let result: Record<string, unknown> = {};

    switch (action) {
      case "accept": {
        // 1. Update request status
        await supabase
          .from("marketplace_requests")
          .update({
            status: "accepted",
            reviewed_at: new Date().toISOString(),
            reviewed_by: user.id,
          })
          .eq("id", request_id);

        // 2. Generate campaign ID
        const now = new Date();
        const monthStr = now.toLocaleString("en", { month: "short" }).toUpperCase();
        const yearStr = String(now.getFullYear());
        const { count } = await supabase
          .from("campaigns")
          .select("*", { count: "exact", head: true })
          .like("id", `CMP-${yearStr}${monthStr}%`);
        const seq = String((count || 0) + 1).padStart(3, "0");
        const campaignId = `CMP-${yearStr}${monthStr}-${seq}`;

        const asset = request.listing?.media_asset;
        const agreedRate = request.offer_price || request.listing?.rate || 0;

        // 3. Create campaign
        const { error: campaignError } = await supabase
          .from("campaigns")
          .insert({
            id: campaignId,
            company_id: request.requesting_company_id,
            campaign_name: request.campaign_name || `Marketplace Campaign - ${asset?.id}`,
            client_name: request.client_name || "Marketplace Booking",
            start_date: request.start_date,
            end_date: request.end_date,
            status: "Upcoming",
            grand_total: agreedRate,
            source: "marketplace",
          });

        if (campaignError) {
          console.error("Campaign creation error:", campaignError);
          throw new Error(`Failed to create campaign: ${campaignError.message}`);
        }

        // 4. Create campaign asset
        if (asset) {
          await supabase.from("campaign_assets").insert({
            campaign_id: campaignId,
            asset_id: asset.id,
            city: asset.city || "",
            area: asset.area || "",
            location: asset.location || "",
            media_type: asset.media_type || "",
            card_rate: asset.card_rate || 0,
            negotiated_rate: agreedRate,
            printing_cost: asset.printing_charge || 0,
            mounting_cost: asset.mounting_charge || 0,
            printing_rate_per_sqft: 0,
            mounting_rate_per_sqft: 0,
            total_sqft: asset.total_sqft || 0,
            dimensions: asset.dimensions || "",
            direction: asset.direction || "",
            illumination_type: asset.illumination_type || "",
            district: asset.district || "",
            state: asset.state || "",
            latitude: asset.latitude,
            longitude: asset.longitude,
            municipal_authority: asset.municipal_authority || "",
            municipal_id: asset.municipal_id || "",
            booking_start_date: request.start_date,
            booking_end_date: request.end_date,
            status: "Pending",
          });
        }

        // 5. Link campaign to request
        await supabase
          .from("marketplace_requests")
          .update({ created_campaign_id: campaignId })
          .eq("id", request_id);

        // 6. Update listing status
        await supabase
          .from("marketplace_listings")
          .update({ status: "booked" })
          .eq("id", request.listing_id);

        // 7. Create marketplace transaction
        const platformFeePercent = 2.0;
        const transactionValue = agreedRate;
        const platformFee = transactionValue * (platformFeePercent / 100);
        const netAmount = transactionValue - platformFee;

        await supabase.from("marketplace_transactions").insert({
          listing_id: request.listing_id,
          campaign_id: campaignId,
          seller_company_id: request.listing?.company_id,
          buyer_company_id: request.requesting_company_id,
          transaction_value: transactionValue,
          platform_fee_percent: platformFeePercent,
          platform_fee: platformFee,
          platform_fee_type: "percentage",
          net_amount: netAmount,
          status: "pending",
        });

        // 8. Create asset booking record
        await supabase.from("asset_bookings").insert({
          asset_id: asset?.id,
          campaign_id: campaignId,
          start_date: request.start_date,
          end_date: request.end_date,
          booking_type: "marketplace",
          status: "confirmed",
        });

        result = { campaign_id: campaignId, message: "Booking accepted, campaign created" };
        break;
      }

      case "reject": {
        await supabase
          .from("marketplace_requests")
          .update({
            status: "rejected",
            rejection_reason: rejection_reason || "Rejected by owner",
            reviewed_at: new Date().toISOString(),
            reviewed_by: user.id,
          })
          .eq("id", request_id);

        result = { message: "Request rejected" };
        break;
      }

      case "counter": {
        if (!counter_offer_price) {
          return new Response(JSON.stringify({ error: "counter_offer_price required" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        await supabase
          .from("marketplace_requests")
          .update({
            status: "countered",
            counter_offer_price,
            counter_notes: counter_notes || null,
            reviewed_at: new Date().toISOString(),
            reviewed_by: user.id,
          })
          .eq("id", request_id);

        result = { message: "Counter offer sent" };
        break;
      }

      default:
        return new Response(JSON.stringify({ error: `Unknown action: ${action}` }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Error:", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

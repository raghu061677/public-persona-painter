// supabase/functions/get-media-availability/index.ts
// v1.0 - Complete media availability checker with date range overlap detection

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface AvailabilityRequest {
  company_id: string;
  start_date: string;
  end_date: string;
  city?: string;
  media_type?: string;
  include_public?: boolean;
}

interface MediaAsset {
  id: string;
  media_asset_code: string | null;
  city: string;
  area: string;
  location: string;
  media_type: string;
  dimensions: string | null;
  card_rate: number;
  total_sqft: number | null;
  status: string;
  direction: string | null;
  illumination_type: string | null;
  latitude: number | null;
  longitude: number | null;
  primary_photo_url: string | null;
  is_public: boolean;
}

interface BookingInfo {
  campaign_id: string;
  campaign_name: string;
  client_name: string;
  start_date: string;
  end_date: string;
  status: string;
}

interface AvailableAsset extends MediaAsset {
  availability_status: 'available' | 'available_soon';
  next_available_from: string | null;
}

interface BookedAsset extends MediaAsset {
  availability_status: 'booked' | 'conflict';
  current_booking: BookingInfo | null;
  all_bookings: BookingInfo[];
  available_from: string | null;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    if (req.method !== "POST") {
      return jsonError("Only POST is allowed", 405);
    }

    const body = await req.json().catch(() => null) as AvailabilityRequest | null;

    if (!body) {
      return jsonError("Invalid request body", 400);
    }

    const { company_id, start_date, end_date, city, media_type, include_public = true } = body;

    if (!company_id || !start_date || !end_date) {
      return jsonError("Missing required fields: company_id, start_date, end_date", 400);
    }

    console.log(`[get-media-availability] Checking availability for ${start_date} to ${end_date}`);

    // First, update campaign statuses to ensure data is current
    await supabase.rpc('auto_update_campaign_status');

    // 1) Get all media assets for the company
    let assetsQuery = supabase
      .from('media_assets')
      .select(`
        id,
        media_asset_code,
        city,
        area,
        location,
        media_type,
        dimensions,
        card_rate,
        total_sqft,
        status,
        direction,
        illumination_type,
        latitude,
        longitude,
        primary_photo_url,
        is_public,
        booked_from,
        booked_to,
        current_campaign_id
      `)
      .eq('company_id', company_id);

    if (city && city !== 'all') {
      assetsQuery = assetsQuery.eq('city', city);
    }

    if (media_type && media_type !== 'all') {
      assetsQuery = assetsQuery.eq('media_type', media_type);
    }

    const { data: allAssets, error: assetsError } = await assetsQuery;

    if (assetsError) {
      console.error('[get-media-availability] Error fetching assets:', assetsError);
      return jsonError('Failed to fetch assets', 500);
    }

    if (!allAssets || allAssets.length === 0) {
      return jsonResponse({
        available_assets: [],
        booked_assets: [],
        summary: {
          total_assets: 0,
          available_count: 0,
          booked_count: 0,
          available_soon_count: 0,
        }
      });
    }

    const assetIds = allAssets.map(a => a.id);

    // 2) Get all campaign bookings that overlap with the requested date range
    // A booking overlaps if: booking.start <= search.end AND booking.end >= search.start
    const { data: overlappingBookings, error: bookingsError } = await supabase
      .from('campaign_assets')
      .select(`
        asset_id,
        campaign_id,
        booking_start_date,
        booking_end_date,
        campaigns!inner (
          id,
          campaign_name,
          client_name,
          start_date,
          end_date,
          status
        )
      `)
      .in('asset_id', assetIds)
      .in('campaigns.status', ['Draft', 'Upcoming', 'Running']);

    if (bookingsError) {
      console.error('[get-media-availability] Error fetching bookings:', bookingsError);
      return jsonError('Failed to fetch bookings', 500);
    }

    // 3) Build a map of asset_id -> bookings (filtered by date overlap)
    const assetBookingsMap = new Map<string, BookingInfo[]>();

    for (const booking of (overlappingBookings || [])) {
      const campaign = booking.campaigns as any;
      if (!campaign) continue;

      const bookingStart = booking.booking_start_date || campaign.start_date;
      const bookingEnd = booking.booking_end_date || campaign.end_date;

      // Check date overlap: booking overlaps search range if
      // bookingStart <= end_date AND bookingEnd >= start_date
      const searchStart = new Date(start_date);
      const searchEnd = new Date(end_date);
      const bStart = new Date(bookingStart);
      const bEnd = new Date(bookingEnd);

      if (bStart <= searchEnd && bEnd >= searchStart) {
        const bookingInfo: BookingInfo = {
          campaign_id: campaign.id,
          campaign_name: campaign.campaign_name,
          client_name: campaign.client_name,
          start_date: bookingStart,
          end_date: bookingEnd,
          status: campaign.status,
        };

        const existing = assetBookingsMap.get(booking.asset_id) || [];
        existing.push(bookingInfo);
        assetBookingsMap.set(booking.asset_id, existing);
      }
    }

    // 4) Also get future bookings for "available soon" assets
    const { data: futureBookings } = await supabase
      .from('campaign_assets')
      .select(`
        asset_id,
        booking_start_date,
        booking_end_date,
        campaigns!inner (
          id,
          campaign_name,
          client_name,
          start_date,
          end_date,
          status
        )
      `)
      .in('asset_id', assetIds)
      .in('campaigns.status', ['Draft', 'Upcoming', 'Running'])
      .order('booking_start_date', { ascending: true });

    // Build map for next availability
    const assetNextAvailableMap = new Map<string, string>();
    for (const booking of (futureBookings || [])) {
      const campaign = booking.campaigns as any;
      if (!campaign) continue;
      
      const bookingEnd = booking.booking_end_date || campaign.end_date;
      const assetId = booking.asset_id;
      
      // Calculate next available date (day after booking ends)
      const endDate = new Date(bookingEnd);
      endDate.setDate(endDate.getDate() + 1);
      const nextAvailable = endDate.toISOString().split('T')[0];
      
      const existing = assetNextAvailableMap.get(assetId);
      if (!existing || nextAvailable > existing) {
        assetNextAvailableMap.set(assetId, nextAvailable);
      }
    }

    // 5) Categorize assets
    const availableAssets: AvailableAsset[] = [];
    const bookedAssets: BookedAsset[] = [];

    for (const asset of allAssets) {
      const overlappingCampaigns = assetBookingsMap.get(asset.id) || [];
      
      if (overlappingCampaigns.length === 0) {
        // No overlapping bookings - asset is available for requested dates
        availableAssets.push({
          ...asset,
          availability_status: 'available',
          next_available_from: null,
        });
      } else {
        // Has overlapping bookings - asset is booked
        const sortedBookings = overlappingCampaigns.sort((a, b) => 
          new Date(a.start_date).getTime() - new Date(b.start_date).getTime()
        );
        
        const nextAvailable = assetNextAvailableMap.get(asset.id) || null;
        
        bookedAssets.push({
          ...asset,
          availability_status: overlappingCampaigns.length > 1 ? 'conflict' : 'booked',
          current_booking: sortedBookings[0],
          all_bookings: sortedBookings,
          available_from: nextAvailable,
        });
      }
    }

    // 6) Get assets that are currently booked but will become available during search period
    const availableSoonAssets = bookedAssets.filter(asset => {
      if (!asset.available_from) return false;
      const availableDate = new Date(asset.available_from);
      const searchEnd = new Date(end_date);
      return availableDate <= searchEnd;
    });

    // 7) Build summary
    const summary = {
      total_assets: allAssets.length,
      available_count: availableAssets.length,
      booked_count: bookedAssets.length,
      available_soon_count: availableSoonAssets.length,
      conflict_count: bookedAssets.filter(a => a.availability_status === 'conflict').length,
      total_sqft_available: availableAssets.reduce((sum, a) => sum + (a.total_sqft || 0), 0),
      potential_revenue: availableAssets.reduce((sum, a) => sum + (a.card_rate || 0), 0),
    };

    console.log(`[get-media-availability] Results: ${availableAssets.length} available, ${bookedAssets.length} booked`);

    return jsonResponse({
      available_assets: availableAssets,
      booked_assets: bookedAssets,
      available_soon_assets: availableSoonAssets,
      summary,
      search_params: {
        start_date,
        end_date,
        city,
        media_type,
      }
    });

  } catch (err) {
    console.error("[get-media-availability] Unexpected error:", err);
    return jsonError(`Unexpected error: ${err instanceof Error ? err.message : "Unknown error"}`, 500);
  }
});

function jsonResponse(data: any): Response {
  return new Response(
    JSON.stringify(data),
    {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    }
  );
}

function jsonError(message: string, status = 400): Response {
  return new Response(
    JSON.stringify({ success: false, error: message }),
    {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    }
  );
}

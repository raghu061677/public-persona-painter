// supabase/functions/get-media-availability/index.ts
// v2.0 - Robust media availability checker with comprehensive date range overlap detection

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-application-name",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface AvailabilityRequest {
  company_id: string;
  start_date: string;
  end_date: string;
  city?: string;
  media_type?: string;
}

interface BookingInfo {
  campaign_id: string;
  campaign_name: string;
  client_name: string;
  start_date: string;
  end_date: string;
  status: string;
}

interface BaseAsset {
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
  booked_from: string | null;
  booked_to: string | null;
  current_campaign_id: string | null;
}

interface AvailableAsset extends BaseAsset {
  availability_status: 'available' | 'available_soon';
  next_available_from: string | null;
}

interface BookedAsset extends BaseAsset {
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

    const { company_id, start_date, end_date, city, media_type } = body;

    if (!company_id || !start_date || !end_date) {
      return jsonError("Missing required fields: company_id, start_date, end_date", 400);
    }

    console.log(`[get-media-availability] Checking availability for company ${company_id}, dates: ${start_date} to ${end_date}`);

    // First, update campaign statuses to ensure data is current
    try {
      await supabase.rpc('auto_update_campaign_status');
    } catch (rpcErr) {
      console.warn('[get-media-availability] Warning: Could not update campaign status:', rpcErr);
      // Continue anyway - status update is not critical
    }

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
        qr_code_url,
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
      return jsonError('Failed to fetch assets: ' + assetsError.message, 500);
    }

    // Return empty but valid response if no assets
    if (!allAssets || allAssets.length === 0) {
      console.log('[get-media-availability] No assets found for company');
      return jsonResponse({
        available_assets: [],
        booked_assets: [],
        available_soon_assets: [],
        summary: {
          total_assets: 0,
          available_count: 0,
          booked_count: 0,
          available_soon_count: 0,
          conflict_count: 0,
          total_sqft_available: 0,
          potential_revenue: 0,
        },
        search_params: { start_date, end_date, city, media_type }
      });
    }

    const assetIds = allAssets.map(a => a.id);
    const searchStart = new Date(start_date);
    const searchEnd = new Date(end_date);

    console.log(`[get-media-availability] Found ${allAssets.length} assets, checking bookings...`);

    // 2) Get all campaign bookings for these assets from active campaigns
    const { data: allBookings, error: bookingsError } = await supabase
      .from('campaign_assets')
      .select(`
        asset_id,
        campaign_id,
        booking_start_date,
        booking_end_date,
        campaigns (
          id,
          campaign_name,
          client_name,
          start_date,
          end_date,
          status
        )
      `)
      .in('asset_id', assetIds);

    if (bookingsError) {
      console.error('[get-media-availability] Error fetching bookings:', bookingsError);
      // Continue with available assets only
    }

    // 3) Build a map of asset_id -> active bookings that overlap with search range
    const assetOverlappingBookingsMap = new Map<string, BookingInfo[]>();
    const assetAllBookingsMap = new Map<string, BookingInfo[]>();
    const assetNextAvailableMap = new Map<string, string>();

    for (const booking of (allBookings || [])) {
      const campaign = booking.campaigns as any;
      if (!campaign) continue;

      // Skip completed, cancelled, archived campaigns for availability check
      const activeStatuses = ['Draft', 'Upcoming', 'Running'];
      const isActive = activeStatuses.includes(campaign.status);

      // Get booking dates, fallback to campaign dates
      const bookingStart = booking.booking_start_date || campaign.start_date;
      const bookingEnd = booking.booking_end_date || campaign.end_date;

      // Handle null dates gracefully
      if (!bookingStart || !bookingEnd) continue;

      const bStart = new Date(bookingStart);
      const bEnd = new Date(bookingEnd);

      const bookingInfo: BookingInfo = {
        campaign_id: campaign.id,
        campaign_name: campaign.campaign_name || 'Unnamed Campaign',
        client_name: campaign.client_name || 'Unknown Client',
        start_date: bookingStart,
        end_date: bookingEnd,
        status: campaign.status || 'Unknown',
      };

      // Store all bookings for reference
      const allExisting = assetAllBookingsMap.get(booking.asset_id) || [];
      allExisting.push(bookingInfo);
      assetAllBookingsMap.set(booking.asset_id, allExisting);

      // Only consider active campaigns for overlap detection
      if (!isActive) continue;

      // Check date overlap: booking overlaps search range if
      // bookingStart <= search_end AND bookingEnd >= search_start
      const hasOverlap = bStart <= searchEnd && bEnd >= searchStart;

      if (hasOverlap) {
        const existing = assetOverlappingBookingsMap.get(booking.asset_id) || [];
        existing.push(bookingInfo);
        assetOverlappingBookingsMap.set(booking.asset_id, existing);
      }

      // Calculate next available date for assets that are currently booked
      // but will be free during or before the end of search period
      if (bEnd < searchEnd) {
        const nextAvailableDate = new Date(bEnd);
        nextAvailableDate.setDate(nextAvailableDate.getDate() + 1);
        const nextAvailableStr = nextAvailableDate.toISOString().split('T')[0];

        const existingNext = assetNextAvailableMap.get(booking.asset_id);
        // Keep the latest "next available" date (after all bookings end)
        if (!existingNext || nextAvailableStr > existingNext) {
          assetNextAvailableMap.set(booking.asset_id, nextAvailableStr);
        }
      }
    }

    console.log(`[get-media-availability] Processed ${allBookings?.length || 0} booking records`);

    // 4) Categorize assets
    const availableAssets: AvailableAsset[] = [];
    const bookedAssets: BookedAsset[] = [];
    const availableSoonAssets: BookedAsset[] = [];

    for (const asset of allAssets) {
      const overlappingCampaigns = assetOverlappingBookingsMap.get(asset.id) || [];
      const allAssetBookings = assetAllBookingsMap.get(asset.id) || [];
      const nextAvailable = assetNextAvailableMap.get(asset.id) || null;

      // Asset with DB status check plus overlap detection
      const isDbStatusBooked = asset.status === 'Booked';
      const hasOverlappingBookings = overlappingCampaigns.length > 0;

      if (!hasOverlappingBookings && !isDbStatusBooked) {
        // No overlapping bookings and status is not Booked - asset is available
        availableAssets.push({
          ...asset,
          availability_status: 'available',
          next_available_from: null,
        });
      } else if (!hasOverlappingBookings && isDbStatusBooked && asset.booked_to) {
        // Status is Booked but no overlapping campaigns - check if it becomes available
        const bookedToDate = new Date(asset.booked_to);
        
        if (bookedToDate < searchStart) {
          // Booking ended before search period - should be available
          // (This is a case where the trigger may not have fired yet)
          availableAssets.push({
            ...asset,
            availability_status: 'available',
            next_available_from: null,
          });
        } else if (bookedToDate <= searchEnd) {
          // Will become available during search period
          const nextDate = new Date(bookedToDate);
          nextDate.setDate(nextDate.getDate() + 1);
          
          const bookedAsset: BookedAsset = {
            ...asset,
            availability_status: 'booked',
            current_booking: null,
            all_bookings: allAssetBookings,
            available_from: nextDate.toISOString().split('T')[0],
          };
          bookedAssets.push(bookedAsset);
          availableSoonAssets.push(bookedAsset);
        } else {
          // Booked beyond search period
          bookedAssets.push({
            ...asset,
            availability_status: 'booked',
            current_booking: null,
            all_bookings: allAssetBookings,
            available_from: null,
          });
        }
      } else {
        // Has overlapping bookings - asset is booked
        const sortedBookings = overlappingCampaigns.sort((a, b) => 
          new Date(a.start_date).getTime() - new Date(b.start_date).getTime()
        );

        const isConflict = overlappingCampaigns.length > 1;
        
        const bookedAsset: BookedAsset = {
          ...asset,
          availability_status: isConflict ? 'conflict' : 'booked',
          current_booking: sortedBookings[0] || null,
          all_bookings: sortedBookings,
          available_from: nextAvailable,
        };

        bookedAssets.push(bookedAsset);

        // Check if it becomes available during search period
        if (nextAvailable) {
          const availableDate = new Date(nextAvailable);
          if (availableDate <= searchEnd) {
            availableSoonAssets.push(bookedAsset);
          }
        }
      }
    }

    // 5) Build summary
    const summary = {
      total_assets: allAssets.length,
      available_count: availableAssets.length,
      booked_count: bookedAssets.length,
      available_soon_count: availableSoonAssets.length,
      conflict_count: bookedAssets.filter(a => a.availability_status === 'conflict').length,
      total_sqft_available: availableAssets.reduce((sum, a) => sum + (Number(a.total_sqft) || 0), 0),
      potential_revenue: availableAssets.reduce((sum, a) => sum + (Number(a.card_rate) || 0), 0),
    };

    console.log(`[get-media-availability] Results: ${availableAssets.length} available, ${bookedAssets.length} booked, ${availableSoonAssets.length} available soon`);

    return jsonResponse({
      available_assets: availableAssets,
      booked_assets: bookedAssets,
      available_soon_assets: availableSoonAssets,
      summary,
      search_params: {
        start_date,
        end_date,
        city: city || null,
        media_type: media_type || null,
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
    JSON.stringify({ 
      success: false, 
      error: message,
      available_assets: [],
      booked_assets: [],
      available_soon_assets: [],
      summary: {
        total_assets: 0,
        available_count: 0,
        booked_count: 0,
        available_soon_count: 0,
        conflict_count: 0,
        total_sqft_available: 0,
        potential_revenue: 0,
      }
    }),
    {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    }
  );
}

// supabase/functions/get-media-availability/index.ts
// v3.0 - Fixed availability engine with proper date-range overlap detection
// Key fix: "Available Soon" properly computed based on booking end dates within range

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

interface BookingInterval {
  start: Date;
  end: Date;
  info: BookingInfo;
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
  qr_code_url: string | null;
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

// Core availability computation result
interface AvailabilityResult {
  status: 'AVAILABLE' | 'AVAILABLE_SOON' | 'BOOKED' | 'CONFLICT';
  available_from: string | null;
  available_until: string | null;
  reason?: string;
  merged_bookings: BookingInterval[];
}

/**
 * Parse date string to Date object (day only, no time)
 */
function parseDay(dateStr: string): Date {
  const d = new Date(dateStr);
  d.setHours(0, 0, 0, 0);
  return d;
}

/**
 * Format date to YYYY-MM-DD string
 */
function formatDay(date: Date): string {
  return date.toISOString().split('T')[0];
}

/**
 * Add days to a date
 */
function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

/**
 * Check if two date ranges overlap (inclusive)
 * Overlap exists if: start1 <= end2 AND end1 >= start2
 */
function rangesOverlap(start1: Date, end1: Date, start2: Date, end2: Date): boolean {
  return start1 <= end2 && end1 >= start2;
}

/**
 * Merge overlapping/adjacent booking intervals
 * Returns sorted, merged intervals
 */
function mergeIntervals(intervals: BookingInterval[]): BookingInterval[] {
  if (intervals.length === 0) return [];
  
  // Sort by start date
  const sorted = [...intervals].sort((a, b) => a.start.getTime() - b.start.getTime());
  
  const merged: BookingInterval[] = [sorted[0]];
  
  for (let i = 1; i < sorted.length; i++) {
    const current = sorted[i];
    const last = merged[merged.length - 1];
    
    // Check if intervals overlap or are adjacent (end + 1 day = next start)
    const lastEndPlus1 = addDays(last.end, 1);
    if (current.start <= lastEndPlus1) {
      // Merge: extend end if current ends later
      if (current.end > last.end) {
        last.end = current.end;
      }
    } else {
      merged.push(current);
    }
  }
  
  return merged;
}

/**
 * Core function: Compute availability for an asset within a date range
 * 
 * Status rules:
 * - AVAILABLE: No booking overlap with [rangeStart, rangeEnd]
 * - AVAILABLE_SOON: Has booking overlap but becomes free within the range
 * - BOOKED: Booking covers the entire range (no free day)
 * - CONFLICT: Multiple overlapping bookings or invalid data
 */
function computeAvailabilityForRange(
  bookings: BookingInterval[],
  rangeStart: Date,
  rangeEnd: Date
): AvailabilityResult {
  // No bookings = AVAILABLE
  if (bookings.length === 0) {
    return {
      status: 'AVAILABLE',
      available_from: formatDay(rangeStart),
      available_until: formatDay(rangeEnd),
      merged_bookings: [],
    };
  }
  
  // Filter bookings that overlap with the search range
  const overlappingBookings = bookings.filter(b => 
    rangesOverlap(b.start, b.end, rangeStart, rangeEnd)
  );
  
  // No overlap = AVAILABLE
  if (overlappingBookings.length === 0) {
    return {
      status: 'AVAILABLE',
      available_from: formatDay(rangeStart),
      available_until: formatDay(rangeEnd),
      merged_bookings: [],
    };
  }
  
  // Check for conflicts (true overlapping bookings, not just sequential)
  const sortedByStart = [...overlappingBookings].sort((a, b) => 
    a.start.getTime() - b.start.getTime()
  );
  
  let hasConflict = false;
  for (let i = 0; i < sortedByStart.length - 1; i++) {
    const current = sortedByStart[i];
    const next = sortedByStart[i + 1];
    // Conflict if bookings truly overlap (not just adjacent)
    if (next.start <= current.end) {
      hasConflict = true;
      break;
    }
  }
  
  // Merge intervals to compute coverage
  const mergedBookings = mergeIntervals(overlappingBookings);
  
  // Find if asset becomes free within the range
  // Check each merged booking to see if it ends before rangeEnd
  let earliestFreeDate: Date | null = null;
  
  for (const booking of mergedBookings) {
    // If booking ends before rangeEnd, asset becomes free on booking.end + 1 day
    if (booking.end < rangeEnd) {
      const freeDate = addDays(booking.end, 1);
      // Only count if free date is within range
      if (freeDate >= rangeStart && freeDate <= rangeEnd) {
        if (!earliestFreeDate || freeDate < earliestFreeDate) {
          earliestFreeDate = freeDate;
        }
      }
    }
  }
  
  // Check if booking fully covers the range (no free day)
  // Asset is fully booked if merged coverage spans entire range
  const firstMerged = mergedBookings[0];
  const lastMerged = mergedBookings[mergedBookings.length - 1];
  
  // Check if there's any gap in coverage within the range
  let hasGapInRange = false;
  let gapStart: Date | null = null;
  
  // Check gap before first booking
  if (firstMerged.start > rangeStart) {
    hasGapInRange = true;
    gapStart = rangeStart;
  }
  
  // Check gaps between bookings
  if (!hasGapInRange) {
    for (let i = 0; i < mergedBookings.length - 1; i++) {
      const gapStartDate = addDays(mergedBookings[i].end, 1);
      const nextBookingStart = mergedBookings[i + 1].start;
      if (gapStartDate < nextBookingStart && gapStartDate <= rangeEnd) {
        hasGapInRange = true;
        if (!gapStart || gapStartDate < gapStart) {
          gapStart = gapStartDate;
        }
        break;
      }
    }
  }
  
  // Check gap after last booking
  if (!hasGapInRange && lastMerged.end < rangeEnd) {
    hasGapInRange = true;
    gapStart = addDays(lastMerged.end, 1);
  }
  
  // If there's a free date within range = AVAILABLE_SOON
  if (earliestFreeDate || hasGapInRange) {
    const availableFrom = earliestFreeDate || gapStart || rangeStart;
    return {
      status: hasConflict ? 'CONFLICT' : 'AVAILABLE_SOON',
      available_from: formatDay(availableFrom),
      available_until: formatDay(rangeEnd),
      reason: hasConflict ? 'Multiple overlapping bookings' : undefined,
      merged_bookings: mergedBookings,
    };
  }
  
  // Fully booked
  return {
    status: hasConflict ? 'CONFLICT' : 'BOOKED',
    available_from: null,
    available_until: null,
    reason: hasConflict ? 'Multiple overlapping bookings' : 'Fully booked during period',
    merged_bookings: mergedBookings,
  };
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

    const rangeStart = parseDay(start_date);
    const rangeEnd = parseDay(end_date);

    console.log(`[get-media-availability] v3.0 - Checking company ${company_id}, range: ${start_date} to ${end_date}`);

    // Update campaign statuses
    try {
      await supabase.rpc('auto_update_campaign_status');
    } catch (rpcErr) {
      console.warn('[get-media-availability] Could not update campaign status:', rpcErr);
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

    if (!allAssets || allAssets.length === 0) {
      console.log('[get-media-availability] No assets found');
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
    console.log(`[get-media-availability] Found ${allAssets.length} assets`);

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
    }

    // 3) Build asset -> bookings map
    const assetBookingsMap = new Map<string, BookingInterval[]>();
    const assetAllBookingsInfoMap = new Map<string, BookingInfo[]>();

    for (const booking of (allBookings || [])) {
      const campaign = booking.campaigns as any;
      if (!campaign) continue;

      // Only consider active campaigns
      const activeStatuses = ['Draft', 'Upcoming', 'Running'];
      const isActive = activeStatuses.includes(campaign.status);

      // Get booking dates, fallback to campaign dates
      const bookingStartStr = booking.booking_start_date || campaign.start_date;
      const bookingEndStr = booking.booking_end_date || campaign.end_date;

      if (!bookingStartStr || !bookingEndStr) continue;

      const bookingStart = parseDay(bookingStartStr);
      const bookingEnd = parseDay(bookingEndStr);

      // Validate dates
      if (bookingEnd < bookingStart) {
        console.warn(`[get-media-availability] Invalid booking dates for asset ${booking.asset_id}: ${bookingStartStr} to ${bookingEndStr}`);
        continue;
      }

      const bookingInfo: BookingInfo = {
        campaign_id: campaign.id,
        campaign_name: campaign.campaign_name || 'Unnamed Campaign',
        client_name: campaign.client_name || 'Unknown Client',
        start_date: bookingStartStr,
        end_date: bookingEndStr,
        status: campaign.status || 'Unknown',
      };

      // Store all booking info for reference
      const allInfoList = assetAllBookingsInfoMap.get(booking.asset_id) || [];
      allInfoList.push(bookingInfo);
      assetAllBookingsInfoMap.set(booking.asset_id, allInfoList);

      // Only use active bookings for availability calculation
      if (!isActive) continue;

      const interval: BookingInterval = {
        start: bookingStart,
        end: bookingEnd,
        info: bookingInfo,
      };

      const intervals = assetBookingsMap.get(booking.asset_id) || [];
      intervals.push(interval);
      assetBookingsMap.set(booking.asset_id, intervals);
    }

    console.log(`[get-media-availability] Processed ${allBookings?.length || 0} booking records`);

    // 4) Categorize assets using the core availability function
    const availableAssets: AvailableAsset[] = [];
    const bookedAssets: BookedAsset[] = [];
    const availableSoonAssets: BookedAsset[] = [];

    for (const asset of allAssets) {
      const bookings = assetBookingsMap.get(asset.id) || [];
      const allBookingsInfo = assetAllBookingsInfoMap.get(asset.id) || [];
      
      // Compute availability using core function
      const result = computeAvailabilityForRange(bookings, rangeStart, rangeEnd);

      // Sort bookings by start date for display
      const sortedBookingsInfo = [...allBookingsInfo].sort((a, b) => 
        new Date(a.start_date).getTime() - new Date(b.start_date).getTime()
      );

      // Find current/first booking for display
      const currentBooking = sortedBookingsInfo.find(b => 
        rangesOverlap(parseDay(b.start_date), parseDay(b.end_date), rangeStart, rangeEnd)
      ) || null;

      switch (result.status) {
        case 'AVAILABLE':
          availableAssets.push({
            ...asset,
            availability_status: 'available',
            next_available_from: result.available_from,
          });
          break;
          
        case 'AVAILABLE_SOON':
          const availableSoonAsset: BookedAsset = {
            ...asset,
            availability_status: 'booked', // Still technically booked now
            current_booking: currentBooking,
            all_bookings: sortedBookingsInfo,
            available_from: result.available_from,
          };
          bookedAssets.push(availableSoonAsset);
          availableSoonAssets.push(availableSoonAsset);
          break;
          
        case 'BOOKED':
          bookedAssets.push({
            ...asset,
            availability_status: 'booked',
            current_booking: currentBooking,
            all_bookings: sortedBookingsInfo,
            available_from: null,
          });
          break;
          
        case 'CONFLICT':
          bookedAssets.push({
            ...asset,
            availability_status: 'conflict',
            current_booking: currentBooking,
            all_bookings: sortedBookingsInfo,
            available_from: result.available_from,
          });
          break;
      }
    }

    // 5) Build summary
    const summary = {
      total_assets: allAssets.length,
      available_count: availableAssets.length,
      booked_count: bookedAssets.filter(a => a.availability_status === 'booked' && !availableSoonAssets.includes(a)).length,
      available_soon_count: availableSoonAssets.length,
      conflict_count: bookedAssets.filter(a => a.availability_status === 'conflict').length,
      total_sqft_available: availableAssets.reduce((sum, a) => sum + (Number(a.total_sqft) || 0), 0),
      potential_revenue: availableAssets.reduce((sum, a) => sum + (Number(a.card_rate) || 0), 0),
    };

    console.log(`[get-media-availability] Results: available=${availableAssets.length}, booked=${bookedAssets.length - availableSoonAssets.length}, soon=${availableSoonAssets.length}, conflicts=${summary.conflict_count}`);

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

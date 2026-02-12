/**
 * get-media-availability — Phase-5 hardened
 * v5.0 - Uses getAuthContext, company derived from JWT
 * Roles: admin, sales, ops (read-only)
 */
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import {
  withAuth,
  getAuthContext,
  requireRole,
  supabaseServiceClient,
  jsonError as authJsonError,
} from '../_shared/auth.ts';
import { corsHeaders } from '../_shared/cors.ts';

interface AvailabilityParams {
  start_date: string;
  end_date: string;
  city?: string;
  media_type?: string;
}

interface AvailabilityResult {
  available_assets: any[];
  booked_assets: any[];
  available_soon_assets: any[];
  summary: AvailabilitySummary;
  search_params: AvailabilityParams;
}

interface AvailabilitySummary {
  total_assets: number;
  available_count: number;
  booked_count: number;
  available_soon_count: number;
  total_sqft_available: number;
  potential_revenue: number;
}

interface MediaAsset {
  id: string;
  media_asset_code: string;
  city: string;
  area: string;
  location: string;
  media_type: string;
  dimensions: string;
  card_rate: number;
  total_sqft: number;
  status: string;
  direction: string;
  illumination_type: string;
  latitude: number;
  longitude: number;
  primary_photo_url: string;
  qr_code_url: string;
  is_public: boolean;
  booked_from: string;
  booked_to: string;
  current_campaign_id: string;
}

interface AvailabilityAsset extends MediaAsset {
  availability_status: 'available' | 'booked';
  available_from?: string;
  current_booking?: BookingInfo | null;
  all_bookings?: BookingInfo[];
}

interface CampaignAsset {
  asset_id: string;
  campaign_id: string;
  booking_start_date: string;
  booking_end_date: string;
  campaigns: {
    id: string;
    campaign_name: string;
    client_name: string;
    start_date: string;
    end_date: string;
    status: string;
  };
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

function parseDay(dateStr: string): Date {
  const d = new Date(dateStr);
  d.setHours(0, 0, 0, 0);
  return d;
}

function formatDay(date: Date): string {
  return date.toISOString().split('T')[0];
}

function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

function rangesOverlap(start1: Date, end1: Date, start2: Date, end2: Date): boolean {
  return start1 <= end2 && end1 >= start2;
}

function mergeIntervals(intervals: BookingInterval[]): BookingInterval[] {
  if (intervals.length === 0) return [];
  const sorted = [...intervals].sort((a, b) => a.start.getTime() - b.start.getTime());
  const merged: BookingInterval[] = [sorted[0]];
  for (let i = 1; i < sorted.length; i++) {
    const current = sorted[i];
    const last = merged[merged.length - 1];
    if (current.start <= addDays(last.end, 1)) {
      if (current.end > last.end) last.end = current.end;
    } else {
      merged.push(current);
    }
  }
  return merged;
}

function computeAvailabilityForRange(bookings: BookingInterval[], rangeStart: Date, rangeEnd: Date) {
  if (bookings.length === 0) return { status: 'AVAILABLE' as const, available_from: formatDay(rangeStart), merged_bookings: [] };
  const overlapping = bookings.filter(b => rangesOverlap(b.start, b.end, rangeStart, rangeEnd));
  if (overlapping.length === 0) return { status: 'AVAILABLE' as const, available_from: formatDay(rangeStart), merged_bookings: [] };
  const mergedBookings = mergeIntervals(overlapping);
  let latestEnd: Date | null = null;
  for (const b of mergedBookings) { if (!latestEnd || b.end > latestEnd) latestEnd = b.end; }
  let availableFrom: string | null = null;
  if (latestEnd) { const free = addDays(latestEnd, 1); if (free <= rangeEnd) availableFrom = formatDay(free); }
  return { status: 'BOOKED' as const, available_from: availableFrom, merged_bookings: mergedBookings };
}

function jsonError(message: string, status = 400): Response {
  return new Response(
    JSON.stringify({ success: false, error: message, available_assets: [], booked_assets: [], summary: { total_assets: 0, available_count: 0, booked_count: 0, total_sqft_available: 0, potential_revenue: 0 } }),
    { status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}

function jsonResponse(data: any): Response {
  return new Response(JSON.stringify(data), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}

serve(withAuth(async (req) => {
  if (req.method !== "POST") return jsonError("Only POST is allowed", 405);

  const ctx = await getAuthContext(req);
  requireRole(ctx, ['admin', 'sales', 'ops']);

  const body = await req.json().catch(() => null);
  if (!body) return jsonError("Invalid request body", 400);

  const { start_date, end_date, city, media_type } = body;
  if (!start_date || !end_date) return jsonError("Missing required fields: start_date, end_date", 400);

  // Company from JWT — ignore any body.company_id
  const companyId = ctx.companyId;
  const rangeStart = parseDay(start_date);
  const rangeEnd = parseDay(end_date);

  console.log(`[get-media-availability] v5.0 company=${companyId}, range=${start_date} to ${end_date}`);

  // Use service client for cross-table reads (campaign_assets -> campaigns join)
  const supabase = supabaseServiceClient();

  try { await supabase.rpc('auto_update_campaign_status'); } catch (_) { }

  let assetsQuery = supabase
    .from('media_assets')
    .select('id, media_asset_code, city, area, location, media_type, dimensions, card_rate, total_sqft, status, direction, illumination_type, latitude, longitude, primary_photo_url, qr_code_url, is_public, booked_from, booked_to, current_campaign_id')
    .eq('company_id', companyId);

  if (city && city !== 'all') assetsQuery = assetsQuery.eq('city', city);
  if (media_type && media_type !== 'all') assetsQuery = assetsQuery.eq('media_type', media_type);

  const { data: allAssets, error: assetsError } = await assetsQuery;
  if (assetsError) return jsonError('Failed to fetch assets: ' + assetsError.message, 500);
  if (!allAssets || allAssets.length === 0) return jsonResponse({ available_assets: [], booked_assets: [], summary: { total_assets: 0, available_count: 0, booked_count: 0, total_sqft_available: 0, potential_revenue: 0 }, search_params: { start_date, end_date, city, media_type } });

  const assetIds = allAssets.map(a => a.id);

  const { data: allBookings } = await supabase
    .from('campaign_assets')
    .select('asset_id, campaign_id, booking_start_date, booking_end_date, campaigns(id, campaign_name, client_name, start_date, end_date, status)')
    .in('asset_id', assetIds);

  const assetBookingsMap = new Map<string, BookingInterval[]>();
  const assetAllBookingsInfoMap = new Map<string, BookingInfo[]>();

  for (const booking of (allBookings || [])) {
    const campaign = booking.campaigns as any;
    if (!campaign) continue;
    const activeStatuses = ['Draft', 'Upcoming', 'Running'];
    const isActive = activeStatuses.includes(campaign.status);
    const bStart = booking.booking_start_date || campaign.start_date;
    const bEnd = booking.booking_end_date || campaign.end_date;
    if (!bStart || !bEnd) continue;
    const bs = parseDay(bStart), be = parseDay(bEnd);
    if (be < bs) continue;
    const info: BookingInfo = { campaign_id: campaign.id, campaign_name: campaign.campaign_name || 'Unnamed', client_name: campaign.client_name || 'Unknown', start_date: bStart, end_date: bEnd, status: campaign.status || 'Unknown' };
    const allInfo = assetAllBookingsInfoMap.get(booking.asset_id) || [];
    allInfo.push(info);
    assetAllBookingsInfoMap.set(booking.asset_id, allInfo);
    if (!isActive) continue;
    const intervals = assetBookingsMap.get(booking.asset_id) || [];
    intervals.push({ start: bs, end: be, info });
    assetBookingsMap.set(booking.asset_id, intervals);
  }

  const availableAssets: any[] = [];
  const bookedAssets: any[] = [];
  const availableSoonAssets: any[] = [];
  const processedIds = new Set<string>();

  for (const asset of allAssets) {
    if (processedIds.has(asset.id)) continue;
    processedIds.add(asset.id);
    const bookings = assetBookingsMap.get(asset.id) || [];
    const allInfo = assetAllBookingsInfoMap.get(asset.id) || [];
    const result = computeAvailabilityForRange(bookings, rangeStart, rangeEnd);
    const sortedInfo = [...allInfo].sort((a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime());
    const currentBooking = sortedInfo.find(b => rangesOverlap(parseDay(b.start_date), parseDay(b.end_date), rangeStart, rangeEnd)) || null;

    if (result.status === 'AVAILABLE') {
      availableAssets.push({ ...asset, availability_status: 'available', available_from: result.available_from || formatDay(rangeStart) });
    } else {
      const ba = { ...asset, availability_status: 'booked', current_booking: currentBooking, all_bookings: sortedInfo, available_from: result.available_from };
      if (result.available_from) availableSoonAssets.push(ba);
      else bookedAssets.push(ba);
    }
  }

  return jsonResponse({
    available_assets: availableAssets,
    booked_assets: bookedAssets,
    available_soon_assets: availableSoonAssets,
    summary: {
      total_assets: processedIds.size,
      available_count: availableAssets.length,
      booked_count: bookedAssets.length + availableSoonAssets.length,
      available_soon_count: availableSoonAssets.length,
      total_sqft_available: availableAssets.reduce((s, a) => s + (Number(a.total_sqft) || 0), 0),
      potential_revenue: availableAssets.reduce((s, a) => s + (Number(a.card_rate) || 0), 0),
    },
    search_params: { start_date, end_date, city: city || null, media_type: media_type || null },
  });
}));

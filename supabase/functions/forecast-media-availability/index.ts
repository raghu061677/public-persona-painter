// v2.0 - Phase-6 Security: withAuth + getAuthContext + tenant isolation
import {
  getAuthContext, logSecurityAudit,
  supabaseUserClient, jsonError, jsonSuccess, withAuth,
} from '../_shared/auth.ts';

Deno.serve(withAuth(async (req) => {
  const ctx = await getAuthContext(req);

  const body = await req.json().catch(() => null);
  if (!body) return jsonError('Invalid JSON body', 400);

  const { asset_id, days_ahead = 365 } = body;
  if (!asset_id || typeof asset_id !== 'string') {
    return jsonError('asset_id is required', 400);
  }

  // Use the authenticated user's company_id (never from body)
  const company_id = ctx.companyId;

  // Use user-scoped client so RLS enforces tenant isolation
  const userClient = supabaseUserClient(req);

  const { data: forecastData, error: forecastError } = await userClient
    .from('media_asset_forecast')
    .select('*')
    .eq('asset_id', asset_id)
    .eq('company_id', company_id)
    .order('booking_start_date', { ascending: true });

  if (forecastError) throw forecastError;

  const endDate = new Date(Date.now() + days_ahead * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const today = new Date().toISOString().split('T')[0];

  const { data: heatmapData, error: heatmapError } = await userClient
    .from('media_calendar_heatmap')
    .select('*')
    .eq('asset_id', asset_id)
    .eq('company_id', company_id)
    .gte('day', today)
    .lte('day', endDate)
    .order('day', { ascending: true });

  if (heatmapError) throw heatmapError;

  const availabilityWindows: any[] = [];
  let currentWindow: any = null;

  heatmapData?.forEach((day: any) => {
    if (day.day_status === 'Available') {
      if (!currentWindow) {
        currentWindow = { start: day.day, end: day.day, days: 1 };
      } else {
        currentWindow.end = day.day;
        currentWindow.days++;
      }
    } else {
      if (currentWindow) {
        availabilityWindows.push(currentWindow);
        currentWindow = null;
      }
    }
  });
  if (currentWindow) availabilityWindows.push(currentWindow);

  const totalDays = heatmapData?.length || 0;
  const bookedDays = heatmapData?.filter((d: any) => d.day_status === 'Booked').length || 0;
  const availableDays = totalDays - bookedDays;
  const occupancyRate = totalDays > 0 ? (bookedDays / totalDays) * 100 : 0;

  return jsonSuccess({
    asset_id,
    forecast_period: { start: today, end: endDate, days: days_ahead },
    bookings: forecastData || [],
    availability_windows: availabilityWindows,
    heatmap: heatmapData || [],
    statistics: {
      total_days: totalDays,
      booked_days: bookedDays,
      available_days: availableDays,
      occupancy_rate: Math.round(occupancyRate * 100) / 100,
      next_available_date: availabilityWindows[0]?.start || null,
      longest_available_window: availabilityWindows.reduce((max: any, w: any) =>
        w.days > (max?.days || 0) ? w : max, null),
    },
  });
}));

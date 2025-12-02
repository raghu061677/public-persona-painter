import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    const { asset_id, company_id, days_ahead = 365 } = await req.json();

    if (!asset_id || !company_id) {
      throw new Error('asset_id and company_id are required');
    }

    // Get forecast data from view
    const { data: forecastData, error: forecastError } = await supabaseClient
      .from('media_asset_forecast')
      .select('*')
      .eq('asset_id', asset_id)
      .eq('company_id', company_id)
      .order('booking_start_date', { ascending: true });

    if (forecastError) throw forecastError;

    // Get calendar heatmap data
    const { data: heatmapData, error: heatmapError } = await supabaseClient
      .from('media_calendar_heatmap')
      .select('*')
      .eq('asset_id', asset_id)
      .eq('company_id', company_id)
      .gte('day', new Date().toISOString().split('T')[0])
      .lte('day', new Date(Date.now() + days_ahead * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
      .order('day', { ascending: true });

    if (heatmapError) throw heatmapError;

    // Calculate availability windows
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

    if (currentWindow) {
      availabilityWindows.push(currentWindow);
    }

    // Calculate occupancy stats
    const totalDays = heatmapData?.length || 0;
    const bookedDays = heatmapData?.filter((d: any) => d.day_status === 'Booked').length || 0;
    const availableDays = totalDays - bookedDays;
    const occupancyRate = totalDays > 0 ? (bookedDays / totalDays) * 100 : 0;

    const response = {
      asset_id,
      forecast_period: {
        start: new Date().toISOString().split('T')[0],
        end: new Date(Date.now() + days_ahead * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        days: days_ahead
      },
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
          w.days > (max?.days || 0) ? w : max, null)
      }
    };

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in forecast-media-availability:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
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

    const { company_id } = await req.json();

    if (!company_id) {
      throw new Error('company_id is required');
    }

    // Get historical revenue data (last 12 months)
    const { data: historicalCampaigns, error: histError } = await supabaseClient
      .from('campaigns')
      .select('id, campaign_code, start_date, end_date, total_amount, status')
      .eq('company_id', company_id)
      .gte('start_date', new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString())
      .order('start_date', { ascending: false });

    if (histError) throw histError;

    // Get utilization data
    const { data: utilizationData, error: utilError } = await supabaseClient
      .from('asset_utilization')
      .select('*')
      .eq('company_id', company_id);

    if (utilError) throw utilError;

    // Get upcoming bookings
    const { data: upcomingCampaigns, error: upcomingError } = await supabaseClient
      .from('campaigns')
      .select('id, campaign_code, start_date, end_date, total_amount, status')
      .eq('company_id', company_id)
      .gte('start_date', new Date().toISOString())
      .in('status', ['Draft', 'Upcoming', 'Running'])
      .order('start_date', { ascending: true });

    if (upcomingError) throw upcomingError;

    // Calculate historical metrics
    const monthlyRevenue: { [key: string]: number } = {};
    historicalCampaigns?.forEach((campaign: any) => {
      const month = campaign.start_date.substring(0, 7); // YYYY-MM
      monthlyRevenue[month] = (monthlyRevenue[month] || 0) + (campaign.total_amount || 0);
    });

    const averageMonthlyRevenue = Object.values(monthlyRevenue).reduce((a, b) => a + b, 0) / 
      Math.max(Object.keys(monthlyRevenue).length, 1);

    // Calculate occupancy trends
    const avgOccupancy = utilizationData?.reduce((sum: number, asset: any) => 
      sum + (asset.occupancy_percent || 0), 0) / Math.max(utilizationData?.length || 1, 1);

    // Get underutilized assets (occupancy < 30%)
    const underutilizedAssets = utilizationData?.filter((asset: any) => 
      asset.occupancy_percent < 30
    ) || [];

    // Get high-performing assets (occupancy > 70%)
    const highPerformingAssets = utilizationData?.filter((asset: any) => 
      asset.occupancy_percent > 70
    ) || [];

    // Call Lovable AI for forecasting
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    
    const aiPrompt = `You are a revenue forecasting AI for an outdoor advertising (OOH) platform.

Historical Data:
- Average Monthly Revenue (last 12 months): ₹${averageMonthlyRevenue.toFixed(2)}
- Total Revenue (last 12 months): ₹${Object.values(monthlyRevenue).reduce((a, b) => a + b, 0).toFixed(2)}
- Average Asset Occupancy: ${avgOccupancy.toFixed(2)}%
- Total Assets: ${utilizationData?.length || 0}
- Underutilized Assets: ${underutilizedAssets.length}
- High-Performing Assets: ${highPerformingAssets.length}

Upcoming Confirmed Bookings:
${upcomingCampaigns?.map((c: any) => 
  `- ${c.campaign_code}: ₹${c.total_amount} (${c.start_date} to ${c.end_date})`
).join('\n') || 'None'}

Based on this data, provide revenue forecasts and recommendations in JSON format with these fields:
{
  "forecast_30_days": number (estimated revenue),
  "forecast_90_days": number,
  "forecast_180_days": number,
  "forecast_fy": number (financial year),
  "confidence_level": "low" | "medium" | "high",
  "growth_trend": "declining" | "stable" | "growing",
  "recommendations": string[],
  "risk_factors": string[],
  "opportunities": string[]
}`;

    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'system',
            content: 'You are a financial forecasting expert specializing in outdoor advertising revenue. Always respond with valid JSON only.'
          },
          {
            role: 'user',
            content: aiPrompt
          }
        ],
        temperature: 0.3,
      }),
    });

    if (!aiResponse.ok) {
      throw new Error(`AI Gateway error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const aiContent = aiData.choices[0].message.content;
    
    // Parse AI response
    let aiForecast;
    try {
      aiForecast = JSON.parse(aiContent);
    } catch (e) {
      // Fallback if AI doesn't return valid JSON
      aiForecast = {
        forecast_30_days: averageMonthlyRevenue,
        forecast_90_days: averageMonthlyRevenue * 3,
        forecast_180_days: averageMonthlyRevenue * 6,
        forecast_fy: averageMonthlyRevenue * 12,
        confidence_level: 'medium',
        growth_trend: 'stable',
        recommendations: ['Increase marketing efforts', 'Target underutilized assets'],
        risk_factors: ['Seasonal variations', 'Market competition'],
        opportunities: ['Expand to new markets', 'Digital signage integration']
      };
    }

    const response = {
      company_id,
      generated_at: new Date().toISOString(),
      historical_analysis: {
        total_campaigns_last_year: historicalCampaigns?.length || 0,
        average_monthly_revenue: averageMonthlyRevenue,
        total_revenue_last_year: Object.values(monthlyRevenue).reduce((a, b) => a + b, 0),
        monthly_breakdown: monthlyRevenue,
        average_occupancy: avgOccupancy
      },
      asset_analysis: {
        total_assets: utilizationData?.length || 0,
        underutilized_count: underutilizedAssets.length,
        high_performing_count: highPerformingAssets.length,
        underutilized_assets: underutilizedAssets.slice(0, 10).map((a: any) => ({
          asset_id: a.asset_id,
          location: a.location,
          city: a.city,
          occupancy: a.occupancy_percent
        })),
        top_performing_assets: highPerformingAssets.slice(0, 10).map((a: any) => ({
          asset_id: a.asset_id,
          location: a.location,
          city: a.city,
          occupancy: a.occupancy_percent,
          revenue: a.total_revenue
        }))
      },
      upcoming_revenue: {
        confirmed_bookings: upcomingCampaigns?.length || 0,
        confirmed_value: upcomingCampaigns?.reduce((sum: number, c: any) => 
          sum + (c.total_amount || 0), 0) || 0
      },
      ai_forecast: aiForecast
    };

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in revenue-forecast-ai:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
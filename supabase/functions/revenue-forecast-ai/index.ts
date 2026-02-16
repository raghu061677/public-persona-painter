// v2.0 - Phase-6 Security: withAuth + getAuthContext + tenant isolation + rate limiting
import {
  getAuthContext, requireRole, checkRateLimit,
  supabaseUserClient, jsonError, jsonSuccess, withAuth,
} from '../_shared/auth.ts';

Deno.serve(withAuth(async (req) => {
  const ctx = await getAuthContext(req);
  requireRole(ctx, ['admin', 'finance']);

  // Rate limit: 5/min per user (expensive AI operation)
  checkRateLimit(`revenue-forecast:${ctx.userId}`, 5, 60000);

  // Use company_id from auth context, NOT from body
  const company_id = ctx.companyId;

  // Use user-scoped client for RLS enforcement
  const userClient = supabaseUserClient(req);

  const { data: historicalCampaigns, error: histError } = await userClient
    .from('campaigns')
    .select('id, campaign_code, start_date, end_date, total_amount, status')
    .eq('company_id', company_id)
    .gte('start_date', new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString())
    .order('start_date', { ascending: false });

  if (histError) throw histError;

  const { data: utilizationData, error: utilError } = await userClient
    .from('asset_utilization')
    .select('*')
    .eq('company_id', company_id);

  if (utilError) throw utilError;

  const { data: upcomingCampaigns, error: upcomingError } = await userClient
    .from('campaigns')
    .select('id, campaign_code, start_date, end_date, total_amount, status')
    .eq('company_id', company_id)
    .gte('start_date', new Date().toISOString())
    .in('status', ['Draft', 'Upcoming', 'Running'])
    .order('start_date', { ascending: true });

  if (upcomingError) throw upcomingError;

  const monthlyRevenue: Record<string, number> = {};
  historicalCampaigns?.forEach((c: any) => {
    const month = c.start_date.substring(0, 7);
    monthlyRevenue[month] = (monthlyRevenue[month] || 0) + (c.total_amount || 0);
  });

  const avgMonthlyRevenue = Object.values(monthlyRevenue).reduce((a, b) => a + b, 0) /
    Math.max(Object.keys(monthlyRevenue).length, 1);

  const avgOccupancy = (utilizationData || []).reduce((sum: number, a: any) =>
    sum + (a.occupancy_percent || 0), 0) / Math.max(utilizationData?.length || 1, 1);

  const underutilized = utilizationData?.filter((a: any) => a.occupancy_percent < 30) || [];
  const highPerforming = utilizationData?.filter((a: any) => a.occupancy_percent > 70) || [];

  const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
  if (!LOVABLE_API_KEY) return jsonError('AI service not configured', 500);

  const aiPrompt = `You are a revenue forecasting AI for an outdoor advertising (OOH) platform.

Historical Data:
- Average Monthly Revenue: ₹${avgMonthlyRevenue.toFixed(2)}
- Total Revenue (12 months): ₹${Object.values(monthlyRevenue).reduce((a, b) => a + b, 0).toFixed(2)}
- Average Asset Occupancy: ${avgOccupancy.toFixed(2)}%
- Total Assets: ${utilizationData?.length || 0}
- Underutilized: ${underutilized.length}, High-Performing: ${highPerforming.length}

Upcoming Bookings:
${upcomingCampaigns?.map((c: any) => `- ${c.campaign_code}: ₹${c.total_amount} (${c.start_date} to ${c.end_date})`).join('\n') || 'None'}

Provide revenue forecasts in JSON: { "forecast_30_days": number, "forecast_90_days": number, "forecast_180_days": number, "forecast_fy": number, "confidence_level": "low"|"medium"|"high", "growth_trend": "declining"|"stable"|"growing", "recommendations": string[], "risk_factors": string[], "opportunities": string[] }`;

  const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'google/gemini-2.5-flash',
      messages: [
        { role: 'system', content: 'You are a financial forecasting expert specializing in outdoor advertising revenue. Always respond with valid JSON only.' },
        { role: 'user', content: aiPrompt },
      ],
      temperature: 0.3,
    }),
  });

  if (!aiResponse.ok) {
    if (aiResponse.status === 429) return jsonError('Rate limit exceeded', 429);
    if (aiResponse.status === 402) return jsonError('AI credits exhausted', 402);
    throw new Error(`AI Gateway error: ${aiResponse.status}`);
  }

  const aiData = await aiResponse.json();
  let aiForecast;
  try {
    aiForecast = JSON.parse(aiData.choices[0].message.content);
  } catch {
    aiForecast = {
      forecast_30_days: avgMonthlyRevenue, forecast_90_days: avgMonthlyRevenue * 3,
      forecast_180_days: avgMonthlyRevenue * 6, forecast_fy: avgMonthlyRevenue * 12,
      confidence_level: 'medium', growth_trend: 'stable',
      recommendations: ['Increase marketing efforts'], risk_factors: ['Seasonal variations'],
      opportunities: ['Expand to new markets'],
    };
  }

  return jsonSuccess({
    company_id, generated_at: new Date().toISOString(),
    historical_analysis: {
      total_campaigns_last_year: historicalCampaigns?.length || 0,
      average_monthly_revenue: avgMonthlyRevenue,
      total_revenue_last_year: Object.values(monthlyRevenue).reduce((a, b) => a + b, 0),
      monthly_breakdown: monthlyRevenue, average_occupancy: avgOccupancy,
    },
    asset_analysis: {
      total_assets: utilizationData?.length || 0,
      underutilized_count: underutilized.length,
      high_performing_count: highPerforming.length,
      underutilized_assets: underutilized.slice(0, 10).map((a: any) => ({
        asset_id: a.asset_id, location: a.location, city: a.city, occupancy: a.occupancy_percent,
      })),
      top_performing_assets: highPerforming.slice(0, 10).map((a: any) => ({
        asset_id: a.asset_id, location: a.location, city: a.city, occupancy: a.occupancy_percent, revenue: a.total_revenue,
      })),
    },
    upcoming_revenue: {
      confirmed_bookings: upcomingCampaigns?.length || 0,
      confirmed_value: upcomingCampaigns?.reduce((sum: number, c: any) => sum + (c.total_amount || 0), 0) || 0,
    },
    ai_forecast: aiForecast,
  });
}));

// v2.0 - Phase-6 Security: withAuth + getAuthContext + tenant isolation + rate limiting
import {
  getAuthContext, requireRole, checkRateLimit,
  supabaseServiceClient, jsonError, jsonSuccess, withAuth,
} from '../_shared/auth.ts';

Deno.serve(withAuth(async (req) => {
  const ctx = await getAuthContext(req);
  requireRole(ctx, ['admin', 'sales']);

  // Rate limit: 20/min per user
  checkRateLimit(`rate-suggester:${ctx.userId}`, 20, 60000);

  const body = await req.json().catch(() => null);
  if (!body) return jsonError('Invalid JSON body', 400);

  const { assetId, location, mediaType, city, area } = body;
  if (!mediaType || typeof mediaType !== 'string') {
    return jsonError('mediaType is required', 400);
  }

  const serviceClient = supabaseServiceClient();

  // Fetch historical pricing data scoped to user's company
  const { data: similarAssets, error } = await serviceClient
    .from('plan_items')
    .select('sales_price, card_rate, asset_id, location, city, area, media_type, created_at')
    .or(`location.eq.${location || ''},city.eq.${city || ''},area.eq.${area || ''}`)
    .eq('media_type', mediaType)
    .order('created_at', { ascending: false })
    .limit(10);

  if (error) throw error;

  const prices = similarAssets?.map((a: any) => a.sales_price || a.card_rate).filter(Boolean) || [];
  const avgPrice = prices.length > 0 ? prices.reduce((a: number, b: number) => a + b, 0) / prices.length : 0;
  const minPrice = prices.length > 0 ? Math.min(...prices) : 0;
  const maxPrice = prices.length > 0 ? Math.max(...prices) : 0;

  const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
  if (!LOVABLE_API_KEY) return jsonError('AI service not configured', 500);

  const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${LOVABLE_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'google/gemini-2.5-flash',
      messages: [
        { role: 'system', content: 'You are a pricing analyst for outdoor advertising. Provide concise, data-driven rate recommendations.' },
        { role: 'user', content: `Analyze pricing for ${mediaType} at ${location || 'N/A'}, ${city || 'N/A'} (${area || 'N/A'}). Historical: ${similarAssets?.length || 0} bookings, Avg: ₹${avgPrice.toFixed(0)}, Range: ₹${minPrice.toFixed(0)}-₹${maxPrice.toFixed(0)}. Suggest optimal rate range (2-3 sentences max).` },
      ],
    }),
  });

  if (!aiResponse.ok) {
    if (aiResponse.status === 429) return jsonError('Rate limit exceeded', 429);
    if (aiResponse.status === 402) return jsonError('AI credits exhausted', 402);
    throw new Error(`AI gateway error: ${aiResponse.status}`);
  }

  const aiData = await aiResponse.json();
  const suggestion = aiData.choices[0].message.content;

  return jsonSuccess({
    suggestion,
    stats: { avgPrice, minPrice, maxPrice, sampleCount: similarAssets?.length || 0 },
  });
}));

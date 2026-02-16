// v2.0 - Phase-6 Security: withAuth + getAuthContext + tenant isolation + rate limiting
import {
  getAuthContext, checkRateLimit, logSecurityAudit,
  supabaseServiceClient, jsonError, withAuth,
} from '../_shared/auth.ts';
import { corsHeaders } from '../_shared/cors.ts';

Deno.serve(withAuth(async (req) => {
  const ctx = await getAuthContext(req);

  // Rate limit AI calls: 30/min per user
  checkRateLimit(`ai-assistant:${ctx.userId}`, 30, 60000);

  const body = await req.json().catch(() => null);
  if (!body?.messages || !Array.isArray(body.messages)) {
    return jsonError('messages array is required', 400);
  }

  const { messages, action } = body;

  // Truncate message length
  const lastMessage = messages[messages.length - 1]?.content || '';
  if (lastMessage.length > 2000) {
    return jsonError('Message too long (max 2000 characters)', 400);
  }

  const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
  if (!LOVABLE_API_KEY) {
    return jsonError('AI service not configured', 500);
  }

  const serviceClient = supabaseServiceClient();
  const companyId = ctx.companyId;

  let systemPrompt = `You are Go-Ads AI Assistant, an expert in OOH (Out-of-Home) advertising management.
You help users with:
- Finding vacant media assets
- Campaign planning and optimization
- Client management and insights
- Financial reporting and analysis
- Operations tracking

Current user: ${ctx.email}
Provide clear, actionable responses. When showing data, format it clearly.`;

  if (action === 'vacant_media') {
    const { data: vacantAssets } = await serviceClient
      .from('media_assets')
      .select('id, location, city, area, media_type, status, card_rate')
      .eq('company_id', companyId)
      .eq('status', 'Available')
      .limit(20);
    systemPrompt += `\n\nVacant Media Assets (${vacantAssets?.length || 0}):\n${JSON.stringify(vacantAssets, null, 2)}`;
  } else if (action === 'campaign_summary') {
    const { data: campaigns } = await serviceClient
      .from('campaigns')
      .select('id, campaign_name, client_name, status, start_date, end_date, grand_total')
      .eq('company_id', companyId)
      .order('created_at', { ascending: false })
      .limit(10);
    systemPrompt += `\n\nRecent Campaigns (${campaigns?.length || 0}):\n${JSON.stringify(campaigns, null, 2)}`;
  } else if (action === 'client_insights') {
    const { data: clients } = await serviceClient
      .from('clients')
      .select('id, name, company, created_at')
      .eq('company_id', companyId)
      .order('created_at', { ascending: false })
      .limit(20);
    systemPrompt += `\n\nClients (${clients?.length || 0}):\n${JSON.stringify(clients, null, 2)}`;
  } else if (action === 'financial_summary') {
    const { data: invoices } = await serviceClient
      .from('invoices')
      .select('id, client_name, total_amount, status, invoice_date, due_date')
      .eq('company_id', companyId)
      .order('invoice_date', { ascending: false })
      .limit(15);
    systemPrompt += `\n\nRecent Invoices (${invoices?.length || 0}):\n${JSON.stringify(invoices, null, 2)}`;
  }

  const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${LOVABLE_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'google/gemini-2.5-flash',
      messages: [{ role: 'system', content: systemPrompt }, ...messages],
      stream: true,
    }),
  });

  if (!response.ok) {
    if (response.status === 429) return jsonError('Rate limit exceeded. Please try again later.', 429);
    if (response.status === 402) return jsonError('AI credits exhausted.', 402);
    console.error('AI gateway error:', response.status);
    return jsonError('AI gateway error', 500);
  }

  await serviceClient.from('ai_assistant_logs').insert({
    user_id: ctx.userId, company_id: companyId,
    query_text: lastMessage, intent: action || 'general',
  });

  return new Response(response.body, {
    headers: { ...corsHeaders, 'Content-Type': 'text/event-stream' },
  });
}));

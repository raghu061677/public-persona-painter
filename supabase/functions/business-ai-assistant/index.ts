/**
 * business-ai-assistant — Phase-6 Hardened
 * Auth: JWT + role gate (admin, sales, ops)
 * company_id: derived from JWT, NEVER from body
 * Rate limit: 20 req/min/user
 */
import {
  withAuth, getAuthContext, requireRole, checkRateLimit,
  supabaseServiceClient, logSecurityAudit, jsonError, jsonSuccess,
} from '../_shared/auth.ts';

const MAX_MESSAGE_LENGTH = 2000;

Deno.serve(withAuth(async (req) => {
  if (req.method !== 'POST') return jsonError('Method not allowed', 405);

  const ctx = await getAuthContext(req);
  requireRole(ctx, ['admin', 'sales', 'ops']);
  checkRateLimit(`biz-ai:${ctx.userId}`, 20, 60_000);

  const body = await req.json().catch(() => null);
  if (!body || typeof body.message !== 'string' || body.message.trim().length === 0) {
    return jsonError('message (string) is required');
  }
  const message = body.message.trim().slice(0, MAX_MESSAGE_LENGTH);

  const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
  if (!LOVABLE_API_KEY) throw new Error('LOVABLE_API_KEY not configured');

  const supabase = supabaseServiceClient();
  const startTime = Date.now();

  // Detect intent via AI
  const intentResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'google/gemini-2.5-flash',
      messages: [
        {
          role: 'system',
          content: `You are a business intelligence assistant. Analyze the user's question and determine the intent.
Available intents: vacant_media, pending_invoices, client_summary, campaign_analytics, power_bills, general
Respond with ONLY a JSON object: {"intent": "<intent>", "filters": {}}
Extract any filters (city, client_name, date_range, status, etc.)`
        },
        { role: 'user', content: message }
      ],
      temperature: 0.3,
    }),
  });

  if (!intentResponse.ok) {
    if (intentResponse.status === 429) return jsonError('Rate limit exceeded. Please try again later.', 429);
    if (intentResponse.status === 402) return jsonError('Payment required. Please add credits.', 402);
    throw new Error(`AI API error: ${intentResponse.status}`);
  }

  const intentData = await intentResponse.json();
  let parsedIntent: any;
  try { parsedIntent = JSON.parse(intentData.choices[0].message.content); }
  catch { parsedIntent = { intent: 'general', filters: {} }; }

  const responseTime = Date.now() - startTime;
  let queryResult: any;
  let responseType = 'text';

  // All queries scoped to ctx.companyId
  const companyId = ctx.companyId;

  switch (parsedIntent.intent) {
    case 'vacant_media': {
      let query = supabase.from('media_assets')
        .select('id, city, area, location, media_type, dimension, card_rate, status')
        .eq('company_id', companyId).eq('status', 'Available');
      if (parsedIntent.filters.city) query = query.ilike('city', `%${parsedIntent.filters.city}%`);
      if (parsedIntent.filters.media_type) query = query.ilike('media_type', `%${parsedIntent.filters.media_type}%`);
      const { data, error } = await query.limit(20);
      if (error) throw error;
      queryResult = {
        type: 'table',
        columns: ['ID', 'City', 'Area', 'Location', 'Type', 'Size', 'Rate'],
        data: data?.map(i => [i.id, i.city, i.area, i.location, i.media_type, i.dimension, `₹${i.card_rate?.toLocaleString()}`]) || [],
        summary: `Found ${data?.length || 0} vacant media assets${parsedIntent.filters.city ? ` in ${parsedIntent.filters.city}` : ''}.`
      };
      responseType = 'table';
      break;
    }
    case 'pending_invoices': {
      const { data, error } = await supabase.from('invoices')
        .select('id, client_name, invoice_date, total_amount, balance_due, status')
        .eq('company_id', companyId).in('status', ['Pending', 'Partial'])
        .order('invoice_date', { ascending: false }).limit(20);
      if (error) throw error;
      const totalPending = data?.reduce((s, i) => s + (i.balance_due || 0), 0) || 0;
      queryResult = {
        type: 'cards',
        cards: [
          { label: 'Total Pending', value: `₹${totalPending.toLocaleString()}`, variant: 'warning' },
          { label: 'Invoices Count', value: String(data?.length || 0), variant: 'info' }
        ],
        table: {
          columns: ['Invoice ID', 'Client', 'Date', 'Total', 'Balance Due', 'Status'],
          data: data?.map(i => [i.id, i.client_name, new Date(i.invoice_date).toLocaleDateString(), `₹${i.total_amount?.toLocaleString()}`, `₹${i.balance_due?.toLocaleString()}`, i.status]) || []
        },
        summary: `You have ${data?.length || 0} pending invoices totaling ₹${totalPending.toLocaleString()}.`
      };
      responseType = 'cards';
      break;
    }
    case 'client_summary': {
      const { data: clients, error } = await supabase.from('clients')
        .select('id, name, company, city, created_at').eq('company_id', companyId)
        .order('created_at', { ascending: false }).limit(10);
      if (error) throw error;
      const { count: campaignCount } = await supabase.from('campaigns')
        .select('*', { count: 'exact', head: true }).eq('company_id', companyId);
      const { data: revenue } = await supabase.from('invoices')
        .select('total_amount').eq('company_id', companyId);
      const totalRevenue = revenue?.reduce((s, i) => s + (i.total_amount || 0), 0) || 0;
      queryResult = {
        type: 'cards',
        cards: [
          { label: 'Total Clients', value: String(clients?.length || 0), variant: 'success' },
          { label: 'Active Campaigns', value: String(campaignCount || 0), variant: 'info' },
          { label: 'Total Revenue', value: `₹${totalRevenue.toLocaleString()}`, variant: 'success' }
        ],
        table: {
          columns: ['Client ID', 'Name', 'Company', 'City', 'Registered'],
          data: clients?.map(c => [c.id, c.name, c.company || '—', c.city || '—', new Date(c.created_at).toLocaleDateString()]) || []
        },
        summary: `You have ${clients?.length || 0} clients with ${campaignCount || 0} active campaigns.`
      };
      responseType = 'cards';
      break;
    }
    case 'campaign_analytics': {
      const { data, error } = await supabase.from('campaigns')
        .select('id, campaign_name, status, total_assets, grand_total, start_date, end_date')
        .eq('company_id', companyId).order('created_at', { ascending: false }).limit(10);
      if (error) throw error;
      const statusCounts = data?.reduce((a: any, c) => { a[c.status] = (a[c.status] || 0) + 1; return a; }, {}) || {};
      const totalRevenue = data?.reduce((s, c) => s + (c.grand_total || 0), 0) || 0;
      queryResult = {
        type: 'cards',
        cards: [
          { label: 'Total Campaigns', value: String(data?.length || 0), variant: 'info' },
          { label: 'Running', value: String(statusCounts['Running'] || 0), variant: 'success' },
          { label: 'Total Value', value: `₹${totalRevenue.toLocaleString()}`, variant: 'success' }
        ],
        table: {
          columns: ['Campaign', 'Status', 'Assets', 'Value', 'Period'],
          data: data?.map(c => [c.campaign_name, c.status, String(c.total_assets || 0), `₹${c.grand_total?.toLocaleString()}`, `${new Date(c.start_date).toLocaleDateString()} - ${new Date(c.end_date).toLocaleDateString()}`]) || []
        },
        summary: `${data?.length || 0} campaigns with total value of ₹${totalRevenue.toLocaleString()}.`
      };
      responseType = 'cards';
      break;
    }
    case 'power_bills': {
      // Power bills linked via asset → company
      const { data: companyAssets } = await supabase.from('media_assets')
        .select('id').eq('company_id', companyId);
      const assetIds = companyAssets?.map(a => a.id) || [];
      let billData: any[] = [];
      if (assetIds.length > 0) {
        const { data } = await supabase.from('asset_power_bills')
          .select('asset_id, bill_month, total_due, paid, payment_status')
          .in('asset_id', assetIds.slice(0, 200))
          .order('bill_month', { ascending: false }).limit(20);
        billData = data || [];
      }
      const unpaidBills = billData.filter(b => !b.paid);
      const totalUnpaid = unpaidBills.reduce((s, b) => s + (b.total_due || 0), 0);
      queryResult = {
        type: 'cards',
        cards: [
          { label: 'Unpaid Bills', value: String(unpaidBills.length), variant: 'warning' },
          { label: 'Total Unpaid', value: `₹${totalUnpaid.toLocaleString()}`, variant: 'warning' }
        ],
        table: {
          columns: ['Asset ID', 'Bill Month', 'Amount', 'Status'],
          data: billData.slice(0, 10).map(b => [b.asset_id, new Date(b.bill_month).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }), `₹${b.total_due?.toLocaleString()}`, b.paid ? 'Paid' : 'Unpaid'])
        },
        summary: `${unpaidBills.length} unpaid bills totaling ₹${totalUnpaid.toLocaleString()}.`
      };
      responseType = 'cards';
      break;
    }
    default: {
      const generalResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'google/gemini-2.5-flash',
          messages: [
            { role: 'system', content: 'You are a helpful business assistant for an OOH media management platform called Go-Ads 360°. Provide clear, concise answers.' },
            { role: 'user', content: message }
          ],
        }),
      });
      const generalData = await generalResponse.json();
      queryResult = { type: 'text', text: generalData.choices[0].message.content, summary: '' };
      responseType = 'text';
    }
  }

  // Log query metadata (not full prompt)
  await supabase.from('ai_assistant_logs').insert({
    user_id: ctx.userId,
    company_id: companyId,
    query_text: message.slice(0, 200),
    intent: parsedIntent.intent,
    response_type: responseType,
    response_time_ms: responseTime
  });

  return jsonSuccess({ responseType, data: queryResult, intent: parsedIntent.intent });
}));

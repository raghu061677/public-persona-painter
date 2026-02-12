/**
 * ask-ai — Phase-6 Hardened
 * Auth: JWT + role gate (admin, sales, ops)
 * userId/companyId: derived from JWT, NEVER from body
 * Rate limit: 20 req/min/user
 */
import {
  withAuth, getAuthContext, requireRole, checkRateLimit,
  supabaseServiceClient, logSecurityAudit, jsonError, jsonSuccess,
} from '../_shared/auth.ts';

const MAX_QUERY_LENGTH = 2000;
const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY')!;

interface IntentResult {
  action: string;
  filters?: Record<string, any>;
  format?: 'table' | 'cards' | 'text';
  summary?: string;
}

Deno.serve(withAuth(async (req) => {
  if (req.method !== 'POST') return jsonError('Method not allowed', 405);

  const ctx = await getAuthContext(req);
  requireRole(ctx, ['admin', 'sales', 'ops']);
  checkRateLimit(`ask-ai:${ctx.userId}`, 20, 60_000);

  const body = await req.json().catch(() => null);
  if (!body || typeof body.query !== 'string' || body.query.trim().length === 0) {
    return jsonError('query (string) is required');
  }
  const query = body.query.trim().slice(0, MAX_QUERY_LENGTH);
  const companyId = ctx.companyId;
  const supabase = supabaseServiceClient();

  const intent = await detectIntentWithAI(query);

  let result: any;
  switch (intent.action) {
    case 'get_vacant_media': result = await getVacantMedia(supabase, companyId, intent.filters || {}); break;
    case 'get_campaigns': result = await getCampaigns(supabase, companyId, intent.filters || {}); break;
    case 'get_invoices': result = await getInvoices(supabase, companyId, intent.filters || {}); break;
    case 'get_clients': result = await getClients(supabase, companyId, intent.filters || {}); break;
    case 'get_expenses': result = await getExpenses(supabase, companyId, intent.filters || {}); break;
    default:
      result = { type: 'text', data: null, summary: "I'm not sure how to help with that. Try asking about vacant media, campaigns, invoices, clients, or expenses." };
  }

  // Log metadata only
  await supabase.from('ai_assistant_logs').insert({
    user_id: ctx.userId,
    company_id: companyId,
    query_text: query.slice(0, 200),
    intent: intent.action,
    response_type: result.type
  });

  return jsonSuccess(result);
}));

async function detectIntentWithAI(query: string): Promise<IntentResult> {
  try {
    const systemPrompt = `You are a business intelligence assistant for an OOH advertising platform.
Available actions: get_vacant_media, get_campaigns, get_invoices, get_clients, get_expenses, get_summary
Extract filters: area, city, status, price_min, price_max, date_from, date_to, media_type, client_name
Always provide a helpful summary.`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: query }],
        tools: [{
          type: 'function',
          function: {
            name: 'extract_intent',
            description: 'Extract intent and filters',
            parameters: {
              type: 'object',
              properties: {
                action: { type: 'string', enum: ['get_vacant_media', 'get_campaigns', 'get_invoices', 'get_clients', 'get_expenses', 'get_summary', 'unknown'] },
                filters: { type: 'object' },
                format: { type: 'string', enum: ['table', 'cards', 'text'] },
                summary: { type: 'string' }
              },
              required: ['action', 'format', 'summary']
            }
          }
        }],
        tool_choice: { type: 'function', function: { name: 'extract_intent' } }
      })
    });

    if (!response.ok) return detectIntentLocal(query);
    const data = await response.json();
    const toolCall = data.choices[0]?.message?.tool_calls?.[0];
    if (toolCall?.function?.arguments) return JSON.parse(toolCall.function.arguments);
    return detectIntentLocal(query);
  } catch { return detectIntentLocal(query); }
}

function detectIntentLocal(query: string): IntentResult {
  const q = query.toLowerCase();
  if (q.includes('vacant') || q.includes('available')) return { action: 'get_vacant_media', filters: {}, format: 'table', summary: 'Searching vacant media...' };
  if (q.includes('campaign')) return { action: 'get_campaigns', filters: {}, format: 'table', summary: 'Fetching campaigns...' };
  if (q.includes('invoice') || q.includes('payment')) return { action: 'get_invoices', filters: {}, format: 'table', summary: 'Retrieving invoices...' };
  if (q.includes('client') || q.includes('customer')) return { action: 'get_clients', filters: {}, format: 'table', summary: 'Loading clients...' };
  if (q.includes('expense') || q.includes('cost')) return { action: 'get_expenses', filters: {}, format: 'table', summary: 'Gathering expenses...' };
  return { action: 'unknown', format: 'text', summary: 'I can help with vacant media, campaigns, invoices, clients, or expenses.' };
}

// All query helpers scoped to companyId
async function getVacantMedia(sb: any, companyId: string, filters: Record<string, any>) {
  let q = sb.from('media_assets').select('id, location, area, city, media_type, card_rate, status, dimensions').eq('company_id', companyId).eq('status', 'Available');
  if (filters.area) q = q.ilike('area', `%${filters.area}%`);
  if (filters.city) q = q.ilike('city', `%${filters.city}%`);
  if (filters.media_type) q = q.eq('media_type', filters.media_type);
  if (filters.price_max) q = q.lte('card_rate', filters.price_max);
  if (filters.price_min) q = q.gte('card_rate', filters.price_min);
  const { data, error } = await q.order('area').limit(50);
  if (error) throw error;
  return { type: 'table', data: data || [], summary: `Found ${data?.length || 0} vacant assets` };
}

async function getCampaigns(sb: any, companyId: string, filters: Record<string, any>) {
  let q = sb.from('campaigns').select('id, campaign_name, client_name, status, start_date, end_date, grand_total').eq('company_id', companyId);
  if (filters.status) q = q.eq('status', filters.status);
  if (filters.client_name) q = q.ilike('client_name', `%${filters.client_name}%`);
  const { data, error } = await q.order('created_at', { ascending: false }).limit(30);
  if (error) throw error;
  return { type: 'table', data: data || [], summary: `Found ${data?.length || 0} campaigns` };
}

async function getInvoices(sb: any, companyId: string, filters: Record<string, any>) {
  let q = sb.from('invoices').select('id, client_name, invoice_date, due_date, total_amount, balance_due, status').eq('company_id', companyId);
  if (filters.status) q = q.eq('status', filters.status);
  if (filters.client_name) q = q.ilike('client_name', `%${filters.client_name}%`);
  const { data, error } = await q.order('invoice_date', { ascending: false }).limit(30);
  if (error) throw error;
  const totalDue = data?.reduce((s: number, i: any) => s + (i.balance_due || 0), 0) || 0;
  return { type: 'table', data: data || [], summary: `Found ${data?.length || 0} invoices. Outstanding: ₹${totalDue.toLocaleString()}` };
}

async function getClients(sb: any, companyId: string, filters: Record<string, any>) {
  let q = sb.from('clients').select('id, name, company, city, phone, email').eq('company_id', companyId);
  if (filters.city) q = q.ilike('city', `%${filters.city}%`);
  if (filters.client_name) q = q.ilike('name', `%${filters.client_name}%`);
  const { data, error } = await q.order('name').limit(50);
  if (error) throw error;
  return { type: 'table', data: data || [], summary: `Found ${data?.length || 0} clients` };
}

async function getExpenses(sb: any, companyId: string, filters: Record<string, any>) {
  let q = sb.from('expenses').select('id, category, vendor_name, total_amount, payment_status, notes, created_at').eq('company_id', companyId);
  if (filters.date_from) q = q.gte('created_at', filters.date_from);
  if (filters.date_to) q = q.lte('created_at', filters.date_to);
  const { data, error } = await q.order('created_at', { ascending: false }).limit(30);
  if (error) throw error;
  const total = data?.reduce((s: number, e: any) => s + (e.total_amount || 0), 0) || 0;
  return { type: 'table', data: data || [], summary: `Found ${data?.length || 0} expenses. Total: ₹${total.toLocaleString()}` };
}

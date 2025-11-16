import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { corsHeaders } from '../_shared/cors.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

interface IntentResult {
  action: string;
  filters?: Record<string, any>;
  format?: 'table' | 'cards' | 'text';
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { query, userId, companyId } = await req.json();

    if (!query || !userId || !companyId) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Processing query:', query);

    // Detect intent
    const intent = await detectIntent(query);
    console.log('Detected intent:', intent);

    // Execute query based on intent
    let result;
    switch (intent.action) {
      case 'get_vacant_media':
        result = await getVacantMedia(supabase, companyId, intent.filters || {});
        break;
      case 'get_campaigns':
        result = await getCampaigns(supabase, companyId, intent.filters || {});
        break;
      case 'get_invoices':
        result = await getInvoices(supabase, companyId, intent.filters || {});
        break;
      case 'get_clients':
        result = await getClients(supabase, companyId, intent.filters || {});
        break;
      case 'get_expenses':
        result = await getExpenses(supabase, companyId, intent.filters || {});
        break;
      default:
        result = {
          type: 'text',
          data: null,
          summary: 'I\'m not sure how to help with that query. Try asking about vacant media, campaigns, invoices, clients, or expenses.'
        };
    }

    // Log the query
    await supabase.from('ai_assistant_logs').insert({
      user_id: userId,
      company_id: companyId,
      query_text: query,
      intent: intent.action,
      response_type: result.type
    });

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Error in ask-ai function:', error);
    return new Response(
      JSON.stringify({ error: error?.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

// Simple local intent detection
function detectIntentLocal(query: string): IntentResult | null {
  const lowerQuery = query.toLowerCase();

  // Vacant media patterns
  if (lowerQuery.includes('vacant') || lowerQuery.includes('available')) {
    const filters: Record<string, any> = {};
    
    // Extract city/area if mentioned
    const cityMatch = lowerQuery.match(/in ([a-z]+)/i);
    if (cityMatch) {
      filters.area = cityMatch[1];
    }

    return { action: 'get_vacant_media', filters, format: 'table' };
  }

  // Campaign patterns
  if (lowerQuery.includes('campaign')) {
    const filters: Record<string, any> = {};
    
    if (lowerQuery.includes('active') || lowerQuery.includes('running')) {
      filters.status = 'InProgress';
    }

    return { action: 'get_campaigns', filters, format: 'table' };
  }

  // Invoice patterns
  if (lowerQuery.includes('invoice') || lowerQuery.includes('payment') || lowerQuery.includes('pending')) {
    const filters: Record<string, any> = {};
    
    if (lowerQuery.includes('pending') || lowerQuery.includes('overdue')) {
      filters.status = 'Pending';
    }

    return { action: 'get_invoices', filters, format: 'table' };
  }

  // Client patterns
  if (lowerQuery.includes('client') || lowerQuery.includes('customer')) {
    return { action: 'get_clients', filters: {}, format: 'table' };
  }

  // Expense patterns
  if (lowerQuery.includes('expense') || lowerQuery.includes('cost')) {
    return { action: 'get_expenses', filters: {}, format: 'table' };
  }

  return null;
}

async function detectIntent(query: string): Promise<IntentResult> {
  // Try local detection first
  const localIntent = detectIntentLocal(query);
  if (localIntent) {
    return localIntent;
  }

  // Fallback to a default response
  return {
    action: 'unknown',
    format: 'text'
  };
}

// Query executors
async function getVacantMedia(supabase: any, companyId: string, filters: Record<string, any>) {
  let query = supabase
    .from('media_assets')
    .select('id, location, area, city, media_type, card_rate, status')
    .eq('company_id', companyId)
    .eq('status', 'Available');

  if (filters.area) {
    query = query.ilike('area', `%${filters.area}%`);
  }

  const { data, error } = await query.limit(50);

  if (error) throw error;

  return {
    type: 'table',
    data: data || [],
    summary: `Found ${data?.length || 0} vacant assets${filters.area ? ` in ${filters.area}` : ''}`
  };
}

async function getCampaigns(supabase: any, companyId: string, filters: Record<string, any>) {
  let query = supabase
    .from('campaigns')
    .select('id, campaign_name, client_name, status, start_date, end_date, grand_total')
    .eq('company_id', companyId);

  if (filters.status) {
    query = query.eq('status', filters.status);
  }

  const { data, error } = await query.order('created_at', { ascending: false }).limit(20);

  if (error) throw error;

  return {
    type: 'table',
    data: data || [],
    summary: `Found ${data?.length || 0} campaigns${filters.status ? ` with status ${filters.status}` : ''}`
  };
}

async function getInvoices(supabase: any, companyId: string, filters: Record<string, any>) {
  let query = supabase
    .from('invoices')
    .select('id, client_name, invoice_date, due_date, total_amount, balance_due, status')
    .eq('company_id', companyId);

  if (filters.status) {
    query = query.eq('status', filters.status);
  }

  const { data, error } = await query.order('invoice_date', { ascending: false }).limit(20);

  if (error) throw error;

  const totalDue = data?.reduce((sum: number, inv: any) => sum + (inv.balance_due || 0), 0) || 0;

  return {
    type: 'table',
    data: data || [],
    summary: `Found ${data?.length || 0} invoices. Total due: ₹${totalDue.toLocaleString()}`
  };
}

async function getClients(supabase: any, companyId: string, filters: Record<string, any>) {
  const { data, error } = await supabase
    .from('clients')
    .select('id, name, company, city, phone, email')
    .eq('company_id', companyId)
    .order('name', { ascending: true })
    .limit(50);

  if (error) throw error;

  return {
    type: 'table',
    data: data || [],
    summary: `Found ${data?.length || 0} clients`
  };
}

async function getExpenses(supabase: any, companyId: string, filters: Record<string, any>) {
  const { data, error } = await supabase
    .from('expenses')
    .select('id, category, vendor_name, total_amount, payment_status, notes')
    .eq('company_id', companyId)
    .order('created_at', { ascending: false })
    .limit(20);

  if (error) throw error;

  const totalExpenses = data?.reduce((sum: number, exp: any) => sum + (exp.total_amount || 0), 0) || 0;

  return {
    type: 'table',
    data: data || [],
    summary: `Found ${data?.length || 0} expenses. Total: ₹${totalExpenses.toLocaleString()}`
  };
}

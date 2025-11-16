import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { corsHeaders } from '../_shared/cors.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY')!;

interface IntentResult {
  action: string;
  filters?: Record<string, any>;
  format?: 'table' | 'cards' | 'text';
  summary?: string;
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

    // Use AI to detect intent and understand query
    const intent = await detectIntentWithAI(query);
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

// AI-powered intent detection using Lovable AI
async function detectIntentWithAI(query: string): Promise<IntentResult> {
  try {
    const systemPrompt = `You are a business intelligence assistant for an OOH (Out-of-Home) advertising management platform.
Your job is to understand user queries and extract structured intent.

Available actions:
- get_vacant_media: For queries about available/vacant advertising assets
- get_campaigns: For queries about advertising campaigns
- get_invoices: For queries about invoices, payments, billing
- get_clients: For queries about clients/customers
- get_expenses: For queries about expenses, costs
- get_summary: For general summaries or KPIs

Extract filters from the query:
- area/city: Location filters
- status: Status filters (Available, InProgress, Pending, etc.)
- price_min/price_max: Price range filters
- date_from/date_to: Date range filters
- media_type: Type of media (bus_shelter, hoarding, unipole, etc.)

Always provide a helpful summary that will be shown to the user.`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: query }
        ],
        tools: [
          {
            type: 'function',
            function: {
              name: 'extract_intent',
              description: 'Extract the user intent and filters from their query',
              parameters: {
                type: 'object',
                properties: {
                  action: {
                    type: 'string',
                    enum: ['get_vacant_media', 'get_campaigns', 'get_invoices', 'get_clients', 'get_expenses', 'get_summary', 'unknown']
                  },
                  filters: {
                    type: 'object',
                    properties: {
                      area: { type: 'string' },
                      city: { type: 'string' },
                      status: { type: 'string' },
                      price_min: { type: 'number' },
                      price_max: { type: 'number' },
                      date_from: { type: 'string' },
                      date_to: { type: 'string' },
                      media_type: { type: 'string' },
                      client_name: { type: 'string' }
                    }
                  },
                  format: {
                    type: 'string',
                    enum: ['table', 'cards', 'text']
                  },
                  summary: {
                    type: 'string',
                    description: 'A friendly summary of what you understood from the query'
                  }
                },
                required: ['action', 'format', 'summary']
              }
            }
          }
        ],
        tool_choice: { type: 'function', function: { name: 'extract_intent' } }
      })
    });

    if (!response.ok) {
      console.error('AI API error:', response.status, await response.text());
      return { action: 'unknown', format: 'text', summary: 'I had trouble understanding your query.' };
    }

    const data = await response.json();
    const toolCall = data.choices[0]?.message?.tool_calls?.[0];
    
    if (toolCall?.function?.arguments) {
      const intent = JSON.parse(toolCall.function.arguments);
      console.log('AI extracted intent:', intent);
      return intent;
    }

    return { action: 'unknown', format: 'text', summary: 'I couldn\'t understand your query.' };
  } catch (error: any) {
    console.error('Error in AI intent detection:', error);
    // Fallback to simple keyword matching
    return detectIntentLocal(query);
  }
}

// Fallback local intent detection
function detectIntentLocal(query: string): IntentResult {
  const lowerQuery = query.toLowerCase();

  if (lowerQuery.includes('vacant') || lowerQuery.includes('available')) {
    return { action: 'get_vacant_media', filters: {}, format: 'table', summary: 'Searching for vacant media assets...' };
  }
  if (lowerQuery.includes('campaign')) {
    return { action: 'get_campaigns', filters: {}, format: 'table', summary: 'Fetching campaign information...' };
  }
  if (lowerQuery.includes('invoice') || lowerQuery.includes('payment')) {
    return { action: 'get_invoices', filters: {}, format: 'table', summary: 'Retrieving invoice data...' };
  }
  if (lowerQuery.includes('client') || lowerQuery.includes('customer')) {
    return { action: 'get_clients', filters: {}, format: 'table', summary: 'Loading client information...' };
  }
  if (lowerQuery.includes('expense') || lowerQuery.includes('cost')) {
    return { action: 'get_expenses', filters: {}, format: 'table', summary: 'Gathering expense data...' };
  }

  return { action: 'unknown', format: 'text', summary: 'I can help you with vacant media, campaigns, invoices, clients, or expenses.' };
}

// Query executors with enhanced filtering
async function getVacantMedia(supabase: any, companyId: string, filters: Record<string, any>) {
  let query = supabase
    .from('media_assets')
    .select('id, location, area, city, media_type, card_rate, status, dimensions')
    .eq('company_id', companyId)
    .eq('status', 'Available');

  // Apply filters
  if (filters.area) query = query.ilike('area', `%${filters.area}%`);
  if (filters.city) query = query.ilike('city', `%${filters.city}%`);
  if (filters.media_type) query = query.eq('media_type', filters.media_type);
  if (filters.price_max) query = query.lte('card_rate', filters.price_max);
  if (filters.price_min) query = query.gte('card_rate', filters.price_min);

  const { data, error } = await query.order('area', { ascending: true }).limit(50);

  if (error) throw error;

  const filterDesc = [];
  if (filters.area) filterDesc.push(`in ${filters.area}`);
  if (filters.city) filterDesc.push(`in ${filters.city}`);
  if (filters.price_max) filterDesc.push(`under ₹${filters.price_max}`);
  if (filters.media_type) filterDesc.push(`type: ${filters.media_type}`);

  return {
    type: 'table',
    data: data || [],
    summary: `Found ${data?.length || 0} vacant assets${filterDesc.length ? ' ' + filterDesc.join(', ') : ''}`
  };
}

async function getCampaigns(supabase: any, companyId: string, filters: Record<string, any>) {
  let query = supabase
    .from('campaigns')
    .select('id, campaign_name, client_name, status, start_date, end_date, grand_total')
    .eq('company_id', companyId);

  // Apply filters
  if (filters.status) query = query.eq('status', filters.status);
  if (filters.client_name) query = query.ilike('client_name', `%${filters.client_name}%`);
  if (filters.date_from) query = query.gte('start_date', filters.date_from);
  if (filters.date_to) query = query.lte('end_date', filters.date_to);

  const { data, error } = await query.order('created_at', { ascending: false }).limit(30);

  if (error) throw error;

  const filterDesc = [];
  if (filters.status) filterDesc.push(`status: ${filters.status}`);
  if (filters.client_name) filterDesc.push(`for ${filters.client_name}`);

  return {
    type: 'table',
    data: data || [],
    summary: `Found ${data?.length || 0} campaigns${filterDesc.length ? ' (' + filterDesc.join(', ') + ')' : ''}`
  };
}

async function getInvoices(supabase: any, companyId: string, filters: Record<string, any>) {
  let query = supabase
    .from('invoices')
    .select('id, client_name, invoice_date, due_date, total_amount, balance_due, status')
    .eq('company_id', companyId);

  // Apply filters
  if (filters.status) query = query.eq('status', filters.status);
  if (filters.client_name) query = query.ilike('client_name', `%${filters.client_name}%`);
  if (filters.date_from) query = query.gte('invoice_date', filters.date_from);
  if (filters.date_to) query = query.lte('invoice_date', filters.date_to);

  const { data, error } = await query.order('invoice_date', { ascending: false }).limit(30);

  if (error) throw error;

  const totalDue = data?.reduce((sum: number, inv: any) => sum + (inv.balance_due || 0), 0) || 0;
  const pendingCount = data?.filter((inv: any) => inv.status === 'Pending').length || 0;

  const filterDesc = [];
  if (filters.status) filterDesc.push(`status: ${filters.status}`);
  if (filters.client_name) filterDesc.push(`for ${filters.client_name}`);

  return {
    type: 'table',
    data: data || [],
    summary: `Found ${data?.length || 0} invoices${filterDesc.length ? ' (' + filterDesc.join(', ') + ')' : ''}. Total outstanding: ₹${totalDue.toLocaleString()} (${pendingCount} pending)`
  };
}

async function getClients(supabase: any, companyId: string, filters: Record<string, any>) {
  let query = supabase
    .from('clients')
    .select('id, name, company, city, phone, email')
    .eq('company_id', companyId);

  // Apply filters
  if (filters.city) query = query.ilike('city', `%${filters.city}%`);
  if (filters.client_name) query = query.ilike('name', `%${filters.client_name}%`);

  const { data, error } = await query.order('name', { ascending: true }).limit(50);

  if (error) throw error;

  const filterDesc = [];
  if (filters.city) filterDesc.push(`in ${filters.city}`);

  return {
    type: 'table',
    data: data || [],
    summary: `Found ${data?.length || 0} clients${filterDesc.length ? ' ' + filterDesc.join(', ') : ''}`
  };
}

async function getExpenses(supabase: any, companyId: string, filters: Record<string, any>) {
  let query = supabase
    .from('expenses')
    .select('id, category, vendor_name, total_amount, payment_status, notes, created_at')
    .eq('company_id', companyId);

  // Apply filters
  if (filters.date_from) query = query.gte('created_at', filters.date_from);
  if (filters.date_to) query = query.lte('created_at', filters.date_to);

  const { data, error } = await query.order('created_at', { ascending: false }).limit(30);

  if (error) throw error;

  const totalExpenses = data?.reduce((sum: number, exp: any) => sum + (exp.total_amount || 0), 0) || 0;
  const pendingCount = data?.filter((exp: any) => exp.payment_status === 'Pending').length || 0;

  return {
    type: 'table',
    data: data || [],
    summary: `Found ${data?.length || 0} expenses. Total: ₹${totalExpenses.toLocaleString()} (${pendingCount} pending payment)`
  };
}

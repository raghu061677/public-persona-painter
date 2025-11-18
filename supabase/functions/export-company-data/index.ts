import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.76.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
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

    const { companyId } = await req.json();

    if (!companyId) {
      throw new Error('Company ID is required');
    }

    // Fetch all company data
    const [
      { data: company },
      { data: users },
      { data: clients },
      { data: mediaAssets },
      { data: plans },
      { data: campaigns },
      { data: invoices },
      { data: estimations },
      { data: expenses },
      { data: leads },
    ] = await Promise.all([
      supabaseClient.from('companies').select('*').eq('id', companyId).single(),
      supabaseClient.from('company_users').select('*').eq('company_id', companyId),
      supabaseClient.from('clients').select('*').eq('company_id', companyId),
      supabaseClient.from('media_assets').select('*').eq('company_id', companyId),
      supabaseClient.from('plans').select('*').eq('company_id', companyId),
      supabaseClient.from('campaigns').select('*').eq('company_id', companyId),
      supabaseClient.from('invoices').select('*').eq('company_id', companyId),
      supabaseClient.from('estimations').select('*').eq('company_id', companyId),
      supabaseClient.from('expenses').select('*').eq('company_id', companyId),
      supabaseClient.from('leads').select('*').eq('company_id', companyId),
    ]);

    const exportData = {
      company,
      users: users || [],
      clients: clients || [],
      mediaAssets: mediaAssets || [],
      plans: plans || [],
      campaigns: campaigns || [],
      invoices: invoices || [],
      estimations: estimations || [],
      expenses: expenses || [],
      leads: leads || [],
      exportedAt: new Date().toISOString(),
    };

    return new Response(
      JSON.stringify(exportData),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
          'Content-Disposition': `attachment; filename="company-${companyId}-backup-${new Date().toISOString().split('T')[0]}.json"`,
        },
      }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    const { companyId } = await req.json();

    if (!companyId) {
      throw new Error('Company ID is required');
    }

    // Check if it's a platform_admin company
    const { data: company } = await supabaseClient
      .from('companies')
      .select('type')
      .eq('id', companyId)
      .single();

    if (company?.type === 'platform_admin') {
      throw new Error('Cannot delete platform admin company');
    }

    // Delete all related data in order
    await supabaseClient.from('company_users').delete().eq('company_id', companyId);
    await supabaseClient.from('booking_requests').delete().eq('owner_company_id', companyId);
    await supabaseClient.from('booking_requests').delete().eq('requester_company_id', companyId);
    await supabaseClient.from('leads').delete().eq('company_id', companyId);
    await supabaseClient.from('clients').delete().eq('company_id', companyId);
    await supabaseClient.from('expenses').delete().eq('company_id', companyId);
    await supabaseClient.from('invoices').delete().eq('company_id', companyId);
    await supabaseClient.from('estimations').delete().eq('company_id', companyId);
    await supabaseClient.from('campaigns').delete().eq('company_id', companyId);
    await supabaseClient.from('plans').delete().eq('company_id', companyId);
    await supabaseClient.from('media_assets').delete().eq('company_id', companyId);
    
    // Finally delete the company
    const { error } = await supabaseClient
      .from('companies')
      .delete()
      .eq('id', companyId);

    if (error) throw error;

    return new Response(
      JSON.stringify({ success: true, message: 'Company and all related data deleted successfully' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
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

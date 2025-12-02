import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RequestBody {
  campaign_id: string;
  company_id: string;
  event_type: string;
  event_title: string;
  event_description?: string;
  created_by?: string;
  metadata?: Record<string, any>;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const body = await req.json() as RequestBody;
    const {
      campaign_id,
      company_id,
      event_type,
      event_title,
      event_description,
      created_by,
      metadata = {}
    } = body;

    if (!campaign_id || !company_id || !event_type) {
      return new Response(
        JSON.stringify({ error: 'Missing required parameters' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Adding timeline event:', { campaign_id, event_type, event_title });

    const { data, error } = await supabase
      .from('campaign_timeline')
      .insert({
        campaign_id,
        company_id,
        event_type,
        event_title,
        event_description,
        created_by,
        metadata,
      })
      .select()
      .single();

    if (error) throw error;

    return new Response(
      JSON.stringify({ success: true, data }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error adding timeline event:', error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Failed to add timeline event',
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

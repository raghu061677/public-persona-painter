import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RequestBody {
  operation_id: string;
  asset_id: string;
  latitude?: number;
  longitude?: number;
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

    const authHeader = req.headers.get('Authorization');
    const token = authHeader?.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { operation_id, asset_id, latitude, longitude } = await req.json() as RequestBody;

    console.log('QR Scan verification:', { operation_id, asset_id });

    // Fetch operation
    const { data: operation, error: opError } = await supabase
      .from('operations')
      .select('*, campaigns!inner(company_id, campaign_name)')
      .eq('id', operation_id)
      .single();

    if (opError || !operation) {
      throw new Error('Operation not found');
    }

    // Verify user access
    const { data: companyUser } = await supabase
      .from('company_users')
      .select('company_id')
      .eq('user_id', user.id)
      .eq('company_id', operation.campaigns.company_id)
      .eq('status', 'active')
      .single();
    
    if (!companyUser) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Update operation with QR verification (OPTIONAL - does not block workflow)
    await supabase
      .from('operations')
      .update({
        qr_verified: true,
        qr_verified_at: new Date().toISOString(),
        qr_location_lat: latitude ?? null,
        qr_location_lng: longitude ?? null,
        status: 'In Progress', // Move to In Progress if not already
      })
      .eq('id', operation_id);

    // Log timeline event
    await supabase.functions.invoke('add-timeline-event', {
      body: {
        campaign_id: operation.campaign_id,
        company_id: operation.campaigns.company_id,
        event_type: 'qr_verified',
        event_title: 'QR Code Verified',
        event_description: `Mounter verified location via QR scan`,
        created_by: user.id,
        metadata: {
          operation_id,
          asset_id,
          latitude,
          longitude,
        },
      },
    });

    return new Response(
      JSON.stringify({
        success: true,
        message: 'QR verification successful',
        operation_id,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error verifying QR scan:', error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Failed to verify QR scan',
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

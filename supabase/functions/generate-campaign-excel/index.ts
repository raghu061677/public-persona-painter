import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RequestBody {
  campaignId: string;
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

    // Verify user authentication and company access
    const authHeader = req.headers.get('Authorization');
    const token = authHeader?.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { campaignId } = await req.json() as RequestBody;

    console.log('Generating Excel report for campaign:', campaignId);

    // Fetch campaign with all related data
    const { data: campaign, error: campaignError } = await supabase
      .from('campaigns')
      .select(`
        *,
        clients!inner(name, gstin),
        campaign_assets(
          id,
          asset_id,
          location,
          city,
          area,
          media_type,
          card_rate,
          printing_charges,
          mounting_charges,
          status,
          assigned_at,
          completed_at
        )
      `)
      .eq('id', campaignId)
      .single();

    if (campaignError || !campaign) {
      throw new Error('Campaign not found');
    }

    // Verify user has access to this campaign's company
    const { data: companyUser } = await supabase
      .from('company_users')
      .select('company_id')
      .eq('user_id', user.id)
      .eq('company_id', campaign.company_id)
      .eq('status', 'active')
      .single();
    
    if (!companyUser) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized - No access to this campaign' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Generate CSV (simpler than Excel for edge function)
    const csvRows = [];
    
    // Header
    csvRows.push([
      'Campaign ID',
      'Campaign Name',
      'Client',
      'Start Date',
      'End Date',
      'Status',
      'Total Amount',
      'GST Amount',
      'Grand Total',
    ].join(','));

    // Campaign summary
    csvRows.push([
      campaign.id,
      `"${campaign.campaign_name}"`,
      `"${campaign.clients.name}"`,
      new Date(campaign.start_date).toLocaleDateString('en-IN'),
      new Date(campaign.end_date).toLocaleDateString('en-IN'),
      campaign.status,
      campaign.total_amount.toFixed(2),
      campaign.gst_amount.toFixed(2),
      campaign.grand_total.toFixed(2),
    ].join(','));

    // Empty row
    csvRows.push('');

    // Assets header
    csvRows.push([
      'Asset ID',
      'Location',
      'City',
      'Area',
      'Media Type',
      'Card Rate',
      'Printing',
      'Mounting',
      'Status',
      'Assigned Date',
      'Completed Date',
    ].join(','));

    // Assets data
    for (const asset of campaign.campaign_assets || []) {
      csvRows.push([
        asset.asset_id,
        `"${asset.location}"`,
        asset.city,
        asset.area,
        asset.media_type,
        asset.card_rate.toFixed(2),
        (asset.printing_charges || 0).toFixed(2),
        (asset.mounting_charges || 0).toFixed(2),
        asset.status,
        asset.assigned_at ? new Date(asset.assigned_at).toLocaleDateString('en-IN') : '',
        asset.completed_at ? new Date(asset.completed_at).toLocaleDateString('en-IN') : '',
      ].join(','));
    }

    const csvContent = csvRows.join('\n');
    const csvBuffer = new TextEncoder().encode(csvContent);

    // Upload to storage
    const fileName = `campaign-report-${campaign.id}-${Date.now()}.csv`;
    const { error: uploadError } = await supabase.storage
      .from('client-documents')
      .upload(fileName, csvBuffer, {
        contentType: 'text/csv',
        upsert: false,
      });

    if (uploadError) {
      throw uploadError;
    }

    // Get signed URL
    const { data: urlData } = await supabase.storage
      .from('client-documents')
      .createSignedUrl(fileName, 3600);

    console.log('Excel report generated successfully:', fileName);

    return new Response(
      JSON.stringify({
        success: true,
        url: urlData?.signedUrl,
        fileName,
        assetCount: campaign.campaign_assets?.length || 0,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error generating campaign Excel:', error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Failed to generate Excel',
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

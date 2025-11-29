import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { corsHeaders } from '../_shared/cors.ts';

// Version 2.0 - Fixed to use job_type and company_id with PascalCase statuses
console.log('Auto-create mounting tasks function v2.0 started');

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { campaign_id } = await req.json();

    if (!campaign_id) {
      return new Response(
        JSON.stringify({ error: 'campaign_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[v2.0] Creating tasks for campaign:', campaign_id);

    // Fetch campaign to get company_id and dates
    const { data: campaign, error: campaignError } = await supabaseClient
      .from('campaigns')
      .select('company_id, start_date, end_date, campaign_name')
      .eq('id', campaign_id)
      .single();

    if (campaignError || !campaign) {
      return new Response(
        JSON.stringify({ error: 'Campaign not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch campaign assets with location details
    const { data: assets, error: assetsError } = await supabaseClient
      .from('campaign_assets')
      .select('asset_id, location, city, area, media_type')
      .eq('campaign_id', campaign_id);

    if (assetsError) {
      return new Response(
        JSON.stringify({ error: assetsError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!assets || assets.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No assets found for this campaign' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create tasks for each asset
    const startDate = new Date(campaign.start_date);
    const printingDate = new Date(startDate);
    printingDate.setDate(printingDate.getDate() - 5); // 5 days before start

    const tasks = [];

    for (const asset of assets) {
      // Printing task (5 days before start)
      tasks.push({
        campaign_id: campaign_id,
        company_id: campaign.company_id,
        asset_id: asset.asset_id,
        job_type: 'Printing',
        status: 'Pending',
        start_date: printingDate.toISOString().split('T')[0],
        city: asset.city,
        area: asset.area,
        location: asset.location,
        media_type: asset.media_type,
        notes: `Printing for ${asset.location} - ${campaign.campaign_name}`,
      });

      // Mounting task (on campaign start date)
      tasks.push({
        campaign_id: campaign_id,
        company_id: campaign.company_id,
        asset_id: asset.asset_id,
        job_type: 'Mounting',
        status: 'Pending',
        start_date: campaign.start_date,
        city: asset.city,
        area: asset.area,
        location: asset.location,
        media_type: asset.media_type,
        notes: `Mounting for ${asset.location} - ${campaign.campaign_name}`,
      });

      // Photo upload task (day after mounting)
      const photoDate = new Date(startDate);
      photoDate.setDate(photoDate.getDate() + 1);
      tasks.push({
        campaign_id: campaign_id,
        company_id: campaign.company_id,
        asset_id: asset.asset_id,
        job_type: 'PhotoUpload',
        status: 'Pending',
        start_date: photoDate.toISOString().split('T')[0],
        city: asset.city,
        area: asset.area,
        location: asset.location,
        media_type: asset.media_type,
        notes: `Photo proof for ${asset.location} - ${campaign.campaign_name}`,
      });
    }

    console.log('[v2.0] Inserting', tasks.length, 'tasks');

    const { data: createdTasks, error: tasksError } = await supabaseClient
      .from('operations_tasks')
      .insert(tasks)
      .select();

    if (tasksError) {
      console.error('[v2.0] Tasks creation error:', tasksError);
      return new Response(
        JSON.stringify({ error: tasksError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[v2.0] Created ${createdTasks.length} operations tasks for campaign ${campaign_id}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        tasks_created: createdTasks.length,
        tasks: createdTasks
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[v2.0] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

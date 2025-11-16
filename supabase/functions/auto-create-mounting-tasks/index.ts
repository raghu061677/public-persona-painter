import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { corsHeaders } from '../_shared/cors.ts';

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

    // Fetch campaign assets
    const { data: assets, error: assetsError } = await supabaseClient
      .from('campaign_assets')
      .select('*')
      .eq('campaign_id', campaign_id);

    if (assetsError) {
      return new Response(
        JSON.stringify({ error: assetsError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create mounting tasks for each asset
    const tasks = assets.map((asset: any) => ({
      campaign_id: campaign_id,
      asset_id: asset.asset_id,
      task_type: 'mounting',
      status: 'pending',
      scheduled_date: new Date().toISOString().split('T')[0],
      notes: `Mounting task for ${asset.location}`
    }));

    const { data: createdTasks, error: tasksError } = await supabaseClient
      .from('operations_tasks')
      .insert(tasks)
      .select();

    if (tasksError) {
      console.error('Tasks creation error:', tasksError);
      return new Response(
        JSON.stringify({ error: tasksError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Created ${createdTasks.length} mounting tasks for campaign ${campaign_id}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        tasks_created: createdTasks.length,
        tasks: createdTasks
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
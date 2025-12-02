import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    console.log('Starting automated campaign status updates...');

    // Call the auto_update_campaign_status function
    const { error: updateError } = await supabaseClient.rpc('auto_update_campaign_status');

    if (updateError) {
      console.error('Error updating campaign statuses:', updateError);
      throw updateError;
    }

    // Get summary of changes
    const { data: summary, error: summaryError } = await supabaseClient
      .from('campaigns')
      .select('status')
      .in('status', ['Draft', 'Upcoming', 'Running', 'Completed']);

    if (summaryError) {
      console.error('Error fetching summary:', summaryError);
    }

    const statusCounts = summary?.reduce((acc: any, campaign: any) => {
      acc[campaign.status] = (acc[campaign.status] || 0) + 1;
      return acc;
    }, {}) || {};

    console.log('Campaign status update complete:', statusCounts);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Campaign statuses updated successfully',
        summary: statusCounts,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error: any) {
    console.error('Error in update-campaign-statuses:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
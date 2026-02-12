// v2.0 - Phase-5: HMAC-protected system endpoint
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';
import { withHmac, supabaseServiceClient, logSecurityAudit } from '../_shared/auth.ts';

Deno.serve(withHmac(async (_req, _rawBody) => {
  try {
    const supabaseClient = supabaseServiceClient();

    console.log('Starting automated campaign status updates...');

    const { error: updateError } = await supabaseClient.rpc('auto_update_campaign_status');
    if (updateError) {
      console.error('Error updating campaign statuses:', updateError);
      throw updateError;
    }

    // Fetch campaigns with their current status to log timeline events
    const { data: campaigns, error: fetchError } = await supabaseClient
      .from('campaigns')
      .select('id, status, company_id, start_date, end_date');

    if (fetchError) {
      console.error('Error fetching campaigns:', fetchError);
    } else {
      const today = new Date();
      for (const campaign of campaigns || []) {
        const startDate = new Date(campaign.start_date);
        const endDate = new Date(campaign.end_date);
        
        try {
          if (campaign.status === 'Running' && startDate.toDateString() === today.toDateString()) {
            await supabaseClient.functions.invoke('add-timeline-event', {
              body: {
                campaign_id: campaign.id,
                company_id: campaign.company_id,
                event_type: 'running',
                event_title: 'Campaign Started',
                event_description: 'Campaign automatically started based on start date',
              },
            });
          } else if (campaign.status === 'Completed' && endDate.toDateString() === today.toDateString()) {
            await supabaseClient.functions.invoke('add-timeline-event', {
              body: {
                campaign_id: campaign.id,
                company_id: campaign.company_id,
                event_type: 'completed',
                event_title: 'Campaign Completed',
                event_description: 'Campaign automatically completed based on end date',
              },
            });
          } else if (campaign.status === 'Upcoming' && startDate > today) {
            const { data: existingEvent } = await supabaseClient
              .from('campaign_timeline')
              .select('id')
              .eq('campaign_id', campaign.id)
              .eq('event_type', 'upcoming')
              .single();
            
            if (!existingEvent) {
              await supabaseClient.functions.invoke('add-timeline-event', {
                body: {
                  campaign_id: campaign.id,
                  company_id: campaign.company_id,
                  event_type: 'upcoming',
                  event_title: 'Campaign Scheduled',
                  event_description: 'Campaign scheduled for future start date',
                },
              });
            }
          }
        } catch (timelineError) {
          console.error('Error logging timeline event:', timelineError);
        }
      }
    }

    const { data: summary } = await supabaseClient
      .from('campaigns')
      .select('status')
      .in('status', ['Draft', 'Upcoming', 'Running', 'Completed', 'Cancelled', 'Archived']);

    const statusCounts = summary?.reduce((acc: any, campaign: any) => {
      acc[campaign.status] = (acc[campaign.status] || 0) + 1;
      return acc;
    }, {}) || {};

    console.log('Campaign status update complete:', statusCounts);

    await logSecurityAudit({
      functionName: 'update-campaign-statuses',
      action: 'cron_campaign_status_update',
      status: 'success',
      metadata: { statusCounts },
    });

    return new Response(
      JSON.stringify({ success: true, message: 'Campaign statuses updated successfully', summary: statusCounts }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );

  } catch (error: any) {
    console.error('Error in update-campaign-statuses:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
}));

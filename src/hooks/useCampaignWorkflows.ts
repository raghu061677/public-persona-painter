import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { triggerEmailEvent, type TriggerEmailOptions } from '@/services/notifications/emailSender';
import { useCompany } from '@/contexts/CompanyContext';

/**
 * Hook to handle automated campaign workflows:
 * - Auto-generate invoice when campaign completes
 * - Auto-record expenses when assets are installed
 * - Auto-create mounting tasks when campaign starts
 */
export function useCampaignWorkflows(campaignId: string | undefined) {
  const { company } = useCompany();

  useEffect(() => {
    if (!campaignId || !company?.id) return;

    // Subscribe to campaign status changes
    const campaignChannel = supabase
      .channel(`campaign-${campaignId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'campaigns',
          filter: `id=eq.${campaignId}`,
        },
        async (payload) => {
          const newStatus = payload.new.status;
          const oldStatus = payload.old?.status;

          // Auto-generate invoice when campaign completes (PascalCase)
          if (newStatus === 'Completed' && oldStatus !== 'Completed') {
            try {
              const { data, error } = await supabase.functions.invoke('auto-generate-invoice', {
                body: { campaign_id: campaignId }
              });

              if (error) throw error;

              toast({
                title: "Invoice Generated",
                description: `Invoice ${data.invoice_id} has been automatically generated`,
              });
            } catch (error: any) {
              console.error('Auto-invoice error:', error);
              toast({
                title: "Invoice Generation Failed",
                description: error.message || "Failed to generate invoice automatically",
                variant: "destructive",
              });
            }

            // Trigger campaign_completed emails
            try {
              const campaignPayload = {
                campaign_name: payload.new.campaign_name || '',
                campaign_code: campaignId,
                campaign_status: 'Completed',
                client_name: payload.new.client_name || '',
                campaign_start_date: payload.new.start_date || '',
                campaign_end_date: payload.new.end_date || '',
              };
              // Internal notification
              await triggerEmailEvent({
                event_key: 'campaign_completed_internal',
                payload: campaignPayload,
                recipients: [{ to: company?.email || '' }],
                company_id: company!.id,
                source_id: campaignId,
              });
              // Client notification — queued for confirm (not forced auto)
              if (payload.new.client_id) {
                const { data: client } = await supabase.from('clients').select('email, name').eq('id', payload.new.client_id).single();
                if (client?.email) {
                  await triggerEmailEvent({
                    event_key: 'campaign_completed_client',
                    payload: campaignPayload,
                    recipients: [{ to: client.email, name: client.name }],
                    company_id: company!.id,
                    source_id: campaignId,
                  });
                }
              }
            } catch (emailErr) {
              console.warn('[CampaignWorkflows] Completion email failed (non-blocking):', emailErr);
            }
          }

          // Create mounting tasks + trigger emails when campaign starts
          if (newStatus === 'InProgress' && oldStatus === 'Planned') {
            try {
              const { data, error } = await supabase.functions.invoke('auto-create-mounting-tasks', {
                body: { campaign_id: campaignId }
              });

              if (error) throw error;

              toast({
                title: "Tasks Created",
                description: `${data.tasks_created} mounting tasks have been created`,
              });
            } catch (error: any) {
              console.error('Auto-task creation error:', error);
            }

            // Trigger campaign_assigned_to_operations_internal
            try {
              await triggerEmailEvent({
                event_key: 'campaign_assigned_to_operations_internal',
                payload: {
                  campaign_name: payload.new.campaign_name || '',
                  campaign_code: campaignId,
                  campaign_start_date: payload.new.start_date || '',
                  campaign_end_date: payload.new.end_date || '',
                  client_name: payload.new.client_name || '',
                },
                recipients: [{ to: company?.email || '' }],
                company_id: company!.id,
                source_id: campaignId,
              });
            } catch (emailErr) {
              console.warn('[CampaignWorkflows] Ops assignment email failed:', emailErr);
            }

            // Trigger campaign_live_client — queued for confirm (not forced auto)
            try {
              if (payload.new.client_id) {
                const { data: client } = await supabase.from('clients').select('email, name').eq('id', payload.new.client_id).single();
                if (client?.email) {
                  await triggerEmailEvent({
                    event_key: 'campaign_live_client',
                    payload: {
                      campaign_name: payload.new.campaign_name || '',
                      campaign_code: campaignId,
                      campaign_start_date: payload.new.start_date || '',
                      campaign_end_date: payload.new.end_date || '',
                      client_name: payload.new.client_name || '',
                    },
                    recipients: [{ to: client.email, name: client.name }],
                    company_id: company!.id,
                    source_id: campaignId,
                  });
                }
              }
            } catch (emailErr) {
              console.warn('[CampaignWorkflows] Campaign live client email failed:', emailErr);
            }
          }
        }
      )
      .subscribe();

    // Subscribe to campaign asset status changes
    const assetChannel = supabase
      .channel(`campaign-assets-${campaignId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'campaign_assets',
          filter: `campaign_id=eq.${campaignId}`,
        },
        async (payload) => {
          const newStatus = payload.new.status;
          const oldStatus = payload.old?.status;

          // Auto-record expenses + trigger installation email when asset is installed
          if (newStatus === 'Installed' && oldStatus !== 'Installed') {
            try {
              const { data, error } = await supabase.functions.invoke('auto-record-expenses', {
                body: { campaign_id: campaignId }
              });

              if (error) throw error;

              console.log(`Auto-recorded ${data.expenses_created} expenses`);
            } catch (error: any) {
              console.error('Auto-expense error:', error);
            }

            // Trigger installation_completed emails
            try {
              const assetPayload = {
                asset_code: payload.new.asset_id || '',
                asset_location: payload.new.location || '',
                asset_city: payload.new.city || '',
                campaign_code: campaignId,
                installation_date: new Date().toISOString().split('T')[0],
              };
              await triggerEmailEvent({
                event_key: 'installation_completed_internal',
                payload: assetPayload,
                recipients: [{ to: company?.email || '' }],
                company_id: company!.id,
                source_id: payload.new.id,
              });
              // installation_completed_client — resolve client from campaign
              try {
                const { data: campaign } = await supabase
                  .from('campaigns')
                  .select('client_id, client_name, campaign_name')
                  .eq('id', campaignId)
                  .single();
                if (campaign?.client_id) {
                  const { data: client } = await supabase
                    .from('clients').select('email, name').eq('id', campaign.client_id).single();
                  if (client?.email) {
                    await triggerEmailEvent({
                      event_key: 'installation_completed_client',
                      payload: {
                        ...assetPayload,
                        campaign_name: campaign.campaign_name || '',
                        client_name: client.name || campaign.client_name || '',
                      },
                      recipients: [{ to: client.email, name: client.name }],
                      company_id: company!.id,
                      source_id: payload.new.id,
                    });
                  }
                }
              } catch (clientErr) {
                console.warn('[CampaignWorkflows] installation_completed_client failed:', clientErr);
              }
            } catch (emailErr) {
              console.warn('[CampaignWorkflows] Installation email failed:', emailErr);
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(campaignChannel);
      supabase.removeChannel(assetChannel);
    };
  }, [campaignId, company?.id]);
}

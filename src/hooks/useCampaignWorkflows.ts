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
              // Client notification (forced auto since this is a realtime handler)
              if (payload.new.client_id) {
                const { data: client } = await supabase.from('clients').select('email, name').eq('id', payload.new.client_id).single();
                if (client?.email) {
                  await triggerEmailEvent({
                    event_key: 'campaign_completed_client',
                    payload: campaignPayload,
                    recipients: [{ to: client.email, name: client.name }],
                    company_id: company!.id,
                    source_id: campaignId,
                    force_send_mode: 'auto',
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

            // Trigger campaign_live_client
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
                    force_send_mode: 'auto', // realtime handler bypasses confirm
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

          // Auto-record expenses when asset is installed (canonical value only)
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
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(campaignChannel);
      supabase.removeChannel(assetChannel);
    };
  }, [campaignId]);
}

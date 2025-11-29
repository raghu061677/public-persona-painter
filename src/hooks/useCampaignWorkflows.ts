import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

/**
 * Hook to handle automated campaign workflows:
 * - Auto-generate invoice when campaign completes
 * - Auto-record expenses when assets are installed
 * - Auto-create mounting tasks when campaign starts
 */
export function useCampaignWorkflows(campaignId: string | undefined) {
  useEffect(() => {
    if (!campaignId) return;

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
          }

          // Create mounting tasks when campaign starts (PascalCase)
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

          // Auto-record expenses when asset is mounted (PascalCase)
          if (newStatus === 'Mounted' && oldStatus !== 'Mounted') {
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

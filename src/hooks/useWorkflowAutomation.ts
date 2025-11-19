import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface WorkflowRule {
  id: string;
  trigger: 'campaign_status_change' | 'invoice_overdue' | 'proof_uploaded' | 'asset_available';
  condition?: (data: any) => boolean;
  action: 'send_notification' | 'send_email' | 'update_status' | 'create_task';
  actionData: any;
}

const defaultWorkflowRules: WorkflowRule[] = [
  {
    id: 'campaign-completed',
    trigger: 'campaign_status_change',
    condition: (data) => data.new.status === 'Completed',
    action: 'send_notification',
    actionData: {
      title: 'Campaign Completed',
      message: 'Campaign has been marked as completed',
    },
  },
  {
    id: 'invoice-overdue',
    trigger: 'invoice_overdue',
    condition: (data) => {
      const dueDate = new Date(data.due_date);
      return dueDate < new Date() && data.status === 'Pending';
    },
    action: 'send_notification',
    actionData: {
      title: 'Invoice Overdue',
      message: 'Invoice payment is overdue',
      variant: 'destructive',
    },
  },
  {
    id: 'proof-uploaded',
    trigger: 'proof_uploaded',
    action: 'send_notification',
    actionData: {
      title: 'Proof Uploaded',
      message: 'Installation proof has been uploaded',
    },
  },
  {
    id: 'asset-available',
    trigger: 'asset_available',
    condition: (data) => data.new.status === 'Available',
    action: 'send_notification',
    actionData: {
      title: 'Asset Available',
      message: 'Media asset is now available for booking',
    },
  },
];

export function useWorkflowAutomation(customRules?: WorkflowRule[]) {
  const { toast } = useToast();
  const rules = customRules || defaultWorkflowRules;

  useEffect(() => {
    const channels: any[] = [];

    // Campaign status changes
    const campaignChannel = supabase
      .channel('campaign-workflow')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'campaigns',
        },
        (payload) => {
          rules
            .filter((rule) => rule.trigger === 'campaign_status_change')
            .forEach((rule) => {
              if (!rule.condition || rule.condition(payload)) {
                executeAction(rule, payload);
              }
            });
        }
      )
      .subscribe();

    channels.push(campaignChannel);

    // Asset status changes
    const assetChannel = supabase
      .channel('asset-workflow')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'media_assets',
        },
        (payload) => {
          rules
            .filter((rule) => rule.trigger === 'asset_available')
            .forEach((rule) => {
              if (!rule.condition || rule.condition(payload)) {
                executeAction(rule, payload);
              }
            });
        }
      )
      .subscribe();

    channels.push(assetChannel);

    // Campaign assets proof upload
    const proofChannel = supabase
      .channel('proof-workflow')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'campaign_assets',
          filter: 'status=eq.ProofUploaded',
        },
        (payload) => {
          rules
            .filter((rule) => rule.trigger === 'proof_uploaded')
            .forEach((rule) => {
              if (!rule.condition || rule.condition(payload)) {
                executeAction(rule, payload);
              }
            });
        }
      )
      .subscribe();

    channels.push(proofChannel);

    // Check for overdue invoices daily
    const checkOverdueInvoices = setInterval(async () => {
      const { data: invoices } = await supabase
        .from('invoices')
        .select('*')
        .lt('due_date', new Date().toISOString())
        .in('status', ['Sent', 'Overdue']);

      invoices?.forEach((invoice) => {
        rules
          .filter((rule) => rule.trigger === 'invoice_overdue')
          .forEach((rule) => {
            if (!rule.condition || rule.condition(invoice)) {
              executeAction(rule, invoice);
            }
          });
      });
    }, 24 * 60 * 60 * 1000); // Check daily

    return () => {
      channels.forEach((channel) => supabase.removeChannel(channel));
      clearInterval(checkOverdueInvoices);
    };
  }, [rules]);

  const executeAction = async (rule: WorkflowRule, data: any) => {
    switch (rule.action) {
      case 'send_notification':
        toast({
          title: rule.actionData.title,
          description: rule.actionData.message,
          variant: rule.actionData.variant || 'default',
        });
        break;

      case 'send_email':
        // Call email edge function
        await supabase.functions.invoke('send-email', {
          body: {
            to: rule.actionData.recipient,
            subject: rule.actionData.subject,
            body: rule.actionData.body,
          },
        });
        break;

      case 'update_status':
        // Update record status
        await supabase
          .from(rule.actionData.table)
          .update({ status: rule.actionData.status })
          .eq('id', data.new?.id || data.id);
        break;

      case 'create_task':
        // Create notification record
        await supabase.from('notifications').insert({
          user_id: rule.actionData.assignee,
          type: 'task',
          title: rule.actionData.title,
          message: rule.actionData.message,
          resource_type: rule.actionData.resourceType,
          resource_id: data.new?.id || data.id,
        });
        break;
    }
  };

  return { rules };
}

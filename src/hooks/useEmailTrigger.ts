/**
 * useEmailTrigger — Lightweight wrapper for triggering email events
 * from business modules. Handles auto-send vs confirm flow cleanly.
 * 
 * Usage in any component:
 *   const { trigger, ConfirmDialog } = useEmailTrigger();
 *   
 *   // After a business action:
 *   trigger('plan_approved_internal', payload, recipients, sourceId);
 *   
 *   // Render the confirm dialog somewhere in JSX:
 *   {ConfirmDialog}
 */

import { useCallback, useState } from "react";
import { useCompany } from "@/contexts/CompanyContext";
import { triggerEmailEvent, sendEmail, type EmailPreview, type TriggerEmailOptions, type EmailRecipient } from "@/services/notifications/emailSender";
import type { EmailPayload } from "@/services/notifications/emailRenderer";
import { toast } from "sonner";
import { EmailSendConfirmDialog } from "@/components/email/EmailSendConfirmDialog";
import React from "react";

export function useEmailTrigger() {
  const { company } = useCompany();
  const [pendingConfirm, setPendingConfirm] = useState<EmailPreview | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const trigger = useCallback(async (
    event_key: string,
    payload: EmailPayload,
    recipients: EmailRecipient[],
    source_id?: string,
  ) => {
    if (!company?.id) {
      console.warn('[useEmailTrigger] No company context — skipping email trigger');
      return;
    }

    // Skip if no recipients
    if (!recipients || recipients.length === 0 || !recipients[0]?.to) {
      console.warn('[useEmailTrigger] No recipients provided — skipping');
      return;
    }

    try {
      const options: TriggerEmailOptions = {
        event_key,
        payload,
        recipients,
        company_id: company.id,
        source_id,
      };

      const result = await triggerEmailEvent(options);

      switch (result.action) {
        case 'sent':
          if (result.success) {
            // Silent success for internal auto emails
          } else {
            console.warn(`[emailTrigger] Send failed: ${result.error}`);
          }
          break;

        case 'confirm':
          setPendingConfirm(result.preview);
          setConfirmOpen(true);
          break;

        case 'skipped':
          console.log(`[emailTrigger] Skipped: ${result.reason}`);
          break;
      }
    } catch (err: any) {
      // Don't crash business flows if email system has issues
      console.error('[emailTrigger] Error:', err);
    }
  }, [company?.id]);

  const handleConfirmSend = useCallback(async (preview: EmailPreview) => {
    const result = await sendEmail(preview);
    if (result.success) {
      toast.success('Email sent successfully');
    } else {
      throw new Error(result.error || 'Send failed');
    }
    setPendingConfirm(null);
  }, []);

  const handleSkip = useCallback(() => {
    setPendingConfirm(null);
    setConfirmOpen(false);
  }, []);

  // Renderable dialog component
  const ConfirmDialog = React.createElement(EmailSendConfirmDialog, {
    open: confirmOpen,
    onOpenChange: setConfirmOpen,
    preview: pendingConfirm,
    onSend: handleConfirmSend,
    onSkip: handleSkip,
  });

  return {
    trigger,
    ConfirmDialog,
    pendingConfirm,
    confirmOpen,
  };
}

/**
 * Helper to build common payloads from plan/campaign/client data
 */
export function buildPlanPayload(plan: any, client?: any, company?: any): EmailPayload {
  return {
    plan_name: plan?.plan_name || plan?.name || '',
    plan_code: plan?.id || plan?.plan_code || '',
    plan_status: plan?.status || '',
    plan_total: plan?.grand_total ? `₹${Number(plan.grand_total).toLocaleString('en-IN')}` : '',
    client_name: client?.name || plan?.client_name || '',
    client_company: client?.name || plan?.client_name || '',
    client_email: client?.email || '',
    client_phone: client?.phone || '',
    campaign_start_date: plan?.start_date || '',
    campaign_end_date: plan?.end_date || '',
    company_name: company?.name || 'Go-Ads 360°',
    company_email: company?.email || '',
    company_phone: company?.phone || '',
    plan_link: `${window.location.origin}/admin/plans/${plan?.id || ''}`,
  };
}

export function buildCampaignPayload(campaign: any, client?: any, company?: any): EmailPayload {
  return {
    campaign_name: campaign?.campaign_name || campaign?.name || '',
    campaign_code: campaign?.id || '',
    campaign_status: campaign?.status || '',
    campaign_start_date: campaign?.start_date || '',
    campaign_end_date: campaign?.end_date || '',
    client_name: client?.name || campaign?.client_name || '',
    client_company: client?.name || campaign?.client_name || '',
    client_email: client?.email || '',
    company_name: company?.name || 'Go-Ads 360°',
    company_email: company?.email || '',
    campaign_link: `${window.location.origin}/admin/campaigns/${campaign?.id || ''}`,
  };
}

export function buildInvoicePayload(invoice: any, client?: any, company?: any): EmailPayload {
  return {
    invoice_number: invoice?.invoice_no || invoice?.id || '',
    invoice_date: invoice?.invoice_date || '',
    due_date: invoice?.due_date || '',
    invoice_total: invoice?.total_amount ? `₹${Number(invoice.total_amount).toLocaleString('en-IN')}` : '',
    amount_due: invoice?.balance_due ? `₹${Number(invoice.balance_due).toLocaleString('en-IN')}` : '',
    amount_paid: invoice?.paid_amount ? `₹${Number(invoice.paid_amount).toLocaleString('en-IN')}` : '',
    balance_due: invoice?.balance_due ? `₹${Number(invoice.balance_due).toLocaleString('en-IN')}` : '',
    client_name: client?.name || invoice?.client_name || '',
    client_company: client?.name || invoice?.client_name || '',
    company_name: company?.name || 'Go-Ads 360°',
    invoice_link: `${window.location.origin}/admin/invoices/${invoice?.id || ''}`,
  };
}

export function buildAssetPayload(asset: any): EmailPayload {
  return {
    asset_code: asset?.asset_id || asset?.id || '',
    asset_name: asset?.location || '',
    asset_location: asset?.location || '',
    asset_city: asset?.city || '',
    asset_area: asset?.area || '',
    media_type: asset?.media_type || '',
    size: asset?.dimensions || '',
  };
}

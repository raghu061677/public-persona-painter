/**
 * useEmailTrigger — Lightweight wrapper for triggering email events
 * from business modules. Handles auto-send vs confirm flow cleanly.
 * 
 * v2: Returns structured result so callers can react to skips/failures.
 */

import { useCallback, useState } from "react";
import { useCompany } from "@/contexts/CompanyContext";
import { supabase } from "@/integrations/supabase/client";
import { triggerEmailEvent, sendEmail, prepareEmail, type EmailPreview, type TriggerEmailOptions, type EmailRecipient } from "@/services/notifications/emailSender";
import type { EmailPayload } from "@/services/notifications/emailRenderer";
import { toast } from "sonner";
import { EmailSendConfirmDialog } from "@/components/email/EmailSendConfirmDialog";
import React from "react";

export type EmailTriggerResult = 
  | { status: 'sent'; success: boolean; error?: string }
  | { status: 'confirm' }
  | { status: 'skipped'; reason: string; reason_code: string }
  | { status: 'error'; reason: string; reason_code: string };

/**
 * Log a failed/skipped email attempt to email_outbox for visibility.
 */
async function logEmailFailure(opts: {
  company_id: string;
  event_key: string;
  source_id?: string;
  recipient_to?: string;
  reason_code: string;
  reason: string;
}) {
  try {
    await supabase
      .from("email_outbox" as any)
      .insert({
        company_id: opts.company_id,
        template_key: opts.event_key,
        event_key: opts.event_key,
        source_module: 'plan',
        source_id: opts.source_id || null,
        entity_type: 'plan',
        recipient_to: opts.recipient_to || 'unknown',
        subject_rendered: `[FAILED] ${opts.event_key}`,
        html_rendered: '',
        payload_json: { reason_code: opts.reason_code, reason: opts.reason },
        status: 'skipped',
        attempt_count: 0,
        last_error: `${opts.reason_code}: ${opts.reason}`,
      } as any);
  } catch (e) {
    console.error('[useEmailTrigger] Failed to log email failure to outbox:', e);
  }
}

export function useEmailTrigger() {
  const { company } = useCompany();
  const [pendingConfirm, setPendingConfirm] = useState<EmailPreview | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const trigger = useCallback(async (
    event_key: string,
    payload: EmailPayload,
    recipients: EmailRecipient[],
    source_id?: string,
  ): Promise<EmailTriggerResult> => {
    // Pre-flight 1: Verify auth session
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      const result: EmailTriggerResult = { 
        status: 'skipped', 
        reason: 'No active auth session', 
        reason_code: 'missing_session' 
      };
      console.warn('[useEmailTrigger] Pre-flight fail:', result);
      if (company?.id) {
        await logEmailFailure({ company_id: company.id, event_key, source_id, reason_code: result.reason_code, reason: result.reason });
      }
      return result;
    }

    // Pre-flight 2: Verify company context
    if (!company?.id) {
      const result: EmailTriggerResult = { 
        status: 'skipped', 
        reason: 'Company context not loaded', 
        reason_code: 'missing_company' 
      };
      console.warn('[useEmailTrigger] Pre-flight fail:', result);
      return result;
    }

    // Pre-flight 3: Verify recipients
    if (!recipients || recipients.length === 0 || !recipients[0]?.to) {
      const result: EmailTriggerResult = { 
        status: 'skipped', 
        reason: 'No valid recipients provided', 
        reason_code: 'missing_recipients' 
      };
      console.warn('[useEmailTrigger] Pre-flight fail:', result);
      await logEmailFailure({ company_id: company.id, event_key, source_id, reason_code: result.reason_code, reason: result.reason });
      return result;
    }

    try {
      const options: TriggerEmailOptions = {
        event_key,
        payload,
        recipients,
        company_id: company.id,
        source_id,
      };

      const triggerResult = await triggerEmailEvent(options);

      switch (triggerResult.action) {
        case 'sent':
          if (!triggerResult.success) {
            console.warn(`[useEmailTrigger] Send failed: ${triggerResult.error}`);
            await logEmailFailure({ 
              company_id: company.id, event_key, source_id, 
              recipient_to: recipients[0]?.to,
              reason_code: 'send_failed', 
              reason: triggerResult.error || 'Unknown send error' 
            });
          }
          return { status: 'sent', success: triggerResult.success, error: triggerResult.error };

        case 'confirm':
          setPendingConfirm(triggerResult.preview);
          setConfirmOpen(true);
          return { status: 'confirm' };

        case 'skipped': {
          const result: EmailTriggerResult = { 
            status: 'skipped', 
            reason: triggerResult.reason, 
            reason_code: triggerResult.reason.includes('template') ? 'missing_template' : 'trigger_skipped' 
          };
          console.warn('[useEmailTrigger] Trigger skipped:', result);
          await logEmailFailure({ 
            company_id: company.id, event_key, source_id, 
            recipient_to: recipients[0]?.to,
            reason_code: result.reason_code, 
            reason: result.reason 
          });
          return result;
        }
      }
    } catch (err: any) {
      const result: EmailTriggerResult = { 
        status: 'error', 
        reason: err.message || String(err), 
        reason_code: 'trigger_exception' 
      };
      console.error('[useEmailTrigger] Exception:', result);
      await logEmailFailure({ 
        company_id: company.id, event_key, source_id, 
        recipient_to: recipients[0]?.to,
        reason_code: result.reason_code, 
        reason: result.reason 
      });
      return result;
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

/**
 * Build an HTML table of asset details for email notifications.
 */
export function buildAssetTableHtml(items: any[]): string {
  if (!items || items.length === 0) return '<p style="color:#94a3b8;">No assets added.</p>';
  const headerStyle = 'padding:6px 8px;text-align:left;border:1px solid #e2e8f0;background:#f1f5f9;font-size:12px;color:#334155;white-space:nowrap;';
  const cellStyle = 'padding:6px 8px;border:1px solid #e2e8f0;font-size:12px;color:#475569;';
  const rows = items.map(item => `<tr>
    <td style="${cellStyle}">${item.asset_id || ''}</td>
    <td style="${cellStyle}">${item.area || ''}</td>
    <td style="${cellStyle}">${item.location || ''}</td>
    <td style="${cellStyle}">${item.direction || ''}</td>
    <td style="${cellStyle}">${item.dimensions || ''}</td>
    <td style="${cellStyle}">${item.total_sqft || ''}</td>
    <td style="${cellStyle}">${item.illumination_type || ''}</td>
    <td style="${cellStyle}">${item.media_type || ''}</td>
  </tr>`).join('');

  return `<table style="width:100%;border-collapse:collapse;margin:8px 0;">
    <thead><tr>
      <th style="${headerStyle}">Asset Code</th>
      <th style="${headerStyle}">Area</th>
      <th style="${headerStyle}">Location</th>
      <th style="${headerStyle}">Direction</th>
      <th style="${headerStyle}">Dimension</th>
      <th style="${headerStyle}">Sqft</th>
      <th style="${headerStyle}">Illumination</th>
      <th style="${headerStyle}">Type</th>
    </tr></thead>
    <tbody>${rows}</tbody>
  </table>`;
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
    invoice_link: `${window.location.origin}/admin/invoices/view/${encodeURIComponent(invoice?.id || '')}`,
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

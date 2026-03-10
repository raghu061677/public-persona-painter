/**
 * useEmailNotificationEngine — React hook for triggering email events
 * from any business module. Handles auto-send vs confirm flow.
 */

import { useState, useCallback } from "react";
import { useCompany } from "@/contexts/CompanyContext";
import { triggerEmailEvent, sendEmail, type EmailPreview, type TriggerEmailOptions } from "@/services/notifications/emailSender";
import type { EmailPayload } from "@/services/notifications/emailRenderer";
import type { EmailRecipient } from "@/services/notifications/emailSender";
import { toast } from "sonner";

export function useEmailNotificationEngine() {
  const { company } = useCompany();
  const [pendingConfirm, setPendingConfirm] = useState<EmailPreview | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  /**
   * Trigger an email event. Auto events send immediately.
   * Confirm events open the confirmation dialog.
   */
  const trigger = useCallback(async (
    event_key: string,
    payload: EmailPayload,
    recipients: EmailRecipient[],
    source_id?: string,
  ) => {
    if (!company?.id) {
      console.warn('[useEmailNotificationEngine] No company context');
      return;
    }

    const options: TriggerEmailOptions = {
      event_key,
      payload,
      recipients,
      company_id: company.id,
      source_id,
    };

    try {
      const result = await triggerEmailEvent(options);

      switch (result.action) {
        case 'sent':
          if (result.success) {
            toast.success('Email sent successfully');
          } else {
            toast.error(`Email failed: ${result.error}`);
          }
          break;

        case 'confirm':
          setPendingConfirm(result.preview);
          setConfirmOpen(true);
          break;

        case 'skipped':
          // Silent skip — no notification needed for skipped events
          console.log(`[emailEngine] Skipped: ${result.reason}`);
          break;
      }
    } catch (err: any) {
      console.error('[emailEngine] Trigger error:', err);
      // Don't toast on trigger errors — template may not exist yet
    }
  }, [company?.id]);

  /**
   * Called from the confirmation dialog when user clicks "Send".
   */
  const confirmSend = useCallback(async (preview: EmailPreview) => {
    const result = await sendEmail(preview);
    if (result.success) {
      toast.success('Email sent successfully');
    } else {
      throw new Error(result.error || 'Send failed');
    }
    setPendingConfirm(null);
  }, []);

  /**
   * Called from the confirmation dialog when user clicks "Skip".
   */
  const skipConfirm = useCallback(() => {
    setPendingConfirm(null);
    setConfirmOpen(false);
  }, []);

  return {
    trigger,
    pendingConfirm,
    confirmOpen,
    setConfirmOpen,
    confirmSend,
    skipConfirm,
  };
}

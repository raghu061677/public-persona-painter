/**
 * Go-Ads 360° — Central Email Sender Service
 * 
 * Orchestrates: event → find template → render → decide send_mode → send/queue → log outbox
 */

import { supabase } from "@/integrations/supabase/client";
import { EMAIL_EVENTS, type EmailEventDefinition } from "./emailEvents";
import { renderTemplate, type EmailPayload } from "./emailRenderer";

export interface EmailRecipient {
  to: string;
  cc?: string;
  bcc?: string;
  name?: string;
}

export interface TriggerEmailOptions {
  event_key: string;
  payload: EmailPayload;
  recipients: EmailRecipient[];
  company_id: string;
  source_id?: string;
  /** Override the template's send_mode for this specific trigger */
  force_send_mode?: 'auto' | 'confirm' | 'manual';
}

export interface EmailPreview {
  event: EmailEventDefinition;
  template_key: string;
  template_name: string;
  subject: string;
  body: string;
  recipients: EmailRecipient[];
  payload: EmailPayload;
  company_id: string;
  source_id?: string;
}

/**
 * Resolve template for an event, render it, and return preview data.
 * Does NOT send — caller decides based on send_mode.
 */
export async function prepareEmail(options: TriggerEmailOptions): Promise<EmailPreview | null> {
  const event = EMAIL_EVENTS[options.event_key];
  if (!event) {
    console.warn(`[emailSender] Unknown event: ${options.event_key}`);
    return null;
  }

  // Find template by trigger_event or template_key matching event_key
  const { data: template } = await supabase
    .from("email_templates" as any)
    .select("*")
    .eq("company_id", options.company_id)
    .or(`trigger_event.eq.${options.event_key},template_key.eq.${options.event_key}`)
    .eq("is_active", true)
    .limit(1)
    .maybeSingle();

  if (!template) {
    console.warn(`[emailSender] No active template for event: ${options.event_key}`);
    return null;
  }

  const t = template as any;
  const subjectTemplate = t.subject_template || t.subject || '';
  const bodyTemplate = t.html_template || t.html_body || '';

  const { subject, body } = renderTemplate(subjectTemplate, bodyTemplate, options.payload);

  return {
    event,
    template_key: t.template_key,
    template_name: t.template_name || t.name || event.label,
    subject,
    body,
    recipients: options.recipients,
    payload: options.payload,
    company_id: options.company_id,
    source_id: options.source_id,
  };
}

/**
 * Send an email immediately via the send-tenant-email edge function.
 * Logs to email_outbox.
 */
export async function sendEmail(preview: EmailPreview): Promise<{ success: boolean; error?: string }> {
  const primary = preview.recipients[0];
  if (!primary) return { success: false, error: 'No recipients' };

  try {
    // Insert outbox entry as "processing"
    const { data: outboxEntry } = await supabase
      .from("email_outbox" as any)
      .insert({
        company_id: preview.company_id,
        template_key: preview.template_key,
        event_key: preview.event.event_key,
        source_module: preview.event.source_module,
        source_id: preview.source_id || null,
        entity_type: preview.event.category,
        recipient_to: primary.to,
        recipient_cc: primary.cc || null,
        recipient_bcc: primary.bcc || null,
        subject_rendered: preview.subject,
        html_rendered: preview.body,
        payload_json: preview.payload,
        status: 'processing',
        attempt_count: 1,
      } as any)
      .select("id")
      .single();

    const outboxId = (outboxEntry as any)?.id;

    // Call the edge function
    const { data, error } = await supabase.functions.invoke("send-tenant-email", {
      body: {
        to: primary.to,
        subject: preview.subject,
        html: preview.body,
      },
    });

    if (error) {
      // Update outbox as failed
      if (outboxId) {
        await supabase
          .from("email_outbox" as any)
          .update({ status: 'failed', last_error: error.message || String(error), failed_at: new Date().toISOString() } as any)
          .eq("id", outboxId);
      }
      return { success: false, error: error.message || String(error) };
    }

    // Update outbox as sent
    if (outboxId) {
      await supabase
        .from("email_outbox" as any)
        .update({ status: 'sent', sent_at: new Date().toISOString() } as any)
        .eq("id", outboxId);
    }

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/**
 * Main trigger function — resolves the event, prepares, and either auto-sends
 * or returns preview for confirmation.
 * 
 * Returns:
 * - { action: 'sent' } — email was auto-sent
 * - { action: 'confirm', preview } — needs user confirmation
 * - { action: 'skipped', reason } — template disabled/missing
 */
export async function triggerEmailEvent(
  options: TriggerEmailOptions
): Promise<
  | { action: 'sent'; success: boolean; error?: string }
  | { action: 'confirm'; preview: EmailPreview }
  | { action: 'skipped'; reason: string }
> {
  const event = EMAIL_EVENTS[options.event_key];
  if (!event) {
    return { action: 'skipped', reason: `Unknown event: ${options.event_key}` };
  }

  const preview = await prepareEmail(options);
  if (!preview) {
    return { action: 'skipped', reason: `No active template for event: ${options.event_key}` };
  }

  const effectiveSendMode = options.force_send_mode || event.send_mode;

  if (effectiveSendMode === 'auto') {
    const result = await sendEmail(preview);
    return { action: 'sent', ...result };
  }

  if (effectiveSendMode === 'confirm') {
    return { action: 'confirm', preview };
  }

  // manual — just skip, user will send manually
  return { action: 'skipped', reason: 'Manual send mode — user action required' };
}

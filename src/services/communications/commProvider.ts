/**
 * Communication Provider Abstraction Layer
 * 
 * Provides a clean interface for sending messages via WhatsApp and Email,
 * with automatic fallback to manual mode when providers are not configured.
 */

import { supabase } from "@/integrations/supabase/client";

export interface SendResult {
  success: boolean;
  mode: "direct" | "manual" | "fallback";
  externalMessageId?: string;
  error?: string;
}

export interface WhatsAppPayload {
  phoneNumber?: string;
  message: string;
}

export interface EmailPayload {
  to?: string;
  subject: string;
  body: string;
  htmlBody?: string;
}

// ── Provider Detection ──

let _whatsappConfigured: boolean | null = null;
let _emailConfigured: boolean | null = null;

export async function isWhatsAppProviderConfigured(): Promise<boolean> {
  if (_whatsappConfigured !== null) return _whatsappConfigured;
  try {
    // Check if a WhatsApp edge function exists by looking for config
    // For now, always false — will be true once WhatsApp API is connected
    _whatsappConfigured = false;
  } catch {
    _whatsappConfigured = false;
  }
  return _whatsappConfigured;
}

export async function isEmailProviderConfigured(): Promise<boolean> {
  if (_emailConfigured !== null) return _emailConfigured;
  try {
    // Check if send-tenant-email edge function is deployed
    const { error } = await supabase.functions.invoke("send-tenant-email", {
      body: { ping: true },
    });
    // If we get a response (even error), the function exists
    _emailConfigured = !error || !error.message?.includes("not found");
  } catch {
    _emailConfigured = false;
  }
  return _emailConfigured;
}

export function resetProviderCache() {
  _whatsappConfigured = null;
  _emailConfigured = null;
}

// ── WhatsApp Send ──

export async function sendWhatsAppMessage(payload: WhatsAppPayload): Promise<SendResult> {
  const configured = await isWhatsAppProviderConfigured();

  if (configured && payload.phoneNumber) {
    try {
      // Future: call WhatsApp API edge function
      // const { data, error } = await supabase.functions.invoke("send-whatsapp", {
      //   body: { phone: payload.phoneNumber, message: payload.message },
      // });
      // if (error) throw error;
      // return { success: true, mode: "direct", externalMessageId: data?.messageId };
      
      // For now, fall through to manual
    } catch (err: any) {
      return { success: false, mode: "direct", error: err.message };
    }
  }

  // Manual fallback — open WhatsApp deep link
  const encoded = encodeURIComponent(payload.message);
  const phone = payload.phoneNumber?.replace(/[^0-9]/g, "") || "";
  const url = phone
    ? `https://wa.me/${phone}?text=${encoded}`
    : `https://wa.me/?text=${encoded}`;
  window.open(url, "_blank");
  return { success: true, mode: "manual" };
}

// ── Email Send ──

export async function sendEmailMessage(payload: EmailPayload): Promise<SendResult> {
  const configured = await isEmailProviderConfigured();

  if (configured && payload.to) {
    try {
      const { data, error } = await supabase.functions.invoke("send-tenant-email", {
        body: {
          to: payload.to,
          subject: payload.subject,
          html: payload.htmlBody || `<pre style="font-family:sans-serif;white-space:pre-wrap;">${escapeHtml(payload.body)}</pre>`,
        },
      });

      if (error) {
        return { success: false, mode: "direct", error: error.message };
      }

      return {
        success: true,
        mode: "direct",
        externalMessageId: (data as any)?.id || (data as any)?.messageId,
      };
    } catch (err: any) {
      return { success: false, mode: "direct", error: err.message };
    }
  }

  // Manual fallback — open mailto
  const subject = encodeURIComponent(payload.subject);
  const body = encodeURIComponent(payload.body);
  const to = payload.to ? encodeURIComponent(payload.to) : "";
  window.open(`mailto:${to}?subject=${subject}&body=${body}`, "_blank");
  return { success: true, mode: "manual" };
}

// ── Helpers ──

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// ── Communication Logger ──

export interface CommLogEntry {
  company_id: string;
  client_id: string;
  invoice_id: string;
  campaign_id?: string | null;
  message: string;
  channel: string;
  template_type: string;
  sent_by: string;
  status: string;
  external_message_id?: string | null;
  failure_reason?: string | null;
  parent_comm_id?: string | null;
  sent_at?: string;
}

export async function logCommunication(entry: CommLogEntry): Promise<{ id?: string; error?: string }> {
  const { data, error } = await supabase
    .from("collection_communications" as any)
    .insert({
      ...entry,
      sent_at: entry.sent_at || new Date().toISOString(),
      retry_count: 0,
    } as any)
    .select("id")
    .single();

  if (error) return { error: error.message };
  return { id: (data as any)?.id };
}

export async function updateCommStatus(
  commId: string,
  updates: {
    status?: string;
    external_message_id?: string;
    failure_reason?: string;
    delivered_at?: string;
    opened_at?: string;
    retry_count?: number;
  }
): Promise<void> {
  await supabase
    .from("collection_communications" as any)
    .update(updates as any)
    .eq("id", commId);
}

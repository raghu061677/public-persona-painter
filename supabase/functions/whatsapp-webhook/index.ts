// WhatsApp Cloud API webhook receiver
// GET: handles Meta verification challenge
// POST: persists incoming messages, creates/updates leads, optional auto-reply
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const VERIFY_TOKEN = Deno.env.get("WHATSAPP_VERIFY_TOKEN") ?? "";
const ACCESS_TOKEN = Deno.env.get("WHATSAPP_ACCESS_TOKEN") ?? "";
const PHONE_NUMBER_ID = Deno.env.get("WHATSAPP_PHONE_NUMBER_ID") ?? "";
const AUTO_REPLY_ENABLED =
  (Deno.env.get("WHATSAPP_AUTO_REPLY_ENABLED") ?? "true").toLowerCase() !== "false";

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE, {
  auth: { persistSession: false },
});

async function sendAutoReply(to: string, body: string) {
  if (!ACCESS_TOKEN || !PHONE_NUMBER_ID) return null;
  try {
    const res = await fetch(
      `https://graph.facebook.com/v20.0/${PHONE_NUMBER_ID}/messages`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${ACCESS_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          to,
          type: "text",
          text: { body },
        }),
      },
    );
    const json = await res.json().catch(() => ({}));
    return json;
  } catch (e) {
    console.error("auto-reply send failed", e);
    return null;
  }
}

function parseRequirement(text: string) {
  const lower = text.toLowerCase();
  const budget = (text.match(/(?:budget|₹|rs\.?|inr)\s*([0-9,]+)/i) || [])[1];
  const mediaTypes = [
    "billboard",
    "hoarding",
    "bus shelter",
    "unipole",
    "cantilever",
    "digital",
  ];
  const mediaType = mediaTypes.find((m) => lower.includes(m));
  return {
    estimated_budget: budget ? Number(budget.replace(/,/g, "")) : null,
    media_type: mediaType ?? null,
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  // 1. Meta verification
  if (req.method === "GET") {
    const url = new URL(req.url);
    const mode = url.searchParams.get("hub.mode");
    const token = url.searchParams.get("hub.verify_token");
    const challenge = url.searchParams.get("hub.challenge");
    if (mode === "subscribe" && token && token === VERIFY_TOKEN) {
      return new Response(challenge ?? "", { status: 200 });
    }
    return new Response("Forbidden", { status: 403 });
  }

  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  let payload: any = null;
  try {
    payload = await req.json();
  } catch {
    return new Response("Invalid JSON", { status: 400 });
  }

  try {
    const entries = payload?.entry ?? [];
    for (const entry of entries) {
      const changes = entry?.changes ?? [];
      for (const change of changes) {
        const value = change?.value ?? {};
        const metadata = value?.metadata ?? {};
        const businessNumber = metadata?.display_phone_number ?? null;

        // Status callbacks
        const statuses = value?.statuses ?? [];
        for (const st of statuses) {
          if (!st?.id) continue;
          await supabase
            .from("whatsapp_logs")
            .update({ status: st.status })
            .eq("wa_message_id", st.id);
        }

        // Inbound messages
        const messages = value?.messages ?? [];
        const contacts = value?.contacts ?? [];
        for (const msg of messages) {
          const from = msg.from as string;
          const waId = msg.id as string;
          const type = msg.type as string;
          const text =
            type === "text"
              ? (msg.text?.body ?? "")
              : type === "button"
                ? (msg.button?.text ?? "")
                : type === "interactive"
                  ? (msg.interactive?.list_reply?.title ??
                    msg.interactive?.button_reply?.title ??
                    "")
                  : "";
          const contactName =
            contacts.find((c: any) => c.wa_id === from)?.profile?.name ?? null;

          // Idempotency: skip if already stored
          const { data: existing } = await supabase
            .from("whatsapp_logs")
            .select("id")
            .eq("wa_message_id", waId)
            .maybeSingle();
          if (existing) continue;

          // Find or create lead by phone (whatsapp source)
          const { data: existingLead } = await supabase
            .from("leads")
            .select("id, status, last_message_at, requirement")
            .eq("phone", from)
            .eq("source", "whatsapp")
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle();

          let leadId: string | null = existingLead?.id ?? null;
          let isNewLead = false;

          if (!leadId) {
            const parsed = parseRequirement(text);
            const { data: created } = await supabase
              .from("leads")
              .insert({
                name: contactName || `WhatsApp ${from}`,
                phone: from,
                source: "whatsapp",
                status: "new",
                requirement: text || null,
                raw_message: text || null,
                last_message_at: new Date().toISOString(),
                ...parsed,
              })
              .select("id")
              .single();
            leadId = created?.id ?? null;
            isNewLead = true;
          } else {
            await supabase
              .from("leads")
              .update({
                last_message_at: new Date().toISOString(),
                requirement: existingLead?.requirement || text || null,
              })
              .eq("id", leadId);
          }

          await supabase.from("whatsapp_logs").insert({
            wa_message_id: waId,
            phone_number: from,
            from_number: from,
            to_number: businessNumber,
            contact_name: contactName,
            message_type: "incoming",
            content_type: type === "text" ? "text" : type,
            message_body: text || null,
            raw_payload: msg,
            status: "delivered",
            lead_id: leadId,
          });

          // Auto-reply (only on first message, throttled by isNewLead OR 24h gap)
          if (AUTO_REPLY_ENABLED) {
            const lastTs = existingLead?.last_message_at
              ? new Date(existingLead.last_message_at).getTime()
              : 0;
            const longGap = Date.now() - lastTs > 24 * 60 * 60 * 1000;
            if (isNewLead || longGap) {
              // Read settings for default text (best-effort)
              const { data: settings } = await supabase
                .from("whatsapp_settings")
                .select("auto_reply_enabled, auto_reply_text")
                .is("company_id", null)
                .maybeSingle();
              const enabled = settings?.auto_reply_enabled ?? true;
              const body =
                settings?.auto_reply_text ??
                "Thank you for contacting Matrix Network Solutions. We have received your outdoor advertising enquiry. Please share your target locations, campaign dates, media type, and budget so we can send suitable available media options.";
              if (enabled) {
                const result = await sendAutoReply(from, body);
                const outId = result?.messages?.[0]?.id ?? null;
                if (outId) {
                  await supabase.from("whatsapp_logs").insert({
                    wa_message_id: outId,
                    phone_number: from,
                    from_number: businessNumber,
                    to_number: from,
                    message_type: "outgoing",
                    content_type: "text",
                    message_body: body,
                    status: "sent",
                    lead_id: leadId,
                    raw_payload: result,
                  });
                }
              }
            }
          }
        }
      }
    }

    return new Response(JSON.stringify({ status: "EVENT_RECEIVED" }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("whatsapp-webhook error", e);
    // Always 200 so Meta does not retry-storm
    return new Response(JSON.stringify({ status: "ERROR" }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
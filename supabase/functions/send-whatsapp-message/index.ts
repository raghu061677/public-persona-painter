// Send a WhatsApp text message via Meta Cloud API and persist a log row.
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const ACCESS_TOKEN = Deno.env.get("WHATSAPP_ACCESS_TOKEN") ?? "";
const PHONE_NUMBER_ID = Deno.env.get("WHATSAPP_PHONE_NUMBER_ID") ?? "";

function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return jsonResponse({ error: "Unauthorized" }, 401);
  }

  const userClient = createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
  });
  const token = authHeader.replace("Bearer ", "");
  const { data: claimsData, error: claimsErr } =
    await userClient.auth.getClaims(token);
  if (claimsErr || !claimsData?.claims) {
    return jsonResponse({ error: "Unauthorized" }, 401);
  }

  if (!ACCESS_TOKEN || !PHONE_NUMBER_ID) {
    return jsonResponse(
      {
        error:
          "WhatsApp not configured. Add WHATSAPP_ACCESS_TOKEN and WHATSAPP_PHONE_NUMBER_ID secrets.",
      },
      500,
    );
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: "Invalid JSON body" }, 400);
  }

  const to = String(body?.to ?? "").trim();
  const message = String(body?.message ?? "").trim();
  const lead_id = body?.lead_id ?? null;
  const client_id = body?.client_id ?? null;

  if (!to) return jsonResponse({ error: "Phone number is required" }, 400);
  if (!message) return jsonResponse({ error: "Message is required" }, 400);
  if (message.length > 4000)
    return jsonResponse({ error: "Message too long" }, 400);

  const cleanTo = to.replace(/[^\d+]/g, "").replace(/^\+/, "");

  // Send via Meta
  let metaResp: any = null;
  let metaStatus = 0;
  try {
    const r = await fetch(
      `https://graph.facebook.com/v20.0/${PHONE_NUMBER_ID}/messages`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${ACCESS_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          to: cleanTo,
          type: "text",
          text: { body: message, preview_url: true },
        }),
      },
    );
    metaStatus = r.status;
    metaResp = await r.json().catch(() => ({}));
  } catch (e) {
    console.error("Meta API call failed", e);
    return jsonResponse({ error: "WhatsApp API call failed" }, 502);
  }

  if (metaStatus < 200 || metaStatus >= 300) {
    console.error("Meta API error", metaStatus, metaResp);
    return jsonResponse(
      { error: metaResp?.error?.message || "WhatsApp API error", details: metaResp },
      502,
    );
  }

  const waMessageId = metaResp?.messages?.[0]?.id ?? null;

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE, {
    auth: { persistSession: false },
  });

  await admin.from("whatsapp_logs").insert({
    wa_message_id: waMessageId,
    phone_number: cleanTo,
    from_number: null,
    to_number: cleanTo,
    message_type: "outgoing",
    content_type: "text",
    message_body: message,
    status: "sent",
    lead_id,
    client_id,
    raw_payload: metaResp,
  });

  if (lead_id) {
    await admin
      .from("leads")
      .update({ last_message_at: new Date().toISOString() })
      .eq("id", lead_id);
  }

  return jsonResponse({ success: true, wa_message_id: waMessageId });
});
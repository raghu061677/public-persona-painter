// v2.0 - Phase-5: HMAC-protected system endpoint
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@4";
import { requireHmac, AuthError } from '../_shared/auth.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-application-name',
};

type DigestSettings = {
  enabled: boolean;
  recipients_to: string[];
  recipients_cc: string[];
  windows_days: number[];
  whatsapp_enabled: boolean;
  whatsapp_recipients: string[];
  sender_name: string | null;
  daily_digest_enabled: boolean;
  per_campaign_enabled: boolean;
  per_invoice_enabled: boolean;
  campaign_end_window_days: number;
  invoice_buckets: string[];
};

const DEFAULT_ASSET_COLS = [
  { key: "asset_id", label: "Asset ID" },
  { key: "area", label: "Area" },
  { key: "location", label: "Location" },
  { key: "direction", label: "Direction" },
  { key: "dimension", label: "Dimension" },
  { key: "sqft", label: "Sqft" },
  { key: "illumination", label: "Illumination" },
];

// ===== Branding Constants =====
const BRAND = {
  primary: "#1E40AF",
  primaryLight: "#3B82F6",
  accent: "#10B981",
  accentLight: "#34D399",
  bg: "#F8FAFC",
  cardBg: "#FFFFFF",
  border: "#E2E8F0",
  borderLight: "#F1F5F9",
  textDark: "#0F172A",
  textMuted: "#64748B",
  textLight: "#94A3B8",
  warning: "#F59E0B",
  warningBg: "#FFFBEB",
  warningBorder: "#FDE68A",
  danger: "#DC2626",
  dangerBg: "#FEF2F2",
  dangerBorder: "#FECACA",
  successBg: "#F0FDF4",
  successBorder: "#BBF7D0",
  logoUrl: "https://go-ads.lovable.app/lovable-uploads/d210e070-5f7e-41e4-a17a-2c9d3a4f74be.png",
};

function esc(s: unknown): string {
  const str = String(s ?? "—");
  return str.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#39;");
}

function renderSectionCard(title: string, count: number, icon: string, accentColor: string, content: string): string {
  return `
  <div style="background:${BRAND.cardBg};border-radius:12px;border:1px solid ${BRAND.border};margin-bottom:24px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.06);">
    <div style="display:flex;align-items:center;padding:16px 20px;border-bottom:1px solid ${BRAND.borderLight};background:${BRAND.bg};">
      <span style="font-size:20px;margin-right:10px;">${icon}</span>
      <div style="flex:1;">
        <h3 style="margin:0;font-size:15px;font-weight:700;color:${BRAND.textDark};">${esc(title)}</h3>
      </div>
      <span style="background:${accentColor};color:white;font-size:12px;font-weight:700;padding:4px 12px;border-radius:20px;">${count}</span>
    </div>
    <div style="padding:16px 20px;">
      ${content}
    </div>
  </div>`;
}

function renderTable(rows: any[], cols: { key: string; label: string }[]): string {
  if (!rows?.length) {
    return `<p style="color:${BRAND.textMuted};font-size:13px;text-align:center;padding:16px 0;margin:0;">No records found.</p>`;
  }
  const thead = cols.map(c =>
    `<th style="padding:10px 14px;background:${BRAND.primary};color:white;text-align:left;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;white-space:nowrap;">${esc(c.label)}</th>`
  ).join("");
  const tbody = rows.map((r, i) => {
    const bg = i % 2 === 0 ? BRAND.cardBg : BRAND.borderLight;
    const tds = cols.map(c =>
      `<td style="padding:8px 14px;border-bottom:1px solid ${BRAND.border};font-size:12px;color:${BRAND.textDark};background:${bg};white-space:nowrap;">${esc(r[c.key])}</td>`
    ).join("");
    return `<tr>${tds}</tr>`;
  }).join("");
  return `<div style="overflow-x:auto;border-radius:8px;border:1px solid ${BRAND.border};">
    <table style="border-collapse:collapse;min-width:900px;width:100%;"><tr>${thead}</tr>${tbody}</table>
  </div>`;
}

function renderInfoBanner(items: { label: string; value: string }[], bgColor: string, borderColor: string): string {
  const rows = items.map(item =>
    `<tr><td style="padding:4px 0;font-size:13px;color:${BRAND.textMuted};width:140px;font-weight:600;">${esc(item.label)}</td><td style="padding:4px 0;font-size:13px;color:${BRAND.textDark};">${esc(item.value)}</td></tr>`
  ).join("");
  return `<div style="background:${bgColor};border:1px solid ${borderColor};border-radius:10px;padding:16px 20px;margin-bottom:16px;">
    <table style="border-collapse:collapse;">${rows}</table>
  </div>`;
}

function renderKPIBar(items: { label: string; value: string; color: string }[]): string {
  const cells = items.map(item =>
    `<td style="text-align:center;padding:12px 16px;">
      <div style="font-size:24px;font-weight:800;color:${item.color};line-height:1;">${esc(item.value)}</div>
      <div style="font-size:11px;color:${BRAND.textMuted};margin-top:4px;text-transform:uppercase;letter-spacing:0.5px;">${esc(item.label)}</div>
    </td>`
  ).join("");
  return `<div style="background:${BRAND.bg};border-radius:10px;border:1px solid ${BRAND.border};margin-bottom:24px;overflow:hidden;">
    <table style="width:100%;border-collapse:collapse;"><tr>${cells}</tr></table>
  </div>`;
}

function wrapEmail(title: string, subtitle: string, inner: string): string {
  const year = new Date().getFullYear();
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${esc(title)}</title>
</head>
<body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;background:${BRAND.bg};-webkit-font-smoothing:antialiased;">
  <div style="max-width:1200px;margin:0 auto;padding:24px 16px;">

    <!-- Header -->
    <div style="background:linear-gradient(135deg, ${BRAND.primary} 0%, ${BRAND.primaryLight} 100%);border-radius:16px 16px 0 0;padding:28px 32px;text-align:left;">
      <table style="width:100%;border-collapse:collapse;">
        <tr>
          <td style="vertical-align:middle;">
            <img src="${BRAND.logoUrl}" alt="GO-ADS 360°" style="height:42px;display:block;" />
          </td>
          <td style="text-align:right;vertical-align:middle;">
            <div style="color:rgba(255,255,255,0.7);font-size:12px;text-transform:uppercase;letter-spacing:1px;">Daily Alert System</div>
          </td>
        </tr>
      </table>
      <div style="margin-top:20px;">
        <h1 style="margin:0;font-size:22px;font-weight:700;color:white;letter-spacing:-0.3px;">${esc(title)}</h1>
        <p style="margin:6px 0 0;color:rgba(255,255,255,0.8);font-size:13px;">${esc(subtitle)}</p>
      </div>
    </div>

    <!-- Body -->
    <div style="background:${BRAND.cardBg};border-left:1px solid ${BRAND.border};border-right:1px solid ${BRAND.border};padding:28px 24px;">
      ${inner}
    </div>

    <!-- Footer -->
    <div style="background:${BRAND.bg};border:1px solid ${BRAND.border};border-top:none;border-radius:0 0 16px 16px;padding:20px 24px;text-align:center;">
      <p style="margin:0 0 4px;font-size:12px;color:${BRAND.textLight};">
        Automated alert from <strong style="color:${BRAND.primary};">GO-ADS 360°</strong> · OOH Media Management Platform
      </p>
      <p style="margin:0;font-size:11px;color:${BRAND.textLight};">
        © ${year} Matrix Network Solutions · Hyderabad, India · Configure recipients in Settings
      </p>
    </div>
  </div>
</body>
</html>`;
}

async function logOnce(supabase: any, today: string, alertType: string, entityType: string, entityId: string): Promise<boolean> {
  const { error } = await supabase.from("alert_log").insert({ alert_date: today, alert_type: alertType, entity_type: entityType, entity_id: entityId });
  return !error;
}

// ===== WhatsApp Formatting =====
function formatWhatsAppDigest(
  vacant: any[],
  endingTodayRows: any[],
  endingBuckets: { days: number; rows: any[] }[],
  dueToday: any[],
  dueNext7: any[],
  overdue: any[],
  today: string,
): string {
  const lines: string[] = [];
  lines.push(`📊 *GO-ADS 360° Daily Digest*`);
  lines.push(`📅 ${today}`);
  lines.push(`━━━━━━━━━━━━━━━━━━━━━`);
  lines.push(``);

  // KPI summary
  lines.push(`📈 *Summary*`);
  lines.push(`🟢 Vacant Assets: *${vacant.length}*`);
  lines.push(`⚠️ Ending Today: *${endingTodayRows.length}*`);
  lines.push(`🔴 Overdue Invoices: *${overdue.length}*`);
  lines.push(`💰 Total Dues: *${dueToday.length + dueNext7.length + overdue.length}*`);
  lines.push(``);

  // Vacant assets (top 10)
  if (vacant.length > 0) {
    lines.push(`━━━━━━━━━━━━━━━━━━━━━`);
    lines.push(`🟢 *Available Assets (${vacant.length})*`);
    const showVacant = vacant.slice(0, 10);
    for (const a of showVacant) {
      lines.push(`  • ${a.asset_id} — ${a.area}, ${a.location} (${a.dimension || "—"})`);
    }
    if (vacant.length > 10) lines.push(`  _...and ${vacant.length - 10} more_`);
    lines.push(``);
  }

  // Ending today
  if (endingTodayRows.length > 0) {
    lines.push(`━━━━━━━━━━━━━━━━━━━━━`);
    lines.push(`⚠️ *Assets Ending Today (${endingTodayRows.length})*`);
    for (const a of endingTodayRows.slice(0, 10)) {
      lines.push(`  • ${a.asset_id} — ${a.client_name || "—"} / ${a.campaign_name || "—"}`);
    }
    if (endingTodayRows.length > 10) lines.push(`  _...and ${endingTodayRows.length - 10} more_`);
    lines.push(``);
  }

  // Ending buckets
  for (const b of endingBuckets) {
    if (b.rows.length > 0) {
      lines.push(`📅 *Ending in ${b.days} Days (${b.rows.length})*`);
      for (const a of b.rows.slice(0, 8)) {
        lines.push(`  • ${a.asset_id} — ${a.client_name || "—"} (End: ${a.booking_end_date || "—"})`);
      }
      if (b.rows.length > 8) lines.push(`  _...and ${b.rows.length - 8} more_`);
      lines.push(``);
    }
  }

  // Finance section
  lines.push(`━━━━━━━━━━━━━━━━━━━━━`);
  lines.push(`💰 *Finance*`);
  lines.push(``);

  if (overdue.length > 0) {
    lines.push(`🔴 *Overdue Invoices (${overdue.length})*`);
    for (const inv of overdue.slice(0, 8)) {
      lines.push(`  • ${inv.invoice_id} — ${inv.client_name} | ₹${inv.outstanding} (Due: ${inv.due_date})`);
    }
    if (overdue.length > 8) lines.push(`  _...and ${overdue.length - 8} more_`);
    lines.push(``);
  }

  if (dueToday.length > 0) {
    lines.push(`📋 *Due Today (${dueToday.length})*`);
    for (const inv of dueToday.slice(0, 8)) {
      lines.push(`  • ${inv.invoice_id} — ${inv.client_name} | ₹${inv.outstanding}`);
    }
    if (dueToday.length > 8) lines.push(`  _...and ${dueToday.length - 8} more_`);
    lines.push(``);
  }

  if (dueNext7.length > 0) {
    lines.push(`📆 *Due Next 7 Days (${dueNext7.length})*`);
    for (const inv of dueNext7.slice(0, 8)) {
      lines.push(`  • ${inv.invoice_id} — ${inv.client_name} | ₹${inv.outstanding} (Due: ${inv.due_date})`);
    }
    if (dueNext7.length > 8) lines.push(`  _...and ${dueNext7.length - 8} more_`);
    lines.push(``);
  }

  if (overdue.length === 0 && dueToday.length === 0 && dueNext7.length === 0) {
    lines.push(`  ✅ No pending dues`);
    lines.push(``);
  }

  lines.push(`━━━━━━━━━━━━━━━━━━━━━`);
  lines.push(`_Automated alert from GO-ADS 360°_`);
  lines.push(`_Matrix Network Solutions_`);
  return lines.join("\n");
}

async function sendWhatsAppMessage(phoneNumber: string, message: string): Promise<void> {
  const accessToken = Deno.env.get("WHATSAPP_ACCESS_TOKEN");
  const phoneNumberId = Deno.env.get("WHATSAPP_PHONE_NUMBER_ID");
  if (!accessToken || !phoneNumberId) throw new Error("WhatsApp credentials not configured");

  const url = `https://graph.facebook.com/v21.0/${phoneNumberId}/messages`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: phoneNumber,
      type: "text",
      text: { preview_url: false, body: message },
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`WhatsApp API error [${res.status}]: ${err}`);
  }
  await res.text(); // consume body
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  // HMAC validation for cron/system calls
  try {
    const cloned = req.clone();
    const rawBody = await cloned.text();
    await requireHmac(req, rawBody);
  } catch (hmacErr) {
    if (hmacErr instanceof AuthError) {
      return new Response(JSON.stringify({ error: hmacErr.message }), {
        status: hmacErr.statusCode,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    throw hmacErr;
  }

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
  const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

  if (!SUPABASE_URL || !SERVICE_KEY || !RESEND_API_KEY) {
    console.error("Missing env vars");
    return new Response(JSON.stringify({ error: "Missing env: SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY / RESEND_API_KEY" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  // Check for test mode
  const url = new URL(req.url);
  const isTestMode = url.searchParams.get("mode") === "test";

  const supabase = createClient(SUPABASE_URL, SERVICE_KEY);
  const resend = new Resend(RESEND_API_KEY);

  // Load settings
  const { data: settingsRow, error: setErr } = await supabase.from("daily_digest_settings").select("*").limit(1).maybeSingle();
  if (setErr) {
    console.error("Settings error:", setErr.message);
    return new Response(JSON.stringify({ error: setErr.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  const settings: DigestSettings = {
    enabled: settingsRow?.enabled ?? true,
    recipients_to: settingsRow?.recipients_to ?? [],
    recipients_cc: settingsRow?.recipients_cc ?? [],
    windows_days: settingsRow?.windows_days ?? [3, 7, 15],
    whatsapp_enabled: settingsRow?.whatsapp_enabled ?? false,
    whatsapp_recipients: settingsRow?.whatsapp_recipients ?? [],
    sender_name: settingsRow?.sender_name ?? "GO-ADS Alerts",
    daily_digest_enabled: settingsRow?.daily_digest_enabled ?? true,
    per_campaign_enabled: settingsRow?.per_campaign_enabled ?? true,
    per_invoice_enabled: settingsRow?.per_invoice_enabled ?? true,
    campaign_end_window_days: settingsRow?.campaign_end_window_days ?? 7,
    invoice_buckets: settingsRow?.invoice_buckets ?? ["DUE_TODAY", "OVERDUE"],
  };

  if (!settings.enabled && !isTestMode) return new Response(JSON.stringify({ message: "Alerts disabled" }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  if (!settings.recipients_to?.length && !settings.whatsapp_recipients?.length) return new Response(JSON.stringify({ message: "No recipients configured" }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  // Build dynamic FROM address
  const alertFromEmail = Deno.env.get("ALERT_FROM_EMAIL") ?? "alerts@go-ads.in";
  const senderName = settings.sender_name || "GO-ADS Alerts";
  const ALERT_FROM = `${senderName} <${alertFromEmail}>`;

  const today = new Date().toISOString().slice(0, 10);
  const cc = settings.recipients_cc?.length ? settings.recipients_cc : undefined;
  const results: string[] = [];

  // ===== TEST MODE =====
  if (isTestMode) {
    console.log("Running in TEST mode – sending single test email...");
    const testHtml = wrapEmail("Test Alert Email", `Test sent on ${today}`, 
      renderKPIBar([
        { label: "Test Item 1", value: "42", color: BRAND.accent },
        { label: "Test Item 2", value: "7", color: BRAND.warning },
        { label: "Test Item 3", value: "3", color: BRAND.danger },
      ]) +
      renderSectionCard("Test Section", 1, "✅", BRAND.accent,
        `<p style="color:${BRAND.textDark};font-size:14px;">This is a test email from GO-ADS 360° Alert System. If you received this, your email alerts are configured correctly.</p>`)
    );

    try {
      await resend.emails.send({ from: ALERT_FROM, to: settings.recipients_to, cc, subject: `GO-ADS 360° | Test Alert – ${today}`, html: testHtml });
      results.push("Test email sent successfully");
    } catch (e: any) {
      console.error("Test email error:", e.message);
      return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    return new Response(JSON.stringify({ success: true, mode: "test", results }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  // ======= (A) DAILY DIGEST =======
  if (settings.daily_digest_enabled) {
  const digestLogged = await logOnce(supabase, today, "DAILY_DIGEST", "GLOBAL", "ALL");
  if (digestLogged) {
    console.log("Building daily digest...");

    const { data: vacant } = await supabase.from("v_assets_vacant_today").select("asset_id, area, location, direction, dimension, sqft, illumination, available_from").limit(10000);

    const windows = (settings.windows_days?.length ? settings.windows_days : [3, 7, 15]).slice().sort((a: number, b: number) => a - b);
    let endingTodayRows: any[] = [];
    const endingBuckets: { days: number; rows: any[] }[] = [];

    for (const d of windows) {
      const { data, error } = await supabase.rpc("fn_assets_ending_within", { days_ahead: d });
      if (error) { console.error(`fn_assets_ending_within(${d}):`, error.message); continue; }
      const all = data ?? [];
      if (!endingTodayRows.length) endingTodayRows = all.filter((r: any) => r.bucket === "ENDING_TODAY");
      endingBuckets.push({ days: d, rows: all.filter((r: any) => r.bucket !== "ENDING_TODAY") });
    }

    const { data: dues } = await supabase.from("v_invoice_dues").select("invoice_id, client_name, campaign_id, invoice_date, due_date, total_amount, paid_amount, outstanding, due_bucket").in("due_bucket", ["DUE_TODAY", "DUE_NEXT_7_DAYS", "OVERDUE"]).limit(10000);

    const dueToday = (dues ?? []).filter((r: any) => r.due_bucket === "DUE_TODAY");
    const dueNext7 = (dues ?? []).filter((r: any) => r.due_bucket === "DUE_NEXT_7_DAYS");
    const overdue = (dues ?? []).filter((r: any) => r.due_bucket === "OVERDUE");

    const vacantCols = [...DEFAULT_ASSET_COLS, { key: "available_from", label: "Available From" }];
    const endingCols = [...DEFAULT_ASSET_COLS, { key: "campaign_id", label: "Campaign ID" }, { key: "client_name", label: "Client" }, { key: "campaign_name", label: "Campaign" }, { key: "booking_end_date", label: "End Date" }];
    const invoiceCols = [
      { key: "invoice_id", label: "Invoice ID" }, { key: "client_name", label: "Client" }, { key: "campaign_id", label: "Campaign ID" },
      { key: "invoice_date", label: "Invoice Date" }, { key: "due_date", label: "Due Date" }, { key: "total_amount", label: "Total" },
      { key: "paid_amount", label: "Paid" }, { key: "outstanding", label: "Outstanding" }, { key: "due_bucket", label: "Status" },
    ];

    // KPI summary bar
    const vacantCount = vacant?.length ?? 0;
    const endingTodayCount = endingTodayRows.length;
    const overdueCount = overdue.length;
    const totalDuesCount = (dues ?? []).length;

    const kpiBar = renderKPIBar([
      { label: "Vacant Assets", value: String(vacantCount), color: BRAND.accent },
      { label: "Ending Today", value: String(endingTodayCount), color: BRAND.warning },
      { label: "Overdue Invoices", value: String(overdueCount), color: BRAND.danger },
      { label: "Total Dues", value: String(totalDuesCount), color: BRAND.primary },
    ]);

    // Build sections
    const vacantSection = renderSectionCard("Available Assets (Vacant Today)", vacantCount, "🟢", BRAND.accent,
      renderTable(vacant ?? [], vacantCols));

    const endingTodaySection = renderSectionCard("Assets Ending Today", endingTodayCount, "⚠️", BRAND.warning,
      renderTable(endingTodayRows, endingCols));

    const endingBucketSections = endingBuckets.map(b =>
      renderSectionCard(`Assets Ending in Next ${b.days} Days`, b.rows.length, "📅", BRAND.primaryLight,
        renderTable(b.rows, endingCols))
    ).join("");

    const divider = `<div style="border-top:2px solid ${BRAND.border};margin:32px 0;position:relative;">
      <span style="position:absolute;top:-12px;left:20px;background:${BRAND.cardBg};padding:0 12px;font-size:12px;font-weight:700;color:${BRAND.textMuted};text-transform:uppercase;letter-spacing:1px;">💰 Finance</span>
    </div>`;

    const dueTodaySection = renderSectionCard("Invoices Due Today", dueToday.length, "📋", BRAND.warning,
      renderTable(dueToday, invoiceCols));

    const dueNext7Section = renderSectionCard("Invoices Due in Next 7 Days", dueNext7.length, "📆", BRAND.primaryLight,
      renderTable(dueNext7, invoiceCols));

    const overdueSection = renderSectionCard("Overdue Invoices", overdueCount, "🔴", BRAND.danger,
      renderTable(overdue, invoiceCols));

    const digestInner = kpiBar + vacantSection + endingTodaySection + endingBucketSections + divider + dueTodaySection + dueNext7Section + overdueSection;
    const digestHtml = wrapEmail("Daily Availability + Dues Digest", `Report Date: ${today} · Generated automatically at 09:00 IST`, digestInner);

    // Send email digest
    if (settings.recipients_to?.length) {
      try {
        await resend.emails.send({ from: ALERT_FROM, to: settings.recipients_to, cc, subject: `GO-ADS 360° | Daily Digest – ${today}`, html: digestHtml });
        results.push("Daily digest email sent");
        console.log("Daily digest email sent successfully");
      } catch (e: any) {
        console.error("Digest email send error:", e.message);
        results.push(`Digest email error: ${e.message}`);
      }
    }

    // Send WhatsApp digest
    if (settings.whatsapp_enabled && settings.whatsapp_recipients?.length) {
      const waMessage = formatWhatsAppDigest(vacant ?? [], endingTodayRows, endingBuckets, dueToday, dueNext7, overdue, today);
      for (const phone of settings.whatsapp_recipients) {
        try {
          await sendWhatsAppMessage(phone, waMessage);
          results.push(`WhatsApp digest sent to ${phone}`);
          console.log(`WhatsApp digest sent to ${phone}`);
        } catch (e: any) {
          console.error(`WhatsApp send error (${phone}):`, e.message);
          results.push(`WhatsApp error (${phone}): ${e.message}`);
        }
      }
    }
  } else {
    results.push("Daily digest already sent today");
  }
  } else {
    results.push("Daily digest disabled");
  }

  // ======= (B) PER-CAMPAIGN ENDING ALERTS =======
  if (settings.per_campaign_enabled) {
  const { data: endingCampaigns, error: cErr } = await supabase.rpc("fn_campaigns_ending_within", { days_ahead: settings.campaign_end_window_days || 7 });
  if (cErr) { console.error("fn_campaigns_ending_within:", cErr.message); }

  for (const c of (endingCampaigns ?? [])) {
    const logged = await logOnce(supabase, today, "CAMPAIGN_ENDING", "campaign", c.campaign_id);
    if (!logged) continue;

    const { data: assets } = await supabase.rpc("fn_assets_for_campaign", { p_campaign_id: c.campaign_id });
    const assetCols = [...DEFAULT_ASSET_COLS, { key: "booking_start_date", label: "Start" }, { key: "booking_end_date", label: "End" }];

    const banner = renderInfoBanner([
      { label: "Campaign", value: c.campaign_name },
      { label: "Client", value: c.client_name },
      { label: "End Date", value: c.end_date },
      { label: "Total Assets", value: String(c.total_assets) },
    ], BRAND.warningBg, BRAND.warningBorder);

    const inner = banner + renderSectionCard("Assets in this Campaign", (assets ?? []).length, "📍", BRAND.primary,
      renderTable(assets ?? [], assetCols));

    const html = wrapEmail(`Campaign Ending Soon – ${c.campaign_id}`, `Ends: ${c.end_date} · Client: ${c.client_name}`, inner);

    try {
      await resend.emails.send({ from: ALERT_FROM, to: settings.recipients_to, cc, subject: `GO-ADS 360° | Campaign Ending – ${c.campaign_id} (${c.end_date})`, html });
      results.push(`Campaign alert: ${c.campaign_id}`);
    } catch (e: any) { console.error(`Campaign ${c.campaign_id} send error:`, e.message); }
  }
  } else {
    results.push("Per-campaign alerts disabled");
  }

  // ======= (C) PER-INVOICE DUE/OVERDUE ALERTS =======
  if (settings.per_invoice_enabled) {
  const invoiceBuckets = settings.invoice_buckets?.length ? settings.invoice_buckets : ["DUE_TODAY", "OVERDUE"];
  const { data: invoiceAlerts, error: iErr } = await supabase.from("v_invoice_dues").select("invoice_id, client_name, campaign_id, invoice_date, due_date, total_amount, paid_amount, outstanding, due_bucket").in("due_bucket", invoiceBuckets).limit(10000);
  if (iErr) { console.error("v_invoice_dues:", iErr.message); }

  for (const inv of (invoiceAlerts ?? [])) {
    const logged = await logOnce(supabase, today, "INVOICE_ALERT", "invoice", inv.invoice_id);
    if (!logged) continue;

    const { data: assets } = await supabase.rpc("fn_assets_for_invoice", { p_invoice_id: inv.invoice_id });
    const assetCols = [...DEFAULT_ASSET_COLS, { key: "booking_start_date", label: "Start" }, { key: "booking_end_date", label: "End" }];
    const statusLabel = inv.due_bucket === "OVERDUE" ? "OVERDUE" : "DUE TODAY";
    const bgColor = inv.due_bucket === "OVERDUE" ? BRAND.dangerBg : BRAND.warningBg;
    const borderColor = inv.due_bucket === "OVERDUE" ? BRAND.dangerBorder : BRAND.warningBorder;

    const banner = renderInfoBanner([
      { label: "Invoice", value: inv.invoice_id },
      { label: "Client", value: inv.client_name },
      { label: "Campaign", value: inv.campaign_id },
      { label: "Due Date", value: inv.due_date },
      { label: "Total", value: `₹${inv.total_amount}` },
      { label: "Paid", value: `₹${inv.paid_amount}` },
      { label: "Outstanding", value: `₹${inv.outstanding}` },
      { label: "Status", value: statusLabel },
    ], bgColor, borderColor);

    const inner = banner + renderSectionCard("Campaign Assets (Context)", (assets ?? []).length, "📍", BRAND.primary,
      renderTable(assets ?? [], assetCols));

    const html = wrapEmail(`Invoice ${statusLabel} – ${inv.invoice_id}`, `Client: ${inv.client_name} · Outstanding: ₹${inv.outstanding}`, inner);

    try {
      await resend.emails.send({ from: ALERT_FROM, to: settings.recipients_to, cc, subject: `GO-ADS 360° | Invoice ${statusLabel} – ${inv.invoice_id} | ₹${inv.outstanding}`, html });
      results.push(`Invoice alert: ${inv.invoice_id}`);
    } catch (e: any) { console.error(`Invoice ${inv.invoice_id} send error:`, e.message); }
  }
  } else {
    results.push("Per-invoice alerts disabled");
  }

  console.log("Daily alerts completed:", results);
  return new Response(JSON.stringify({ success: true, results }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
});

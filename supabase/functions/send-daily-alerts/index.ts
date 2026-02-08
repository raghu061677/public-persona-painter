import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@4";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-application-name',
};

type DigestSettings = {
  enabled: boolean;
  recipients_to: string[];
  recipients_cc: string[];
  windows_days: number[];
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

function esc(s: unknown): string {
  const str = String(s ?? "—");
  return str.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#39;");
}

function renderTable(title: string, rows: any[], cols: { key: string; label: string }[]): string {
  if (!rows?.length) {
    return `<h3 style="color:#1e40af;margin:24px 0 8px;">${esc(title)}</h3><p style="color:#64748b;">No records.</p>`;
  }
  const thead = cols.map(c => `<th style="padding:8px 12px;background:#f1f5f9;border:1px solid #e2e8f0;text-align:left;font-size:12px;white-space:nowrap;">${esc(c.label)}</th>`).join("");
  const tbody = rows.map((r, i) => {
    const bg = i % 2 === 0 ? "#ffffff" : "#f8fafc";
    const tds = cols.map(c => `<td style="padding:6px 12px;border:1px solid #e2e8f0;font-size:12px;background:${bg};">${esc(r[c.key])}</td>`).join("");
    return `<tr>${tds}</tr>`;
  }).join("");
  return `<h3 style="color:#1e40af;margin:24px 0 8px;">${esc(title)} (${rows.length})</h3><div style="overflow-x:auto;"><table style="border-collapse:collapse;min-width:900px;width:100%;"><tr>${thead}</tr>${tbody}</table></div>`;
}

function wrapEmail(title: string, subtitle: string, inner: string): string {
  return `<!DOCTYPE html><html><body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#f8fafc;">
<div style="max-width:1200px;margin:0 auto;padding:20px;">
<div style="background:#1e40af;color:white;padding:24px;border-radius:12px 12px 0 0;">
<h1 style="margin:0;font-size:22px;">${esc(title)}</h1>
<p style="margin:8px 0 0;opacity:0.85;font-size:14px;">${esc(subtitle)}</p>
</div>
<div style="background:white;padding:24px;border:1px solid #e2e8f0;border-top:none;">
${inner}
</div>
<div style="padding:16px;text-align:center;color:#94a3b8;font-size:11px;">
Automated GO-ADS daily digest. Configure recipients in Settings.
</div>
</div></body></html>`;
}

async function logOnce(supabase: any, today: string, alertType: string, entityType: string, entityId: string): Promise<boolean> {
  const { error } = await supabase.from("alert_log").insert({ alert_date: today, alert_type: alertType, entity_type: entityType, entity_id: entityId });
  return !error;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
  const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
  const ALERT_FROM = Deno.env.get("ALERT_FROM_EMAIL") ?? "Go-Ads 360 <alerts@go-ads.in>";

  if (!SUPABASE_URL || !SERVICE_KEY || !RESEND_API_KEY) {
    console.error("Missing env vars");
    return new Response(JSON.stringify({ error: "Missing env: SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY / RESEND_API_KEY" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  const supabase = createClient(SUPABASE_URL, SERVICE_KEY);
  const resend = new Resend(RESEND_API_KEY);

  // Load settings
  const { data: settingsRow, error: setErr } = await supabase.from("daily_digest_settings").select("enabled, recipients_to, recipients_cc, windows_days").limit(1).maybeSingle();
  if (setErr) {
    console.error("Settings error:", setErr.message);
    return new Response(JSON.stringify({ error: setErr.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  const settings: DigestSettings = settingsRow ?? { enabled: true, recipients_to: [], recipients_cc: [], windows_days: [3, 7, 15] };
  if (!settings.enabled) return new Response(JSON.stringify({ message: "Alerts disabled" }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  if (!settings.recipients_to?.length) return new Response(JSON.stringify({ message: "No recipients configured" }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  const today = new Date().toISOString().slice(0, 10);
  const cc = settings.recipients_cc?.length ? settings.recipients_cc : undefined;
  const results: string[] = [];

  // ======= (A) DAILY DIGEST =======
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

    const digestInner =
      renderTable("Available Assets (Vacant Today)", vacant ?? [], vacantCols) +
      renderTable("Assets Ending Today", endingTodayRows, endingCols) +
      endingBuckets.map(b => renderTable(`Assets Ending in Next ${b.days} Days`, b.rows, endingCols)).join("") +
      `<hr style="border:none;border-top:2px solid #e2e8f0;margin:32px 0;">` +
      renderTable("Invoices Due Today", dueToday, invoiceCols) +
      renderTable("Invoices Due in Next 7 Days", dueNext7, invoiceCols) +
      renderTable("Overdue Invoices", overdue, invoiceCols);

    const digestHtml = wrapEmail("GO-ADS | Daily Availability + Dues Digest", `Date: ${today}`, digestInner);

    try {
      await resend.emails.send({ from: ALERT_FROM, to: settings.recipients_to, cc, subject: `GO-ADS | Daily Digest – ${today}`, html: digestHtml });
      results.push("Daily digest sent");
      console.log("Daily digest sent successfully");
    } catch (e: any) {
      console.error("Digest send error:", e.message);
      results.push(`Digest error: ${e.message}`);
    }
  } else {
    results.push("Daily digest already sent today");
  }

  // ======= (B) PER-CAMPAIGN ENDING ALERTS =======
  const { data: endingCampaigns, error: cErr } = await supabase.rpc("fn_campaigns_ending_within", { days_ahead: 7 });
  if (cErr) { console.error("fn_campaigns_ending_within:", cErr.message); }

  for (const c of (endingCampaigns ?? [])) {
    const logged = await logOnce(supabase, today, "CAMPAIGN_ENDING", "campaign", c.campaign_id);
    if (!logged) continue;

    const { data: assets } = await supabase.rpc("fn_assets_for_campaign", { p_campaign_id: c.campaign_id });
    const assetCols = [...DEFAULT_ASSET_COLS, { key: "booking_start_date", label: "Start" }, { key: "booking_end_date", label: "End" }];

    const inner = `<div style="background:#fef3c7;padding:16px;border-radius:8px;margin-bottom:16px;">
<p><strong>Campaign:</strong> ${esc(c.campaign_name)}</p>
<p><strong>Client:</strong> ${esc(c.client_name)}</p>
<p><strong>End Date:</strong> ${esc(c.end_date)}</p>
<p><strong>Total Assets:</strong> ${esc(c.total_assets)}</p>
</div>` + renderTable("Assets in this Campaign", assets ?? [], assetCols);

    const html = wrapEmail(`GO-ADS | Campaign Ending Soon – ${c.campaign_id}`, `Ends: ${c.end_date} | Client: ${c.client_name}`, inner);

    try {
      await resend.emails.send({ from: ALERT_FROM, to: settings.recipients_to, cc, subject: `GO-ADS | Campaign Ending – ${c.campaign_id} (${c.end_date})`, html });
      results.push(`Campaign alert: ${c.campaign_id}`);
    } catch (e: any) { console.error(`Campaign ${c.campaign_id} send error:`, e.message); }
  }

  // ======= (C) PER-INVOICE DUE/OVERDUE ALERTS =======
  const { data: invoiceAlerts, error: iErr } = await supabase.from("v_invoice_dues").select("invoice_id, client_name, campaign_id, invoice_date, due_date, total_amount, paid_amount, outstanding, due_bucket").in("due_bucket", ["DUE_TODAY", "OVERDUE"]).limit(10000);
  if (iErr) { console.error("v_invoice_dues:", iErr.message); }

  for (const inv of (invoiceAlerts ?? [])) {
    const logged = await logOnce(supabase, today, "INVOICE_ALERT", "invoice", inv.invoice_id);
    if (!logged) continue;

    const { data: assets } = await supabase.rpc("fn_assets_for_invoice", { p_invoice_id: inv.invoice_id });
    const assetCols = [...DEFAULT_ASSET_COLS, { key: "booking_start_date", label: "Start" }, { key: "booking_end_date", label: "End" }];
    const statusLabel = inv.due_bucket === "OVERDUE" ? "OVERDUE" : "DUE TODAY";
    const bgColor = inv.due_bucket === "OVERDUE" ? "#fef2f2" : "#fef3c7";

    const inner = `<div style="background:${bgColor};padding:16px;border-radius:8px;margin-bottom:16px;">
<p><strong>Invoice:</strong> ${esc(inv.invoice_id)}</p>
<p><strong>Client:</strong> ${esc(inv.client_name)}</p>
<p><strong>Campaign:</strong> ${esc(inv.campaign_id)}</p>
<p><strong>Due Date:</strong> ${esc(inv.due_date)}</p>
<p><strong>Total:</strong> ₹${esc(inv.total_amount)} | <strong>Paid:</strong> ₹${esc(inv.paid_amount)} | <strong>Outstanding:</strong> ₹${esc(inv.outstanding)}</p>
<p><strong>Status:</strong> <span style="color:${inv.due_bucket === 'OVERDUE' ? '#dc2626' : '#d97706'};font-weight:bold;">${esc(statusLabel)}</span></p>
</div>` + renderTable("Campaign Assets (Context)", assets ?? [], assetCols);

    const html = wrapEmail(`GO-ADS | Invoice ${statusLabel} – ${inv.invoice_id}`, `Client: ${inv.client_name} | Outstanding: ₹${inv.outstanding}`, inner);

    try {
      await resend.emails.send({ from: ALERT_FROM, to: settings.recipients_to, cc, subject: `GO-ADS | Invoice ${statusLabel} – ${inv.invoice_id} | ₹${inv.outstanding}`, html });
      results.push(`Invoice alert: ${inv.invoice_id}`);
    } catch (e: any) { console.error(`Invoice ${inv.invoice_id} send error:`, e.message); }
  }

  console.log("Daily alerts completed:", results);
  return new Response(JSON.stringify({ success: true, results }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
});

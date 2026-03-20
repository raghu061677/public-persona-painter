import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// ── Canonical status sets (mirror of frontend validation) ──
const CAMPAIGN_STATUSES = ["Draft","Upcoming","Running","Completed","Cancelled","Archived"];
const INVOICE_STATUSES = ["Draft","Sent","Paid","Overdue","Cancelled","Partially Paid"];
const MEDIA_ASSET_STATUSES = ["Available","Booked","Blocked","Under Maintenance","Expired"];
const PAYMENT_CONFIRMATION_STATUSES = ["Pending","Approved","Rejected"];

interface Issue {
  issue_type: string;
  table_name: string;
  field_name: string;
  record_id: string;
  raw_value: string | null;
  detail: string;
  company_id: string | null;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, serviceKey);

  const runId = crypto.randomUUID();
  const issues: Issue[] = [];
  const tablesScanned: string[] = [];

  try {
    // Record run start
    await supabase.from("data_quality_runs").insert({
      id: runId,
      status: "running",
      started_at: new Date().toISOString(),
    });

    // ── 1. Campaigns: negative money, invalid status, inverted dates, missing company_id ──
    tablesScanned.push("campaigns");
    const { data: campaigns } = await supabase
      .from("campaigns")
      .select("id, status, start_date, end_date, total_amount, gst_amount, grand_total, company_id")
      .is("is_deleted", null)
      .limit(5000);

    for (const c of campaigns || []) {
      if (!c.company_id) {
        issues.push({ issue_type: "missing_company_id", table_name: "campaigns", field_name: "company_id", record_id: c.id, raw_value: null, detail: "Row has null/empty company_id", company_id: null });
      }
      if (c.status && !CAMPAIGN_STATUSES.includes(c.status)) {
        issues.push({ issue_type: "invalid_status", table_name: "campaigns", field_name: "status", record_id: c.id, raw_value: c.status, detail: `"${c.status}" not in canonical set`, company_id: c.company_id });
      }
      if (c.start_date && c.end_date && c.end_date < c.start_date) {
        issues.push({ issue_type: "inverted_date_range", table_name: "campaigns", field_name: "start_date/end_date", record_id: c.id, raw_value: `${c.start_date}..${c.end_date}`, detail: `${c.start_date} > ${c.end_date}`, company_id: c.company_id });
      }
      for (const fld of ["total_amount", "gst_amount", "grand_total"] as const) {
        if (c[fld] != null && Number(c[fld]) < 0) {
          issues.push({ issue_type: "negative_money", table_name: "campaigns", field_name: fld, record_id: c.id, raw_value: String(c[fld]), detail: `Negative value ${c[fld]}`, company_id: c.company_id });
        }
      }
    }

    // ── 2. Campaign Assets: negative money, inverted dates, booking outside campaign ──
    tablesScanned.push("campaign_assets");
    const { data: cAssets } = await supabase
      .from("campaign_assets")
      .select("id, campaign_id, card_rate, negotiated_rate, total_price, printing_cost, mounting_cost, start_date, end_date, booking_start_date, booking_end_date, status")
      .eq("is_removed", false)
      .limit(5000);

    for (const ca of cAssets || []) {
      for (const fld of ["card_rate", "negotiated_rate", "total_price", "printing_cost", "mounting_cost"] as const) {
        if (ca[fld] != null && Number(ca[fld]) < 0) {
          issues.push({ issue_type: "negative_money", table_name: "campaign_assets", field_name: fld, record_id: ca.id, raw_value: String(ca[fld]), detail: `Negative value ${ca[fld]}`, company_id: null });
        }
      }
      if (ca.start_date && ca.end_date && ca.end_date < ca.start_date) {
        issues.push({ issue_type: "inverted_date_range", table_name: "campaign_assets", field_name: "start_date/end_date", record_id: ca.id, raw_value: null, detail: `${ca.start_date} > ${ca.end_date}`, company_id: null });
      }
      if (ca.booking_start_date && ca.booking_end_date && ca.booking_end_date < ca.booking_start_date) {
        issues.push({ issue_type: "inverted_date_range", table_name: "campaign_assets", field_name: "booking_start_date/booking_end_date", record_id: ca.id, raw_value: null, detail: `${ca.booking_start_date} > ${ca.booking_end_date}`, company_id: null });
      }
    }

    // ── 3. Invoices: negative money, invalid status, inverted dates ──
    tablesScanned.push("invoices");
    const { data: invoices } = await supabase
      .from("invoices")
      .select("id, status, invoice_date, due_date, sub_total, total_amount, company_id, client_id")
      .limit(5000);

    for (const inv of invoices || []) {
      if (!inv.company_id) {
        issues.push({ issue_type: "missing_company_id", table_name: "invoices", field_name: "company_id", record_id: inv.id, raw_value: null, detail: "Row has null/empty company_id", company_id: null });
      }
      if (inv.status && !INVOICE_STATUSES.includes(inv.status)) {
        issues.push({ issue_type: "invalid_status", table_name: "invoices", field_name: "status", record_id: inv.id, raw_value: inv.status, detail: `"${inv.status}" not in canonical set`, company_id: inv.company_id });
      }
      if (inv.invoice_date && inv.due_date && inv.due_date < inv.invoice_date) {
        issues.push({ issue_type: "inverted_date_range", table_name: "invoices", field_name: "invoice_date/due_date", record_id: inv.id, raw_value: null, detail: `due_date ${inv.due_date} < invoice_date ${inv.invoice_date}`, company_id: inv.company_id });
      }
      for (const fld of ["sub_total", "total_amount"] as const) {
        if (inv[fld] != null && Number(inv[fld]) < 0) {
          issues.push({ issue_type: "negative_money", table_name: "invoices", field_name: fld, record_id: inv.id, raw_value: String(inv[fld]), detail: `Negative value ${inv[fld]}`, company_id: inv.company_id });
        }
      }
    }

    // ── 4. Media Assets: negative money, invalid status, missing company_id ──
    tablesScanned.push("media_assets");
    const { data: assets } = await supabase
      .from("media_assets")
      .select("id, status, card_rate, company_id")
      .limit(5000);

    for (const a of assets || []) {
      if (!a.company_id) {
        issues.push({ issue_type: "missing_company_id", table_name: "media_assets", field_name: "company_id", record_id: a.id, raw_value: null, detail: "Row has null/empty company_id", company_id: null });
      }
      if (a.status && !MEDIA_ASSET_STATUSES.includes(a.status)) {
        issues.push({ issue_type: "invalid_status", table_name: "media_assets", field_name: "status", record_id: a.id, raw_value: a.status, detail: `"${a.status}" not in canonical set`, company_id: a.company_id });
      }
      if (a.card_rate != null && Number(a.card_rate) < 0) {
        issues.push({ issue_type: "negative_money", table_name: "media_assets", field_name: "card_rate", record_id: a.id, raw_value: String(a.card_rate), detail: `Negative card_rate ${a.card_rate}`, company_id: a.company_id });
      }
    }

    // ── 5. Payment Confirmations: negative money, invalid status ──
    tablesScanned.push("payment_confirmations");
    const { data: payments } = await supabase
      .from("payment_confirmations")
      .select("id, status, claimed_amount, company_id")
      .limit(5000);

    for (const p of payments || []) {
      if (p.status && !PAYMENT_CONFIRMATION_STATUSES.includes(p.status)) {
        issues.push({ issue_type: "invalid_status", table_name: "payment_confirmations", field_name: "status", record_id: p.id, raw_value: p.status, detail: `"${p.status}" not in canonical set`, company_id: p.company_id });
      }
      if (p.claimed_amount != null && Number(p.claimed_amount) < 0) {
        issues.push({ issue_type: "negative_money", table_name: "payment_confirmations", field_name: "claimed_amount", record_id: p.id, raw_value: String(p.claimed_amount), detail: `Negative claimed_amount ${p.claimed_amount}`, company_id: p.company_id });
      }
    }

    // ── 6. Clients: missing company_id, missing identifier ──
    tablesScanned.push("clients");
    const { data: clients } = await supabase
      .from("clients")
      .select("id, company_id, name")
      .limit(5000);

    for (const cl of clients || []) {
      if (!cl.company_id) {
        issues.push({ issue_type: "missing_company_id", table_name: "clients", field_name: "company_id", record_id: cl.id, raw_value: null, detail: "Row has null/empty company_id", company_id: null });
      }
      if (!cl.name || cl.name.trim() === "") {
        issues.push({ issue_type: "missing_identifier", table_name: "clients", field_name: "name", record_id: cl.id, raw_value: null, detail: 'Required field "name" is null/empty', company_id: cl.company_id });
      }
    }

    // ── Upsert all issues ──
    const now = new Date().toISOString();
    let issuesNew = 0;

    for (const issue of issues) {
      const coalesceCompany = issue.company_id || "00000000-0000-0000-0000-000000000000";

      // Check if exists
      const { data: existing } = await supabase
        .from("data_quality_issues")
        .select("id, occurrences")
        .eq("issue_type", issue.issue_type)
        .eq("table_name", issue.table_name)
        .eq("field_name", issue.field_name)
        .eq("record_id", issue.record_id)
        .maybeSingle();

      if (existing) {
        await supabase
          .from("data_quality_issues")
          .update({
            last_seen: now,
            occurrences: (existing.occurrences || 0) + 1,
            detail: issue.detail,
            raw_value: issue.raw_value,
            context: "nightly-audit",
            is_resolved: false,
            resolved_at: null,
          })
          .eq("id", existing.id);
      } else {
        await supabase.from("data_quality_issues").insert({
          issue_type: issue.issue_type,
          table_name: issue.table_name,
          field_name: issue.field_name,
          record_id: issue.record_id,
          raw_value: issue.raw_value,
          detail: issue.detail,
          context: "nightly-audit",
          company_id: issue.company_id,
          first_seen: now,
          last_seen: now,
          occurrences: 1,
        });
        issuesNew++;
      }
    }

    // Mark issues not seen in this run as resolved
    const { count: resolvedCount } = await supabase
      .from("data_quality_issues")
      .update({ is_resolved: true, resolved_at: now })
      .lt("last_seen", now)
      .eq("is_resolved", false)
      .select("id", { count: "exact", head: true });

    // Update run record
    await supabase.from("data_quality_runs").update({
      completed_at: new Date().toISOString(),
      status: "completed",
      issues_found: issues.length,
      issues_new: issuesNew,
      issues_resolved: resolvedCount || 0,
      tables_scanned: tablesScanned,
    }).eq("id", runId);

    return new Response(
      JSON.stringify({
        success: true,
        run_id: runId,
        issues_found: issues.length,
        issues_new: issuesNew,
        issues_resolved: resolvedCount || 0,
        tables_scanned: tablesScanned,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Nightly audit error:", error);

    await supabase.from("data_quality_runs").update({
      completed_at: new Date().toISOString(),
      status: "failed",
      error_message: error.message?.substring(0, 500),
    }).eq("id", runId);

    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

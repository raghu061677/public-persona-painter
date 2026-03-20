import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// ── Canonical status sets ──
const CAMPAIGN_STATUSES = ["Draft","Upcoming","Running","Completed","Cancelled","Archived"];
const INVOICE_STATUSES = ["Draft","Sent","Paid","Overdue","Cancelled","Partially Paid"];
const MEDIA_ASSET_STATUSES = ["Available","Booked","Blocked","Under Maintenance","Expired"];
const PAYMENT_CONFIRMATION_STATUSES = ["Pending","Approved","Rejected"];

// ── Severity mapping ──
const SEVERITY_MAP: Record<string, string> = {
  missing_company_id: "critical",
  orphan_reference: "high",
  negative_money: "high",
  inverted_date_range: "high",
  invalid_status: "medium",
  booking_outside_campaign: "medium",
  missing_identifier: "low",
};

interface Issue {
  issue_type: string;
  table_name: string;
  field_name: string;
  record_id: string;
  raw_value: string | null;
  detail: string;
  company_id: string | null;
  severity: string;
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

  function addIssue(type: string, table: string, field: string, recordId: string, rawValue: string | null, detail: string, companyId: string | null) {
    issues.push({ issue_type: type, table_name: table, field_name: field, record_id: recordId, raw_value: rawValue, detail, company_id: companyId, severity: SEVERITY_MAP[type] || "medium" });
  }

  try {
    await supabase.from("data_quality_runs").insert({
      id: runId, status: "running", started_at: new Date().toISOString(),
    });

    // ── 1. Campaigns ──
    tablesScanned.push("campaigns");
    const { data: campaigns } = await supabase
      .from("campaigns")
      .select("id, status, start_date, end_date, total_amount, gst_amount, grand_total, company_id")
      .is("is_deleted", null)
      .limit(5000);

    for (const c of campaigns || []) {
      if (!c.company_id) addIssue("missing_company_id", "campaigns", "company_id", c.id, null, "Row has null/empty company_id", null);
      if (c.status && !CAMPAIGN_STATUSES.includes(c.status)) addIssue("invalid_status", "campaigns", "status", c.id, c.status, `"${c.status}" not in canonical set`, c.company_id);
      if (c.start_date && c.end_date && c.end_date < c.start_date) addIssue("inverted_date_range", "campaigns", "start_date/end_date", c.id, `${c.start_date}..${c.end_date}`, `${c.start_date} > ${c.end_date}`, c.company_id);
      for (const fld of ["total_amount", "gst_amount", "grand_total"] as const) {
        if (c[fld] != null && Number(c[fld]) < 0) addIssue("negative_money", "campaigns", fld, c.id, String(c[fld]), `Negative value ${c[fld]}`, c.company_id);
      }
    }

    // ── 2. Campaign Assets ──
    tablesScanned.push("campaign_assets");
    const { data: cAssets } = await supabase
      .from("campaign_assets")
      .select("id, campaign_id, card_rate, negotiated_rate, total_price, printing_cost, mounting_cost, start_date, end_date, booking_start_date, booking_end_date, status")
      .eq("is_removed", false)
      .limit(5000);

    for (const ca of cAssets || []) {
      for (const fld of ["card_rate", "negotiated_rate", "total_price", "printing_cost", "mounting_cost"] as const) {
        if (ca[fld] != null && Number(ca[fld]) < 0) addIssue("negative_money", "campaign_assets", fld, ca.id, String(ca[fld]), `Negative value ${ca[fld]}`, null);
      }
      if (ca.start_date && ca.end_date && ca.end_date < ca.start_date) addIssue("inverted_date_range", "campaign_assets", "start_date/end_date", ca.id, null, `${ca.start_date} > ${ca.end_date}`, null);
      if (ca.booking_start_date && ca.booking_end_date && ca.booking_end_date < ca.booking_start_date) addIssue("inverted_date_range", "campaign_assets", "booking_start_date/booking_end_date", ca.id, null, `${ca.booking_start_date} > ${ca.booking_end_date}`, null);
    }

    // ── 3. Invoices ──
    tablesScanned.push("invoices");
    const { data: invoices } = await supabase
      .from("invoices")
      .select("id, status, invoice_date, due_date, sub_total, total_amount, company_id, client_id")
      .limit(5000);

    for (const inv of invoices || []) {
      if (!inv.company_id) addIssue("missing_company_id", "invoices", "company_id", inv.id, null, "Row has null/empty company_id", null);
      if (inv.status && !INVOICE_STATUSES.includes(inv.status)) addIssue("invalid_status", "invoices", "status", inv.id, inv.status, `"${inv.status}" not in canonical set`, inv.company_id);
      if (inv.invoice_date && inv.due_date && inv.due_date < inv.invoice_date) addIssue("inverted_date_range", "invoices", "invoice_date/due_date", inv.id, null, `due_date ${inv.due_date} < invoice_date ${inv.invoice_date}`, inv.company_id);
      for (const fld of ["sub_total", "total_amount"] as const) {
        if (inv[fld] != null && Number(inv[fld]) < 0) addIssue("negative_money", "invoices", fld, inv.id, String(inv[fld]), `Negative value ${inv[fld]}`, inv.company_id);
      }
    }

    // ── 4. Media Assets ──
    tablesScanned.push("media_assets");
    const { data: assets } = await supabase.from("media_assets").select("id, status, card_rate, company_id").limit(5000);

    for (const a of assets || []) {
      if (!a.company_id) addIssue("missing_company_id", "media_assets", "company_id", a.id, null, "Row has null/empty company_id", null);
      if (a.status && !MEDIA_ASSET_STATUSES.includes(a.status)) addIssue("invalid_status", "media_assets", "status", a.id, a.status, `"${a.status}" not in canonical set`, a.company_id);
      if (a.card_rate != null && Number(a.card_rate) < 0) addIssue("negative_money", "media_assets", "card_rate", a.id, String(a.card_rate), `Negative card_rate ${a.card_rate}`, a.company_id);
    }

    // ── 5. Payment Confirmations ──
    tablesScanned.push("payment_confirmations");
    const { data: payments } = await supabase.from("payment_confirmations").select("id, status, claimed_amount, company_id").limit(5000);

    for (const p of payments || []) {
      if (p.status && !PAYMENT_CONFIRMATION_STATUSES.includes(p.status)) addIssue("invalid_status", "payment_confirmations", "status", p.id, p.status, `"${p.status}" not in canonical set`, p.company_id);
      if (p.claimed_amount != null && Number(p.claimed_amount) < 0) addIssue("negative_money", "payment_confirmations", "claimed_amount", p.id, String(p.claimed_amount), `Negative claimed_amount ${p.claimed_amount}`, p.company_id);
    }

    // ── 6. Clients ──
    tablesScanned.push("clients");
    const { data: clients } = await supabase.from("clients").select("id, company_id, name").limit(5000);

    for (const cl of clients || []) {
      if (!cl.company_id) addIssue("missing_company_id", "clients", "company_id", cl.id, null, "Row has null/empty company_id", null);
      if (!cl.name || cl.name.trim() === "") addIssue("missing_identifier", "clients", "name", cl.id, null, 'Required field "name" is null/empty', cl.company_id);
    }

    // ── Upsert all issues ──
    const now = new Date().toISOString();
    let issuesNew = 0;

    for (const issue of issues) {
      const { data: existing } = await supabase
        .from("data_quality_issues")
        .select("id, occurrences, workflow_status")
        .eq("issue_type", issue.issue_type)
        .eq("table_name", issue.table_name)
        .eq("field_name", issue.field_name)
        .eq("record_id", issue.record_id)
        .maybeSingle();

      if (existing) {
        // Don't reopen issues that were explicitly ignored
        const updates: Record<string, any> = {
          last_seen: now,
          occurrences: (existing.occurrences || 0) + 1,
          detail: issue.detail,
          raw_value: issue.raw_value,
          context: "nightly-audit",
          severity: issue.severity,
        };
        if (existing.workflow_status !== "ignored") {
          updates.is_resolved = false;
          updates.resolved_at = null;
          updates.workflow_status = "open";
        }
        await supabase.from("data_quality_issues").update(updates).eq("id", existing.id);
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
          severity: issue.severity,
          workflow_status: "open",
        });
        issuesNew++;
      }
    }

    // Mark issues not seen in this run as resolved (except ignored)
    const { count: resolvedCount } = await supabase
      .from("data_quality_issues")
      .update({ is_resolved: true, resolved_at: now, workflow_status: "resolved" })
      .lt("last_seen", now)
      .eq("is_resolved", false)
      .neq("workflow_status", "ignored")
      .select("id", { count: "exact", head: true });

    // ── Alert check ──
    const severityCounts: Record<string, number> = {};
    for (const i of issues) {
      severityCounts[i.severity] = (severityCounts[i.severity] || 0) + 1;
    }

    const { data: thresholds } = await supabase
      .from("data_quality_alert_thresholds")
      .select("*")
      .eq("is_active", true);

    const alerts: string[] = [];
    for (const t of thresholds || []) {
      const count = severityCounts[t.severity] || 0;
      if (count >= t.threshold_count) {
        alerts.push(`${t.severity.toUpperCase()}: ${count} issues (threshold: ${t.threshold_count})`);
      }
    }

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
        severity_counts: severityCounts,
        alerts,
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

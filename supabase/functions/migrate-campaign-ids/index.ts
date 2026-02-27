/**
 * migrate-campaign-ids — One-time migration helper
 * Finds campaigns with non-canonical IDs (e.g. CAM-2026-February-002)
 * and converts them to CAM-YYYYMM-#### format.
 * 
 * Modes:
 *   POST { mode: "preview" } — returns list of campaigns that would be migrated
 *   POST { mode: "execute" } — performs the migration
 * 
 * Only platform_admin or company admin can run this.
 */
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { withAuth, getAuthContext, requireRole, logSecurityAudit } from '../_shared/auth.ts';
import { corsHeaders } from '../_shared/cors.ts';
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const CANONICAL_REGEX = /^CAM-\d{6}-\d{4}$/;

const MONTH_MAP: Record<string, string> = {
  january: '01', february: '02', march: '03', april: '04',
  may: '05', june: '06', july: '07', august: '08',
  september: '09', october: '10', november: '11', december: '12',
  jan: '01', feb: '02', mar: '03', apr: '04',
  jun: '06', jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12',
};

/**
 * Parse a non-canonical campaign ID to extract year+month.
 * Handles formats like:
 *   CAM-2026-February-002
 *   CAM-2026-Feb-003
 */
function parseOldFormat(id: string): { year: string; month: string; seq: string } | null {
  // Try: CAM-YYYY-MonthName-NNN
  const match = id.match(/^CAM-(\d{4})-([A-Za-z]+)-(\d+)$/);
  if (match) {
    const monthKey = match[2].toLowerCase();
    const monthNum = MONTH_MAP[monthKey];
    if (monthNum) {
      return { year: match[1], month: monthNum, seq: match[3] };
    }
  }
  return null;
}

function jsonError(message: string, status = 400): Response {
  return new Response(
    JSON.stringify({ success: false, error: message }),
    { status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}

function jsonSuccess(data: any): Response {
  return new Response(
    JSON.stringify(data),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}

serve(withAuth(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }
  if (req.method !== "POST") return jsonError("Only POST is allowed", 405);

  const ctx = await getAuthContext(req);
  requireRole(ctx, ['admin']);

  const body = await req.json().catch(() => null) as { mode?: string } | null;
  const mode = body?.mode || 'preview';

  // Use service role client for cross-table updates
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, serviceKey);

  // Fetch all campaigns
  const { data: allCampaigns, error: fetchErr } = await supabase
    .from('campaigns')
    .select('id, campaign_code, campaign_name, client_name, created_at, start_date')
    .order('created_at', { ascending: true });

  if (fetchErr) return jsonError(`Failed to fetch campaigns: ${fetchErr.message}`, 500);

  // Find non-canonical campaigns
  const nonCanonical = (allCampaigns || []).filter(c => {
    const code = c.campaign_code || c.id;
    return !CANONICAL_REGEX.test(code);
  });

  if (mode === 'preview') {
    return jsonSuccess({
      success: true,
      total_campaigns: allCampaigns?.length || 0,
      non_canonical_count: nonCanonical.length,
      campaigns: nonCanonical.map(c => ({
        id: c.id,
        campaign_code: c.campaign_code,
        campaign_name: c.campaign_name,
        client_name: c.client_name,
        created_at: c.created_at,
      })),
    });
  }

  if (mode === 'execute') {
    // Build a map of existing canonical codes per period to avoid collisions
    const existingByPeriod = new Map<string, number>();
    for (const c of (allCampaigns || [])) {
      const code = c.campaign_code || c.id;
      const m = code.match(/^CAM-(\d{6})-(\d{4})$/);
      if (m) {
        const period = m[1];
        const seq = parseInt(m[2], 10);
        const current = existingByPeriod.get(period) || 0;
        if (seq > current) existingByPeriod.set(period, seq);
      }
    }

    const results: Array<{ old_id: string; new_code: string; status: string }> = [];

    for (const campaign of nonCanonical) {
      const oldCode = campaign.campaign_code || campaign.id;
      
      // Try to parse the old format
      let period: string;
      const parsed = parseOldFormat(oldCode);
      if (parsed) {
        period = `${parsed.year}${parsed.month}`;
      } else {
        // Fallback: use start_date or created_at
        const dateStr = campaign.start_date || campaign.created_at;
        if (!dateStr) {
          results.push({ old_id: oldCode, new_code: '', status: 'skipped_no_date' });
          continue;
        }
        const d = new Date(dateStr);
        period = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}`;
      }

      // Get next sequence for this period
      const currentMax = existingByPeriod.get(period) || 0;
      const nextSeq = currentMax + 1;
      existingByPeriod.set(period, nextSeq);

      const newCode = `CAM-${period}-${String(nextSeq).padStart(4, '0')}`;

      // Update campaign_code (NOT the id/PK — that's a UUID or legacy string)
      const { error: updateErr } = await supabase
        .from('campaigns')
        .update({ campaign_code: newCode })
        .eq('id', campaign.id);

      if (updateErr) {
        results.push({ old_id: oldCode, new_code: newCode, status: `error: ${updateErr.message}` });
      } else {
        results.push({ old_id: oldCode, new_code: newCode, status: 'migrated' });
      }
    }

    await logSecurityAudit({
      functionName: 'migrate-campaign-ids',
      userId: ctx.userId,
      companyId: ctx.companyId || '',
      action: 'migrate_campaign_ids',
      recordIds: results.filter(r => r.status === 'migrated').map(r => r.new_code),
      status: 'success',
    });

    return jsonSuccess({
      success: true,
      migrated: results.filter(r => r.status === 'migrated').length,
      skipped: results.filter(r => r.status !== 'migrated').length,
      results,
    });
  }

  return jsonError("Invalid mode. Use 'preview' or 'execute'.", 400);
}));

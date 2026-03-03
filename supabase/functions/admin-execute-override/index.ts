/**
 * Admin Execute Override — Step 3: Admin executes approved override
 * Creates a short-lived permit, performs the write, triggers consume it.
 *
 * Security hardening:
 * - Validates record ID format (no wildcards/SQL)
 * - Verifies target row company matches request company (cross-tenant protection)
 * - Captures before-snapshot for financial diff auditing
 * - Consumes permit pre-write to prevent no-op bypass
 * - Rate-limits to 5 overrides/day/company
 */
import { getAuthContext, requireRole, supabaseServiceClient, withAuth, logSecurityAudit } from '../_shared/auth.ts';

const OVERRIDE_TTL_MINUTES = 10;
const MAX_OVERRIDES_PER_DAY = 5;

const FINANCIAL_FIELDS = [
  'amount', 'total_amount', 'taxable_amount', 'cgst_amount', 'sgst_amount', 'igst_amount',
  'gross_amount', 'discount_amount', 'net_amount', 'paid_amount', 'balance_due',
  'negotiated_rate', 'card_rate', 'mounting_charges', 'printing_charges', 'total_price',
  'daily_rate', 'rent_amount', 'printing_cost', 'mounting_cost', 'tax_percent',
  'invoice_date', 'expense_date', 'paid_date', 'bill_amount',
];

/** Reject blank, wildcard, or SQL-ish record IDs */
function isValidRecordId(id: unknown): boolean {
  if (typeof id !== 'string') return false;
  const trimmed = id.trim();
  if (!trimmed || trimmed.length < 1 || trimmed.length > 255) return false;
  const DANGEROUS = /[*%_;'"\\]|(\b(select|insert|update|delete|drop|alter|union|null)\b)/i;
  if (DANGEROUS.test(trimmed)) return false;
  const VALID_PATTERN = /^[a-zA-Z0-9\-]+$/;
  return VALID_PATTERN.test(trimmed);
}

Deno.serve(withAuth(async (req: Request): Promise<Response> => {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers: { 'Content-Type': 'application/json' } });
  }

  const ctx = await getAuthContext(req);
  requireRole(ctx, ['admin']);

  const body = await req.json();
  const { request_id } = body;

  if (!request_id) {
    return new Response(JSON.stringify({ error: 'request_id is required.' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
  }

  const service = supabaseServiceClient();

  // ── Rate limit: max overrides per day per company ──
  const todayStart = new Date();
  todayStart.setUTCHours(0, 0, 0, 0);
  const { count: todayCount } = await service
    .from('finance_override_requests')
    .select('id', { count: 'exact', head: true })
    .eq('company_id', ctx.companyId)
    .eq('status', 'executed')
    .gte('executed_at', todayStart.toISOString());

  if ((todayCount ?? 0) >= MAX_OVERRIDES_PER_DAY) {
    return new Response(JSON.stringify({
      error: `Override limit reached. Maximum ${MAX_OVERRIDES_PER_DAY} overrides per day per company.`,
    }), { status: 429, headers: { 'Content-Type': 'application/json' } });
  }

  // ── Fetch the approved request ──
  const { data: overrideReq, error: fetchErr } = await service
    .from('finance_override_requests')
    .select('*')
    .eq('id', request_id)
    .single();

  if (fetchErr || !overrideReq) {
    return new Response(JSON.stringify({ error: 'Override request not found.' }), { status: 404, headers: { 'Content-Type': 'application/json' } });
  }

  if (overrideReq.company_id !== ctx.companyId) {
    return new Response(JSON.stringify({ error: 'This request does not belong to your company.' }), { status: 403, headers: { 'Content-Type': 'application/json' } });
  }

  if (overrideReq.status !== 'approved') {
    return new Response(JSON.stringify({ error: `Cannot execute a request with status "${overrideReq.status}". Must be "approved".` }), { status: 400, headers: { 'Content-Type': 'application/json' } });
  }

  const { scope_table, scope_record_id, scope_action, payload } = overrideReq;

  // ── Validate record ID format ──
  if (!isValidRecordId(scope_record_id)) {
    return new Response(JSON.stringify({ error: 'Invalid scope_record_id format in request.' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
  }

  // ── Cross-tenant validation: verify target row belongs to this company ──
  const companyCheck = await verifyRecordCompany(service, scope_table, scope_record_id, ctx.companyId);
  if (!companyCheck.valid) {
    await logSecurityAudit({
      functionName: 'admin-execute-override',
      userId: ctx.userId,
      companyId: ctx.companyId,
      action: 'override_cross_tenant_blocked',
      recordIds: [scope_record_id],
      status: 'denied',
      errorMessage: companyCheck.error,
      metadata: { request_id, scope_table },
      req,
    });
    return new Response(JSON.stringify({ error: companyCheck.error }), { status: 403, headers: { 'Content-Type': 'application/json' } });
  }

  // ── Capture before-snapshot for audit diff ──
  let beforeSnapshot: Record<string, unknown> | null = null;
  if (scope_action === 'UPDATE' || scope_action === 'DELETE') {
    try {
      const { data: existing } = await service
        .from(scope_table as any)
        .select('*')
        .eq('id', scope_record_id)
        .single();
      if (existing) {
        // Only keep financial fields for the diff
        beforeSnapshot = {};
        for (const field of FINANCIAL_FIELDS) {
          if (field in existing) {
            beforeSnapshot[field] = (existing as any)[field];
          }
        }
      }
    } catch { /* non-critical */ }
  }

  // ── 1) Create short-lived permit in finance_overrides ──
  const expiresAt = new Date(Date.now() + OVERRIDE_TTL_MINUTES * 60 * 1000).toISOString();

  const { data: permit, error: permitErr } = await service
    .from('finance_overrides')
    .insert({
      company_id: ctx.companyId,
      request_id: overrideReq.id,
      requested_by: overrideReq.requested_by,
      approved_by: ctx.userId,
      reason: overrideReq.reason,
      scope_table,
      scope_record_id,
      scope_action,
      expires_at: expiresAt,
      status: 'approved',
    })
    .select('id')
    .single();

  if (permitErr) {
    return new Response(JSON.stringify({ error: 'Failed to create override permit: ' + permitErr.message }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }

  // ── 2) Consume permit PRE-WRITE to prevent no-op bypass ──
  // Even if the UPDATE writes identical values (trigger may not fire), we still mark it used.
  await service.rpc('consume_finance_override', {
    p_company_id: ctx.companyId,
    p_table: scope_table,
    p_record_id: scope_record_id,
    p_action: scope_action,
  });

  // ── 3) Perform the actual DB write ──
  let writeResult: any = null;
  let writeError: string | null = null;
  let afterSnapshot: Record<string, unknown> | null = null;

  try {
    if (scope_action === 'UPDATE' && payload) {
      const { data, error } = await service
        .from(scope_table as any)
        .update(payload)
        .eq('id', scope_record_id)
        .select();
      if (error) writeError = error.message;
      else {
        writeResult = data;
        // Capture after-snapshot
        if (data && data.length > 0) {
          afterSnapshot = {};
          for (const field of FINANCIAL_FIELDS) {
            if (field in data[0]) {
              afterSnapshot[field] = (data[0] as any)[field];
            }
          }
        }
      }
    } else if (scope_action === 'DELETE') {
      const { error } = await service
        .from(scope_table as any)
        .delete()
        .eq('id', scope_record_id);
      if (error) writeError = error.message;
      else writeResult = { deleted: true };
    } else if (scope_action === 'INSERT' && payload) {
      const { data, error } = await service
        .from(scope_table as any)
        .insert({ ...payload, id: scope_record_id })
        .select();
      if (error) writeError = error.message;
      else writeResult = data;
    } else {
      writeError = 'No payload provided for this action, or unsupported action type.';
    }
  } catch (e) {
    writeError = e instanceof Error ? e.message : 'Unknown write error';
  }

  // ── 4) Mark request as executed (or failed) ──
  const finalStatus = writeError ? 'approved' : 'executed';
  await service
    .from('finance_override_requests')
    .update({
      status: finalStatus,
      executed_at: writeError ? null : new Date().toISOString(),
    })
    .eq('id', request_id);

  // ── 5) Audit log with before/after financial diff ──
  const financialDiff: Record<string, { old: unknown; new: unknown }> = {};
  if (beforeSnapshot && afterSnapshot) {
    for (const field of FINANCIAL_FIELDS) {
      if (field in beforeSnapshot && beforeSnapshot[field] !== afterSnapshot[field]) {
        financialDiff[field] = { old: beforeSnapshot[field], new: afterSnapshot[field] };
      }
    }
  }

  await service.from('admin_audit_logs').insert({
    action: writeError ? 'override_execute_failed' : 'override_executed',
    resource_type: scope_table,
    resource_id: scope_record_id,
    company_id: ctx.companyId,
    user_id: ctx.userId,
    ip_address: req.headers.get('x-forwarded-for') || null,
    details: {
      request_id,
      permit_id: permit.id,
      scope_action,
      reason: overrideReq.reason,
      requested_by: overrideReq.requested_by,
      write_error: writeError,
      payload_keys: payload ? Object.keys(payload) : [],
      financial_diff: Object.keys(financialDiff).length > 0 ? financialDiff : null,
      before_snapshot: beforeSnapshot,
      after_snapshot: afterSnapshot,
    },
  });

  await logSecurityAudit({
    functionName: 'admin-execute-override',
    userId: ctx.userId,
    companyId: ctx.companyId,
    action: writeError ? 'override_execute_failed' : `override_executed:${scope_action}:${scope_table}`,
    recordIds: [scope_record_id],
    status: writeError ? 'error' : 'success',
    errorMessage: writeError || undefined,
    metadata: {
      request_id,
      permit_id: permit.id,
      financial_diff: Object.keys(financialDiff).length > 0 ? financialDiff : undefined,
    },
    req,
  });

  if (writeError) {
    return new Response(JSON.stringify({
      success: false,
      error: 'Override permit created but write failed: ' + writeError,
      permit_id: permit.id,
      request_id,
    }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }

  return new Response(JSON.stringify({
    success: true,
    request_id,
    permit_id: permit.id,
    write_result: writeResult,
    message: 'Override executed successfully.',
  }), { status: 200, headers: { 'Content-Type': 'application/json' } });
}));

/** Verify the target record exists and belongs to the caller's company */
async function verifyRecordCompany(
  service: any,
  table: string,
  recordId: string,
  companyId: string
): Promise<{ valid: boolean; error?: string }> {
  try {
    if (table === 'campaign_assets') {
      const { data } = await service
        .from('campaign_assets')
        .select('id, campaigns!inner(company_id)')
        .eq('id', recordId)
        .single();
      if (!data) return { valid: false, error: 'Target record not found.' };
      if ((data as any).campaigns?.company_id !== companyId) {
        return { valid: false, error: 'Target record does not belong to your company.' };
      }
      return { valid: true };
    }

    if (['invoice_items', 'invoice_line_items'].includes(table)) {
      const { data } = await service
        .from(table)
        .select('id, invoices!inner(company_id)')
        .eq('id', recordId)
        .single();
      if (!data) return { valid: false, error: 'Target record not found.' };
      if ((data as any).invoices?.company_id !== companyId) {
        return { valid: false, error: 'Target record does not belong to your company.' };
      }
      return { valid: true };
    }

    // Direct company_id tables: invoices, expenses, payable_batches
    const { data } = await service
      .from(table)
      .select('id, company_id')
      .eq('id', recordId)
      .single();
    if (!data) return { valid: false, error: 'Target record not found.' };
    if (data.company_id !== companyId) {
      return { valid: false, error: 'Target record does not belong to your company.' };
    }
    return { valid: true };
  } catch {
    return { valid: false, error: 'Failed to verify target record ownership.' };
  }
}

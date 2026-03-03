/**
 * Phase 2C: Admin Finance Override Edge Function
 * 
 * Allows admin users to bypass financial period locks for a single record+action.
 * Creates a time-limited override (10 min TTL), performs the requested write
 * using service role, and logs everything to admin_audit_logs.
 */

import { getAuthContext, requireRole, supabaseServiceClient, withAuth, logSecurityAudit } from '../_shared/auth.ts';

const ALLOWED_TABLES = ['invoices', 'expenses', 'invoice_items', 'invoice_line_items', 'payable_batches', 'campaign_assets'];
const ALLOWED_ACTIONS = ['INSERT', 'UPDATE', 'DELETE'];
const OVERRIDE_TTL_MINUTES = 10;

Deno.serve(withAuth(async (req: Request): Promise<Response> => {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers: { 'Content-Type': 'application/json' } });
  }

  // 1) Auth: must be admin
  const ctx = await getAuthContext(req);
  requireRole(ctx, ['admin']);

  // 2) Parse & validate input
  const body = await req.json();
  const { scope_table, scope_record_id, scope_action, reason, payload } = body;

  if (!scope_table || !scope_record_id || !scope_action || !reason?.trim()) {
    return new Response(JSON.stringify({ error: 'scope_table, scope_record_id, scope_action, and reason are all required.' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
  }

  if (!ALLOWED_TABLES.includes(scope_table)) {
    return new Response(JSON.stringify({ error: `Invalid scope_table. Allowed: ${ALLOWED_TABLES.join(', ')}` }), { status: 400, headers: { 'Content-Type': 'application/json' } });
  }

  if (!ALLOWED_ACTIONS.includes(scope_action.toUpperCase())) {
    return new Response(JSON.stringify({ error: `Invalid scope_action. Allowed: ${ALLOWED_ACTIONS.join(', ')}` }), { status: 400, headers: { 'Content-Type': 'application/json' } });
  }

  const service = supabaseServiceClient();
  const normalizedAction = scope_action.toUpperCase();

  // 3) Create override row with TTL
  const expiresAt = new Date(Date.now() + OVERRIDE_TTL_MINUTES * 60 * 1000).toISOString();

  const { data: override, error: overrideErr } = await service
    .from('finance_overrides')
    .insert({
      company_id: ctx.companyId,
      requested_by: ctx.userId,
      approved_by: ctx.userId,
      reason: reason.trim(),
      scope_table,
      scope_record_id,
      scope_action: normalizedAction,
      expires_at: expiresAt,
      status: 'approved',
    })
    .select('id')
    .single();

  if (overrideErr) {
    console.error('[admin-finance-override] Failed to create override:', overrideErr);
    return new Response(JSON.stringify({ error: 'Failed to create override: ' + overrideErr.message }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }

  // 4) Write audit log
  await service.from('admin_audit_logs').insert({
    action: 'finance_override',
    resource_type: scope_table,
    resource_id: scope_record_id,
    company_id: ctx.companyId,
    user_id: ctx.userId,
    ip_address: req.headers.get('x-forwarded-for') || null,
    user_agent: req.headers.get('user-agent') || null,
    details: {
      override_id: override.id,
      scope_action: normalizedAction,
      reason: reason.trim(),
      expires_at: expiresAt,
      payload_keys: payload ? Object.keys(payload) : [],
    },
  });

  // Also log to security audit
  await logSecurityAudit({
    functionName: 'admin-finance-override',
    userId: ctx.userId,
    companyId: ctx.companyId,
    action: `finance_override:${normalizedAction}:${scope_table}`,
    recordIds: [scope_record_id],
    status: 'success',
    metadata: { reason: reason.trim(), override_id: override.id },
    req,
  });

  // 5) Perform the actual DB write if payload provided
  let writeResult: any = null;

  if (payload && normalizedAction === 'UPDATE') {
    const { data, error } = await service
      .from(scope_table as any)
      .update(payload)
      .eq('id', scope_record_id)
      .select();

    if (error) {
      console.error('[admin-finance-override] Write failed:', error);
      // Mark override as used even on failure (it was consumed by trigger)
      return new Response(JSON.stringify({
        error: 'Override created but write failed: ' + error.message,
        override_id: override.id,
      }), { status: 500, headers: { 'Content-Type': 'application/json' } });
    }
    writeResult = data;
  } else if (payload && normalizedAction === 'INSERT') {
    const { data, error } = await service
      .from(scope_table as any)
      .insert({ ...payload, id: scope_record_id })
      .select();

    if (error) {
      return new Response(JSON.stringify({
        error: 'Override created but insert failed: ' + error.message,
        override_id: override.id,
      }), { status: 500, headers: { 'Content-Type': 'application/json' } });
    }
    writeResult = data;
  } else if (normalizedAction === 'DELETE') {
    const { error } = await service
      .from(scope_table as any)
      .delete()
      .eq('id', scope_record_id);

    if (error) {
      return new Response(JSON.stringify({
        error: 'Override created but delete failed: ' + error.message,
        override_id: override.id,
      }), { status: 500, headers: { 'Content-Type': 'application/json' } });
    }
    writeResult = { deleted: true };
  }

  return new Response(JSON.stringify({
    success: true,
    override_id: override.id,
    expires_at: expiresAt,
    write_result: writeResult,
    message: payload
      ? 'Override created and write completed successfully.'
      : 'Override created. You have 10 minutes to perform the write.',
  }), { status: 200, headers: { 'Content-Type': 'application/json' } });
}));

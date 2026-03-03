/**
 * Admin Decide Override — Step 2: Admin approves or rejects override request
 */
import { getAuthContext, requireRole, supabaseServiceClient, withAuth, logSecurityAudit } from '../_shared/auth.ts';

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
  const { request_id, decision, admin_decision_reason } = body;

  if (!request_id || !decision) {
    return new Response(JSON.stringify({ error: 'request_id and decision are required.' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
  }
  if (!['approved', 'rejected'].includes(decision)) {
    return new Response(JSON.stringify({ error: 'decision must be "approved" or "rejected".' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
  }
  if (decision === 'rejected' && !admin_decision_reason?.trim()) {
    return new Response(JSON.stringify({ error: 'Rejection reason is required.' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
  }

  const service = supabaseServiceClient();

  // Fetch the request
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

  if (overrideReq.status !== 'pending') {
    return new Response(JSON.stringify({ error: `Cannot decide on a request with status "${overrideReq.status}".` }), { status: 400, headers: { 'Content-Type': 'application/json' } });
  }

  // Validate the scope_record_id hasn't been tampered with
  if (!isValidRecordId(overrideReq.scope_record_id)) {
    return new Response(JSON.stringify({ error: 'Request contains invalid scope_record_id. Cannot approve.' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
  }

  // Update request
  const { error: updateErr } = await service
    .from('finance_override_requests')
    .update({
      status: decision,
      admin_decision_by: ctx.userId,
      admin_decision_at: new Date().toISOString(),
      admin_decision_reason: admin_decision_reason?.trim() || null,
    })
    .eq('id', request_id);

  if (updateErr) {
    return new Response(JSON.stringify({ error: 'Failed to update request: ' + updateErr.message }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }

  // Audit log
  await service.from('admin_audit_logs').insert({
    action: `override_${decision}`,
    resource_type: overrideReq.scope_table,
    resource_id: overrideReq.scope_record_id,
    company_id: ctx.companyId,
    user_id: ctx.userId,
    ip_address: req.headers.get('x-forwarded-for') || null,
    details: {
      request_id,
      decision,
      reason: admin_decision_reason?.trim() || null,
      original_reason: overrideReq.reason,
      requested_by: overrideReq.requested_by,
    },
  });

  await logSecurityAudit({
    functionName: 'admin-decide-override',
    userId: ctx.userId,
    companyId: ctx.companyId,
    action: `override_${decision}:${overrideReq.scope_action}:${overrideReq.scope_table}`,
    recordIds: [overrideReq.scope_record_id],
    status: 'success',
    metadata: { request_id, decision },
    req,
  });

  return new Response(JSON.stringify({
    success: true,
    request_id,
    decision,
    message: decision === 'approved'
      ? 'Override approved. Admin can now execute the write.'
      : 'Override request rejected.',
  }), { status: 200, headers: { 'Content-Type': 'application/json' } });
}));

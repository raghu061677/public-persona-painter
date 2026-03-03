/**
 * Finance Request Override — Step 1: Finance user submits override request
 */
import { getAuthContext, requireRole, supabaseServiceClient, withAuth, logSecurityAudit } from '../_shared/auth.ts';

const ALLOWED_TABLES = ['invoices', 'expenses', 'invoice_items', 'invoice_line_items', 'payable_batches', 'campaign_assets'];
const ALLOWED_ACTIONS = ['INSERT', 'UPDATE', 'DELETE'];

Deno.serve(withAuth(async (req: Request): Promise<Response> => {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers: { 'Content-Type': 'application/json' } });
  }

  const ctx = await getAuthContext(req);
  requireRole(ctx, ['finance', 'admin']);

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

  // Check for duplicate pending request
  const { data: existing } = await service
    .from('finance_override_requests')
    .select('id')
    .eq('company_id', ctx.companyId)
    .eq('scope_table', scope_table)
    .eq('scope_record_id', scope_record_id)
    .eq('scope_action', scope_action.toUpperCase())
    .eq('status', 'pending')
    .limit(1);

  if (existing && existing.length > 0) {
    return new Response(JSON.stringify({ error: 'A pending override request already exists for this record and action.', existing_request_id: existing[0].id }), { status: 409, headers: { 'Content-Type': 'application/json' } });
  }

  const { data: request, error } = await service
    .from('finance_override_requests')
    .insert({
      company_id: ctx.companyId,
      requested_by: ctx.userId,
      requested_by_role: ctx.role,
      reason: reason.trim(),
      scope_table,
      scope_record_id,
      scope_action: scope_action.toUpperCase(),
      payload: payload || null,
      status: 'pending',
    })
    .select('id')
    .single();

  if (error) {
    return new Response(JSON.stringify({ error: 'Failed to create request: ' + error.message }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }

  // Audit log
  await service.from('admin_audit_logs').insert({
    action: 'override_requested',
    resource_type: scope_table,
    resource_id: scope_record_id,
    company_id: ctx.companyId,
    user_id: ctx.userId,
    ip_address: req.headers.get('x-forwarded-for') || null,
    details: { request_id: request.id, reason: reason.trim(), scope_action: scope_action.toUpperCase() },
  });

  await logSecurityAudit({
    functionName: 'finance-request-override',
    userId: ctx.userId,
    companyId: ctx.companyId,
    action: `override_requested:${scope_action.toUpperCase()}:${scope_table}`,
    recordIds: [scope_record_id],
    status: 'success',
    metadata: { request_id: request.id },
    req,
  });

  return new Response(JSON.stringify({ success: true, request_id: request.id, message: 'Override request submitted. Awaiting admin approval.' }), { status: 200, headers: { 'Content-Type': 'application/json' } });
}));

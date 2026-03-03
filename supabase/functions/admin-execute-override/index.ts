/**
 * Admin Execute Override — Step 3: Admin executes approved override
 * Creates a short-lived permit, performs the write, triggers consume it.
 */
import { getAuthContext, requireRole, supabaseServiceClient, withAuth, logSecurityAudit } from '../_shared/auth.ts';

const OVERRIDE_TTL_MINUTES = 10;

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

  // Fetch the approved request
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

  // 1) Create short-lived permit in finance_overrides
  const expiresAt = new Date(Date.now() + OVERRIDE_TTL_MINUTES * 60 * 1000).toISOString();

  const { data: permit, error: permitErr } = await service
    .from('finance_overrides')
    .insert({
      company_id: ctx.companyId,
      request_id: overrideReq.id,
      requested_by: overrideReq.requested_by,
      approved_by: ctx.userId,
      reason: overrideReq.reason,
      scope_table: overrideReq.scope_table,
      scope_record_id: overrideReq.scope_record_id,
      scope_action: overrideReq.scope_action,
      expires_at: expiresAt,
      status: 'approved',
    })
    .select('id')
    .single();

  if (permitErr) {
    return new Response(JSON.stringify({ error: 'Failed to create override permit: ' + permitErr.message }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }

  // 2) Perform the actual DB write
  let writeResult: any = null;
  let writeError: string | null = null;

  const { scope_table, scope_record_id, scope_action, payload } = overrideReq;

  try {
    if (scope_action === 'UPDATE' && payload) {
      const { data, error } = await service
        .from(scope_table as any)
        .update(payload)
        .eq('id', scope_record_id)
        .select();
      if (error) writeError = error.message;
      else writeResult = data;
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

  // 3) Mark request as executed (or failed)
  const finalStatus = writeError ? 'approved' : 'executed'; // keep approved if write failed so retry is possible
  await service
    .from('finance_override_requests')
    .update({
      status: finalStatus,
      executed_at: writeError ? null : new Date().toISOString(),
    })
    .eq('id', request_id);

  // 4) Audit log
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
    metadata: { request_id, permit_id: permit.id },
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

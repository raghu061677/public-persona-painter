// supabase/functions/generate-share-token/index.ts
// Phase-4: Secure server-side share token generation for invoices
// Tokens are generated using crypto-grade randomness on the server.

import { corsHeaders } from '../_shared/cors.ts';
import {
  getAuthContext,
  requireRole,
  requireCompanyMatch,
  logSecurityAudit,
  supabaseServiceClient,
  supabaseUserClient,
  jsonError,
  jsonSuccess,
  withAuth,
} from '../_shared/auth.ts';

Deno.serve(withAuth(async (req) => {
  const ctx = await getAuthContext(req);
  requireRole(ctx, ['admin', 'finance']);

  const body = await req.json().catch(() => null);
  if (!body) return jsonError('Request body is required', 400);

  const { invoice_id, expires_days, max_uses } = body;

  if (!invoice_id || typeof invoice_id !== 'string') {
    return jsonError('invoice_id is required', 400);
  }

  // Validate expires_days (1-365)
  const expDays = Math.min(Math.max(Number(expires_days) || 7, 1), 365);
  const maxUsesVal = Math.min(Math.max(Number(max_uses) || 200, 1), 10000);

  // Verify invoice exists and belongs to user's company
  const userClient = supabaseUserClient(req);
  const { data: invoice, error: invoiceError } = await userClient
    .from('invoices')
    .select('id, company_id, invoice_no')
    .eq('id', invoice_id)
    .single();

  if (invoiceError || !invoice) {
    return jsonError('Invoice not found', 404);
  }

  requireCompanyMatch(ctx, invoice.company_id);

  // Generate token server-side with crypto-grade randomness
  const tokenBytes = new Uint8Array(32);
  crypto.getRandomValues(tokenBytes);
  const token = Array.from(tokenBytes).map(b => b.toString(16).padStart(2, '0')).join('');

  const expiresAt = new Date(Date.now() + expDays * 24 * 60 * 60 * 1000).toISOString();

  // Insert token using service client (RLS may block if user doesn't own the invoice)
  const serviceClient = supabaseServiceClient();
  const { data: tokenRecord, error: insertError } = await serviceClient
    .from('invoice_share_tokens')
    .insert({
      token,
      invoice_id,
      company_id: ctx.companyId,
      created_by: ctx.userId,
      expires_at: expiresAt,
      max_uses: maxUsesVal,
      is_revoked: false,
      use_count: 0,
    })
    .select('id, token, expires_at, max_uses, created_at')
    .single();

  if (insertError) {
    console.error('Token creation error:', insertError);
    return jsonError('Failed to create share token', 500);
  }

  await logSecurityAudit({
    functionName: 'generate-share-token',
    userId: ctx.userId,
    companyId: ctx.companyId,
    action: 'create_share_token',
    recordIds: [invoice_id, tokenRecord.id],
    req,
    metadata: { expires_days: expDays, max_uses: maxUsesVal },
  });

  // Return token ONCE — it should be copied immediately by the user
  return jsonSuccess({
    success: true,
    token_id: tokenRecord.id,
    token: tokenRecord.token,
    expires_at: tokenRecord.expires_at,
    max_uses: tokenRecord.max_uses,
    portal_url: `/portal/view-invoice/${tokenRecord.token}`,
  });
}));

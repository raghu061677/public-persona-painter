// supabase/functions/generate-share-token/index.ts
// Phase-5: Token hashing — store sha256(token), never raw token in DB

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

async function sha256Hex(data: string): Promise<string> {
  const encoded = new TextEncoder().encode(data);
  const hashBuffer = await crypto.subtle.digest('SHA-256', encoded);
  return Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
}

Deno.serve(withAuth(async (req) => {
  const ctx = await getAuthContext(req);
  requireRole(ctx, ['admin', 'finance']);

  const body = await req.json().catch(() => null);
  if (!body) return jsonError('Request body is required', 400);

  const { invoice_id, expires_days, max_uses } = body;

  if (!invoice_id || typeof invoice_id !== 'string') {
    return jsonError('invoice_id is required', 400);
  }

  const expDays = Math.min(Math.max(Number(expires_days) || 7, 1), 365);
  const maxUsesVal = Math.min(Math.max(Number(max_uses) || 200, 1), 10000);

  // Verify invoice belongs to user's company
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

  // Generate raw token (returned to user ONCE)
  const tokenBytes = new Uint8Array(32);
  crypto.getRandomValues(tokenBytes);
  const rawToken = Array.from(tokenBytes).map(b => b.toString(16).padStart(2, '0')).join('');

  // Hash token for storage — raw token NEVER stored in DB
  const tokenHash = await sha256Hex(rawToken);

  const expiresAt = new Date(Date.now() + expDays * 24 * 60 * 60 * 1000).toISOString();

  const serviceClient = supabaseServiceClient();
  const { data: tokenRecord, error: insertError } = await serviceClient
    .from('invoice_share_tokens')
    .insert({
      token: null,           // Raw token NOT stored
      token_hash: tokenHash, // Only hash stored
      invoice_id,
      company_id: ctx.companyId,
      created_by: ctx.userId,
      expires_at: expiresAt,
      max_uses: maxUsesVal,
      is_revoked: false,
      use_count: 0,
    })
    .select('id, expires_at, max_uses, created_at')
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

  // Return raw token ONCE — user must copy immediately
  return jsonSuccess({
    success: true,
    token_id: tokenRecord.id,
    token: rawToken,
    expires_at: tokenRecord.expires_at,
    max_uses: tokenRecord.max_uses,
    portal_url: `/portal/view-invoice/${rawToken}`,
  });
}));

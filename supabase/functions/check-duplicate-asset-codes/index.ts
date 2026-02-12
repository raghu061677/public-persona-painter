// supabase/functions/check-duplicate-asset-codes/index.ts
// v2.0 - Phase-3 Security: User-scoped + admin role enforcement + audit logging

import { corsHeaders } from '../_shared/cors.ts';
import {
  getAuthContext,
  requireRole,
  logSecurityAudit,
  supabaseUserClient,
  jsonError,
  jsonSuccess,
  withAuth,
} from '../_shared/auth.ts';

Deno.serve(withAuth(async (req) => {
  const ctx = await getAuthContext(req);
  requireRole(ctx, ['admin']);

  console.log("Checking for duplicate media asset codes...");

  const userClient = supabaseUserClient(req);

  // RLS ensures only own company's assets are returned
  const { data: allAssets, error: fetchError } = await userClient
    .from('media_assets')
    .select('media_asset_code, id')
    .not('media_asset_code', 'is', null);

  if (fetchError) {
    return jsonError(fetchError.message, 500);
  }

  // Group by code
  const codeMap = new Map<string, string[]>();
  (allAssets || []).forEach(asset => {
    const code = asset.media_asset_code;
    if (!codeMap.has(code)) codeMap.set(code, []);
    codeMap.get(code)!.push(asset.id);
  });

  const duplicates = Array.from(codeMap.entries())
    .filter(([_, ids]) => ids.length > 1)
    .map(([code, ids]) => ({ code, count: ids.length, asset_ids: ids }));

  // Check for assets without codes
  const { data: missingCodes, error: missingError } = await userClient
    .from('media_assets')
    .select('id, city, media_type')
    .is('media_asset_code', null);

  if (missingError) {
    return jsonError(missingError.message, 500);
  }

  const summary = {
    total_assets_checked: allAssets?.length || 0,
    duplicates_found: duplicates.length,
    assets_without_code: missingCodes?.length || 0,
    duplicates,
    missing_codes: missingCodes || [],
  };

  await logSecurityAudit({
    functionName: 'check-duplicate-asset-codes', userId: ctx.userId,
    companyId: ctx.companyId, action: 'audit_asset_codes',
    metadata: { duplicates: duplicates.length, missing: (missingCodes || []).length }, req,
  });

  return jsonSuccess({ success: true, summary, timestamp: new Date().toISOString() });
}));

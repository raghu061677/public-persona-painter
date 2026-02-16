// v2.0 - Phase-6 Security: withAuth + platform admin only + audit logging
import {
  getAuthContext, isPlatformAdmin, logSecurityAudit,
  supabaseServiceClient, jsonError, jsonSuccess, withAuth, AuthError,
} from '../_shared/auth.ts';

Deno.serve(withAuth(async (req) => {
  const ctx = await getAuthContext(req);

  const isAdmin = await isPlatformAdmin(ctx.userId);
  if (!isAdmin) {
    await logSecurityAudit({
      functionName: 'cleanup-duplicate-companies', userId: ctx.userId,
      companyId: ctx.companyId, action: 'cleanup_duplicates_denied',
      status: 'denied', req,
    });
    throw new AuthError('Only platform admins can cleanup companies', 403);
  }

  const serviceClient = supabaseServiceClient();

  const { data: companies, error: fetchError } = await serviceClient
    .from('companies')
    .select('*')
    .order('created_at', { ascending: true });

  if (fetchError) throw fetchError;

  const companyGroups = new Map<string, any[]>();
  companies?.forEach(company => {
    const name = company.name.toLowerCase().trim();
    if (!companyGroups.has(name)) companyGroups.set(name, []);
    companyGroups.get(name)!.push(company);
  });

  const duplicates: any[] = [];
  const toDelete: string[] = [];

  companyGroups.forEach((group, name) => {
    if (group.length > 1) {
      const [keep, ...remove] = group;
      duplicates.push({ name, kept: keep.id, removed: remove.map((c: any) => c.id) });
      toDelete.push(...remove.map((c: any) => c.id));
    }
  });

  if (toDelete.length === 0) {
    return jsonSuccess({ message: 'No duplicate companies found', duplicates: [] });
  }

  const { error: deleteError } = await serviceClient
    .from('companies')
    .delete()
    .in('id', toDelete);

  if (deleteError) throw deleteError;

  await logSecurityAudit({
    functionName: 'cleanup-duplicate-companies', userId: ctx.userId,
    companyId: ctx.companyId, action: 'cleanup_duplicates',
    recordIds: toDelete, status: 'success', req,
    metadata: { duplicates, deletedCount: toDelete.length },
  });

  return jsonSuccess({
    message: `Deleted ${toDelete.length} duplicate companies`,
    duplicates,
    deletedCount: toDelete.length,
  });
}));

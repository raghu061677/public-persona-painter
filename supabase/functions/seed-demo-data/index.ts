// v3.0 - Phase-5: withAuth + getAuthContext + requireRole + audit
import { corsHeaders } from '../_shared/cors.ts';
import {
  getAuthContext, requireRole, logSecurityAudit,
  supabaseServiceClient, jsonError, jsonSuccess, withAuth,
} from '../_shared/auth.ts';

Deno.serve(withAuth(async (req) => {
  const ctx = await getAuthContext(req);
  requireRole(ctx, ['admin']);

  const body = await req.json().catch(() => null);
  if (!body) return jsonError('Invalid JSON body', 400);

  const { companyId } = body;
  const targetCompany = companyId || ctx.companyId;
  if (targetCompany !== ctx.companyId) {
    return jsonError('Can only seed demo data in your own company', 403);
  }

  const serviceClient = supabaseServiceClient();

  // Seed demo clients
  const demoClients = [
    { id: 'CLT-DEMO-001', company_id: targetCompany, name: 'ABC Beverages Ltd', contact_person: 'Rajesh Kumar', email: 'rajesh@abc.com', phone: '9876543210', city: 'Hyderabad', type: 'brand' },
    { id: 'CLT-DEMO-002', company_id: targetCompany, name: 'XYZ Retail Chain', contact_person: 'Priya Sharma', email: 'priya@xyz.com', phone: '9876543211', city: 'Hyderabad', type: 'brand' },
  ];

  for (const client of demoClients) {
    await serviceClient.from('clients').upsert(client, { onConflict: 'id' });
  }

  await logSecurityAudit({
    functionName: 'seed-demo-data', userId: ctx.userId,
    companyId: ctx.companyId, action: 'seed_demo_data',
    status: 'success', req,
  });

  return jsonSuccess({ message: 'Demo data seeded successfully', clients: demoClients.length });
}));

// supabase/functions/auto-record-expenses/index.ts
// v3.0 - Phase-3 Security: User-scoped + role enforcement + audit logging

import { corsHeaders } from '../_shared/cors.ts';
import {
  getAuthContext,
  requireRole,
  requireCompanyMatch,
  logSecurityAudit,
  supabaseUserClient,
  supabaseServiceClient,
  jsonError,
  jsonSuccess,
  withAuth,
} from '../_shared/auth.ts';

console.log('Auto-record expenses function v3.0 started');

Deno.serve(withAuth(async (req) => {
  const ctx = await getAuthContext(req);
  requireRole(ctx, ['admin', 'finance']);

  const body = await req.json().catch(() => null);
  const campaign_id = body?.campaign_id;

  if (!campaign_id || typeof campaign_id !== 'string') {
    return jsonError('campaign_id is required', 400);
  }

  console.log('[v3.0] Recording expenses for campaign:', campaign_id);

  const userClient = supabaseUserClient(req);

  // Fetch campaign with assets via RLS
  const { data: campaign, error: campaignError } = await userClient
    .from('campaigns')
    .select(`
      company_id, campaign_name,
      campaign_assets(
        asset_id, location, city, area,
        printing_charges, mounting_charges, mounter_name
      )
    `)
    .eq('id', campaign_id)
    .single();

  if (campaignError || !campaign) {
    return jsonError('Campaign not found', 404);
  }

  requireCompanyMatch(ctx, campaign.company_id);

  // Service client for expense ID generation and insert
  const serviceClient = supabaseServiceClient();
  const expenses = [];

  for (const asset of campaign.campaign_assets) {
    if (asset.printing_charges && asset.printing_charges > 0) {
      const { data: expenseId } = await serviceClient.rpc('generate_expense_id');
      const printingExpense = {
        id: expenseId,
        campaign_id,
        company_id: ctx.companyId,
        category: 'Printing',
        vendor_name: 'Printing Vendor',
        amount: asset.printing_charges,
        gst_percent: 18,
        gst_amount: asset.printing_charges * 0.18,
        total_amount: asset.printing_charges * 1.18,
        payment_status: 'Pending',
        expense_date: new Date().toISOString().split('T')[0],
        notes: `Printing for ${asset.city} - ${asset.area} - ${asset.location || 'N/A'}`,
        created_by: ctx.userId,
      };
      const { error } = await serviceClient.from('expenses').insert(printingExpense);
      if (!error) expenses.push(printingExpense);
      else console.error('[v3.0] Printing expense error:', error);
    }

    if (asset.mounting_charges && asset.mounting_charges > 0) {
      const { data: expenseId } = await serviceClient.rpc('generate_expense_id');
      const mountingExpense = {
        id: expenseId,
        campaign_id,
        company_id: ctx.companyId,
        category: 'Mounting',
        vendor_name: asset.mounter_name || 'Mounting Vendor',
        amount: asset.mounting_charges,
        gst_percent: 18,
        gst_amount: asset.mounting_charges * 0.18,
        total_amount: asset.mounting_charges * 1.18,
        payment_status: 'Pending',
        expense_date: new Date().toISOString().split('T')[0],
        notes: `Mounting for ${asset.city} - ${asset.area} - ${asset.location || 'N/A'}`,
        created_by: ctx.userId,
      };
      const { error } = await serviceClient.from('expenses').insert(mountingExpense);
      if (!error) expenses.push(mountingExpense);
      else console.error('[v3.0] Mounting expense error:', error);
    }
  }

  await logSecurityAudit({
    functionName: 'auto-record-expenses', userId: ctx.userId,
    companyId: ctx.companyId, action: 'create_expenses',
    recordIds: expenses.map((e: any) => e.id), req,
    metadata: { campaign_id, count: expenses.length },
  });

  return jsonSuccess({ success: true, expenses_created: expenses.length, expenses });
}));

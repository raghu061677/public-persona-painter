// v2.0 - Phase-6 Security: withAuth + getAuthContext + role enforcement
import {
  getAuthContext, requireRole, logSecurityAudit,
  supabaseServiceClient, jsonError, jsonSuccess, withAuth,
} from '../_shared/auth.ts';

interface SharedAsset {
  asset_id: string;
  share_percentage: number;
}

interface BillData {
  id: string;
  asset_id: string;
  bill_amount: number;
  bill_month: string;
  unique_service_number: string;
  shared_with_assets?: SharedAsset[];
  is_primary_bill?: boolean;
}

Deno.serve(withAuth(async (req) => {
  const ctx = await getAuthContext(req);
  requireRole(ctx, ['admin', 'finance']);

  const body = await req.json().catch(() => null);
  if (!body) return jsonError('Invalid JSON body', 400);

  const { bill_id, action = 'create' } = body;
  if (!bill_id || typeof bill_id !== 'string') {
    return jsonError('bill_id is required', 400);
  }

  const serviceClient = supabaseServiceClient();

  console.log(`Processing expense split for bill ${bill_id}, action: ${action}`);

  const { data: bill, error: billError } = await serviceClient
    .from('asset_power_bills')
    .select('*')
    .eq('id', bill_id)
    .single();

  if (billError || !bill) {
    return jsonError(`Failed to fetch bill: ${billError?.message || 'Bill not found'}`, 404);
  }

  // Verify bill belongs to an asset in the user's company
  const { data: asset } = await serviceClient
    .from('media_assets')
    .select('company_id')
    .eq('id', (bill as BillData).asset_id)
    .single();

  if (!asset || asset.company_id !== ctx.companyId) {
    return jsonError('Bill does not belong to your company', 403);
  }

  const billData = bill as BillData;

  if (!billData.is_primary_bill || !billData.shared_with_assets || !Array.isArray(billData.shared_with_assets)) {
    return jsonSuccess({
      success: true,
      message: 'Bill is not shared, no expenses generated',
      expenses_created: 0
    });
  }

  const sharedAssets = billData.shared_with_assets as SharedAsset[];
  const totalPercentage = sharedAssets.reduce((sum, a) => sum + a.share_percentage, 0);
  if (Math.abs(totalPercentage - 100) > 0.01) {
    return jsonError(`Invalid share percentages: total is ${totalPercentage}%, must be 100%`, 400);
  }

  if (action === 'update') {
    await serviceClient.from('expenses').delete().eq('bill_id', bill_id);
  }

  const expensesToCreate: any[] = [];
  const monthName = new Date(billData.bill_month).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  const primarySharePercentage = 100 - totalPercentage;

  if (primarySharePercentage > 0) {
    const primaryAmount = (billData.bill_amount * primarySharePercentage) / 100;
    const primaryGst = primaryAmount * 0.18;
    expensesToCreate.push({
      company_id: ctx.companyId,
      category: 'Electricity', amount: primaryAmount,
      gst_percent: 18, gst_amount: primaryGst, total_amount: primaryAmount + primaryGst,
      vendor_name: 'TGSPDCL', bill_id, bill_month: monthName, payment_status: 'Pending',
      notes: `Power bill for ${billData.unique_service_number} - ${monthName} (Primary Asset: ${primarySharePercentage.toFixed(1)}% share)`,
      created_by: ctx.userId,
    });
  }

  for (const sharedAsset of sharedAssets) {
    const splitAmount = (billData.bill_amount * sharedAsset.share_percentage) / 100;
    const gstAmount = splitAmount * 0.18;
    expensesToCreate.push({
      company_id: ctx.companyId,
      category: 'Electricity', amount: splitAmount,
      gst_percent: 18, gst_amount: gstAmount, total_amount: splitAmount + gstAmount,
      vendor_name: 'TGSPDCL', bill_id, bill_month: monthName, payment_status: 'Pending',
      notes: `Power bill for ${billData.unique_service_number} - ${monthName} (Shared Asset: ${sharedAsset.asset_id}, ${sharedAsset.share_percentage.toFixed(1)}% share)`,
      created_by: ctx.userId,
    });
  }

  const { data: createdExpenses, error: expenseError } = await serviceClient
    .from('expenses')
    .insert(expensesToCreate)
    .select();

  if (expenseError) {
    return jsonError(`Failed to create expenses: ${expenseError.message}`, 500);
  }

  await logSecurityAudit({
    functionName: 'split-power-bill-expenses', userId: ctx.userId,
    companyId: ctx.companyId, action: 'split_power_bill',
    recordIds: [bill_id], status: 'success', req,
    metadata: { expenses_created: createdExpenses?.length || 0 },
  });

  return jsonSuccess({
    success: true,
    message: 'Expenses generated successfully',
    expenses_created: createdExpenses?.length || 0,
    expense_ids: createdExpenses?.map((e: any) => e.id) || [],
  });
}));

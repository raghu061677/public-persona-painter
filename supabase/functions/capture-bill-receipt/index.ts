// v2.0 - Phase-5: JWT + role enforcement + Zod validation + audit logging
import { corsHeaders } from '../_shared/cors.ts';
import {
  getAuthContext, requireRole, logSecurityAudit,
  supabaseServiceClient, jsonError, jsonSuccess, withAuth,
} from '../_shared/auth.ts';

const MAX_BODY_SIZE = 4096; // 4KB max for this simple JSON endpoint

Deno.serve(withAuth(async (req) => {
  const ctx = await getAuthContext(req);
  requireRole(ctx, ['admin', 'finance']);

  // Body size limit
  const contentLength = parseInt(req.headers.get('content-length') || '0', 10);
  if (contentLength > MAX_BODY_SIZE) {
    return jsonError('Request body too large', 413);
  }

  const body = await req.json().catch(() => null);
  if (!body) return jsonError('Invalid JSON body', 400);

  const { service_no, bill_month, amount, bill_id, asset_id } = body;

  // Zod-like validation
  if (!service_no || typeof service_no !== 'string' || service_no.length > 50) {
    return jsonError('Invalid service_no', 400);
  }
  if (!bill_month || typeof bill_month !== 'string' || !/^\d{4}-\d{2}/.test(bill_month)) {
    return jsonError('Invalid bill_month format (expected YYYY-MM...)', 400);
  }
  if (typeof amount !== 'number' || amount <= 0 || amount > 10000000) {
    return jsonError('Invalid amount', 400);
  }
  if (!bill_id || typeof bill_id !== 'string') {
    return jsonError('Invalid bill_id', 400);
  }

  // Service client needed for storage + cross-table writes
  const serviceClient = supabaseServiceClient();

  // Verify the bill belongs to user's company
  const { data: bill, error: billErr } = await serviceClient
    .from('asset_power_bills')
    .select('id, asset_id, media_assets!inner(company_id)')
    .eq('id', bill_id)
    .single();

  if (billErr || !bill) {
    return jsonError('Bill not found', 404);
  }

  const billCompanyId = (bill as any).media_assets?.company_id;
  if (billCompanyId !== ctx.companyId) {
    await logSecurityAudit({
      functionName: 'capture-bill-receipt', userId: ctx.userId,
      companyId: ctx.companyId, action: 'capture_bill_cross_company',
      status: 'denied', req, metadata: { bill_id, target_company: billCompanyId },
    });
    return jsonError('Forbidden – bill does not belong to your company', 403);
  }

  // Generate placeholder receipt
  const receiptFileName = `company/${ctx.companyId}/receipts/${service_no}-${bill_month}.txt`;
  const receiptContent = `TGSPDCL Payment Receipt\nService: ${service_no}\nMonth: ${bill_month}\nAmount: ₹${amount}\nDate: ${new Date().toISOString()}`;

  const { error: uploadError } = await serviceClient.storage
    .from('campaign-photos')
    .upload(receiptFileName, receiptContent, { contentType: 'text/plain', upsert: true });

  if (uploadError) throw uploadError;

  const { data: { publicUrl } } = serviceClient.storage
    .from('campaign-photos')
    .getPublicUrl(receiptFileName);

  const { error: billUpdateError } = await serviceClient
    .from('asset_power_bills')
    .update({
      paid: true, payment_status: 'Paid',
      payment_date: new Date().toISOString().split('T')[0],
      paid_amount: amount, paid_receipt_url: publicUrl,
    })
    .eq('id', bill_id);

  if (billUpdateError) throw billUpdateError;

  const { data: expenseData, error: expenseError } = await serviceClient
    .from('expenses')
    .insert({
      category: 'Electricity', vendor_name: 'TGSPDCL',
      amount, gst_percent: 0, gst_amount: 0, total_amount: amount,
      payment_status: 'Paid', paid_date: new Date().toISOString().split('T')[0],
      notes: `Power bill payment for Service ${service_no}, ${bill_month}`,
      invoice_url: publicUrl, bill_id, bill_month,
      campaign_id: asset_id,
    })
    .select().single();

  if (expenseError) throw expenseError;

  await logSecurityAudit({
    functionName: 'capture-bill-receipt', userId: ctx.userId,
    companyId: ctx.companyId, action: 'capture_bill_payment',
    recordIds: [bill_id, expenseData.id], status: 'success', req,
    metadata: { service_no, bill_month, amount },
  });

  return jsonSuccess({
    status: 'success', receipt: publicUrl, expense_id: expenseData.id,
    message: 'Payment recorded successfully.',
  });
}));

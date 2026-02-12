/**
 * fetch-tgspdcl-payment — Phase-6 Hardened
 * Auth: JWT + role gate (admin, finance)
 * Validates asset belongs to caller's company
 * Audit log on payment fetch
 */
import {
  withAuth, getAuthContext, requireRole,
  supabaseServiceClient, logSecurityAudit, jsonError, jsonSuccess,
} from '../_shared/auth.ts';

const MAX_USN_LENGTH = 30;

Deno.serve(withAuth(async (req) => {
  if (req.method !== 'POST') return jsonError('Method not allowed', 405);

  const ctx = await getAuthContext(req);
  requireRole(ctx, ['admin', 'finance']);

  const body = await req.json().catch(() => null);
  if (!body) return jsonError('Invalid JSON');

  const { uniqueServiceNumber, serviceNumber, assetId, billMonth } = body;

  if (!uniqueServiceNumber || typeof uniqueServiceNumber !== 'string' || uniqueServiceNumber.length > MAX_USN_LENGTH) {
    return jsonError('uniqueServiceNumber is required (max 30 chars)');
  }
  if (!assetId || typeof assetId !== 'string') {
    return jsonError('assetId is required');
  }

  const supabase = supabaseServiceClient();

  // Verify asset belongs to caller's company
  const { data: asset } = await supabase
    .from('media_assets')
    .select('id, company_id')
    .eq('id', assetId)
    .single();

  if (!asset) return jsonError('Asset not found', 404);
  if (asset.company_id !== ctx.companyId) return jsonError('Asset does not belong to your company', 403);

  // Fetch from TGSPDCL
  const formData = new URLSearchParams({
    uniqueServiceNumber,
    serviceNumber: serviceNumber || '',
    verifyCaptcha: 'no',
  });

  const tgspdclResponse = await fetch('https://tgsouthernpower.org/paybillonline', {
    method: 'POST',
    body: formData,
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'User-Agent': 'Mozilla/5.0',
    },
  });

  if (!tgspdclResponse.ok) {
    return jsonError(`TGSPDCL API error: ${tgspdclResponse.statusText}`, 500);
  }

  const html = await tgspdclResponse.text();
  const billData = parseHTMLBillDetails(html);

  if (!billData) {
    return jsonError('Could not parse bill details from TGSPDCL response', 400);
  }

  // Store bill
  const billRecord = {
    asset_id: assetId,
    bill_month: billMonth || billData.bill_date?.substring(0, 7),
    bill_date: billData.bill_date,
    due_date: billData.due_date,
    units: billData.units,
    energy_charges: billData.energy_charges,
    fixed_charges: billData.fixed_charges,
    acd_amount: billData.customer_charges || 0,
    arrears: billData.arrears || 0,
    current_month_bill: billData.net_amount,
    total_due: billData.total_due,
    bill_amount: billData.total_due,
    payment_status: billData.payment_status?.toLowerCase().includes('paid') ? 'Paid' : 'Pending',
    payment_reference: billData.payment_reference,
    paid_receipt_url: billData.receipt_url,
    paid: billData.payment_status?.toLowerCase().includes('paid') || false,
  };

  const { data, error } = await supabase
    .from('asset_power_bills')
    .insert(billRecord)
    .select()
    .single();

  if (error) return jsonError(`Failed to save bill: ${error.message}`, 500);

  await logSecurityAudit({
    functionName: 'fetch-tgspdcl-payment', userId: ctx.userId, companyId: ctx.companyId,
    action: 'fetch_payment_bill', recordIds: [assetId],
    metadata: { uniqueServiceNumber, totalDue: billData.total_due }, req,
  });

  return jsonSuccess({ success: true, message: 'Bill fetched and saved', billData: data });
}));

function parseHTMLBillDetails(html: string) {
  try {
    const extractValue = (pattern: RegExp): string | null => { const m = html.match(pattern); return m ? m[1].trim() : null; };
    const extractNumber = (pattern: RegExp): number | null => {
      const v = extractValue(pattern); if (!v) return null;
      const n = parseFloat(v.replace(/[₹,\s]/g, '')); return isNaN(n) ? null : n;
    };

    const billDate = extractValue(/Bill\s+Date[:\s]*<\/td>\s*<td[^>]*>([\d\-\/]+)/i);
    const dueDate = extractValue(/Due\s+Date[:\s]*<\/td>\s*<td[^>]*>([\d\-\/]+)/i);
    const units = extractValue(/Units[:\s]*<\/td>\s*<td[^>]*>([\d\.]+)/i);
    const energyCharges = extractNumber(/Energy\s+Charges[:\s]*<\/td>\s*<td[^>]*>([₹\d\.,\s]+)/i);
    const fixedCharges = extractNumber(/Fixed\s+Charges[:\s]*<\/td>\s*<td[^>]*>([₹\d\.,\s]+)/i);
    const customerCharges = extractNumber(/Customer\s+Charges[:\s]*<\/td>\s*<td[^>]*>([₹\d\.,\s]+)/i);
    const arrears = extractNumber(/Arrears[:\s]*<\/td>\s*<td[^>]*>([₹\d\.,\s-]+)/i) || 0;
    const netAmount = extractNumber(/Net\s+Amount[:\s]*<\/td>\s*<td[^>]*>([₹\d\.,\s]+)/i);
    const totalDue = extractNumber(/Total\s+Amount.*?Payable[:\s]*<\/td>\s*<td[^>]*>([₹\d\.,\s]+)/i);
    const paymentStatus = extractValue(/Payment\s+Status[:\s]*<\/td>\s*<td[^>]*>([^<]+)/i);
    const paymentReference = extractValue(/Payment\s+Reference[:\s]*<\/td>\s*<td[^>]*>([^<]+)/i);
    const receiptUrlMatch = html.match(/href\s*=\s*["']([^"']*receipt[^"']*)["']/i);

    if (!billDate && !totalDue) return null;

    return {
      bill_date: billDate, due_date: dueDate,
      units: units ? parseFloat(units) : null,
      energy_charges: energyCharges, fixed_charges: fixedCharges,
      customer_charges: customerCharges, arrears, net_amount: netAmount,
      total_due: totalDue || netAmount,
      payment_status: paymentStatus, payment_reference: paymentReference,
      receipt_url: receiptUrlMatch ? receiptUrlMatch[1] : null,
    };
  } catch { return null; }
}

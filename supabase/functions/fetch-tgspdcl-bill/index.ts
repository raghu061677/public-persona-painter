/**
 * fetch-tgspdcl-bill — Phase-6 Hardened
 * Auth: JWT + role gate (admin, finance)
 * Validates asset belongs to caller's company
 * Audit log on bill fetch+store
 */
import {
  withAuth, getAuthContext, requireRole,
  supabaseServiceClient, logSecurityAudit, jsonError, jsonSuccess,
} from '../_shared/auth.ts';
import * as cheerio from 'https://esm.sh/cheerio@1.0.0-rc.12';

const MAX_USN_LENGTH = 30;

Deno.serve(withAuth(async (req) => {
  if (req.method !== 'POST') return jsonError('Method not allowed', 405);

  const ctx = await getAuthContext(req);
  requireRole(ctx, ['admin', 'finance']);

  const body = await req.json().catch(() => null);
  if (!body) return jsonError('Invalid JSON');

  const { uniqueServiceNumber, assetId } = body;

  if (!uniqueServiceNumber || typeof uniqueServiceNumber !== 'string' || uniqueServiceNumber.length > MAX_USN_LENGTH) {
    return jsonError('uniqueServiceNumber (string, max 30 chars) is required');
  }

  // If assetId provided, verify it belongs to caller's company
  if (assetId) {
    const supabase = supabaseServiceClient();
    const { data: asset } = await supabase
      .from('media_assets')
      .select('id, company_id')
      .eq('id', assetId)
      .single();

    if (!asset) return jsonError('Asset not found', 404);
    if (asset.company_id !== ctx.companyId) return jsonError('Asset does not belong to your company', 403);
  }

  console.log('Fetching TGSPDCL bill for USN:', uniqueServiceNumber);

  const { billData, error: fetchError } = await fetchBillFromTGSPDCL(uniqueServiceNumber);

  if (!billData || (billData.bill_amount === 0 && billData.total_due === 0)) {
    return jsonSuccess({
      success: false,
      error: fetchError || 'Unable to automatically fetch bill data',
      message: 'Please use the manual entry option',
      payment_url: 'https://tgsouthernpower.org/paybillonline',
      unique_service_number: uniqueServiceNumber
    });
  }

  if (assetId && billData) {
    const supabase = supabaseServiceClient();

    // Fetch asset details for merging
    const { data: assetData } = await supabase
      .from('media_assets')
      .select('consumer_name, service_number, ero, section_name, area, direction, location')
      .eq('id', assetId)
      .single();

    const mergedData = {
      ...billData,
      consumer_name: billData.consumer_name || assetData?.consumer_name,
      service_number: billData.service_number || assetData?.service_number,
      ero_name: billData.ero_name || billData.ero || assetData?.ero,
      section_name: billData.section_name || assetData?.section_name,
      consumer_address: billData.consumer_address || billData.address,
      area: billData.area || assetData?.area,
      direction: billData.direction || assetData?.direction,
      location: billData.location || assetData?.location,
    };

    const { error: insertError } = await supabase.from('asset_power_bills').insert({
      asset_id: assetId,
      unique_service_number: mergedData.unique_service_number,
      consumer_name: mergedData.consumer_name,
      service_number: mergedData.service_number,
      ero_name: mergedData.ero_name,
      section_name: mergedData.section_name,
      consumer_address: mergedData.consumer_address,
      bill_date: mergedData.bill_date ? new Date(mergedData.bill_date) : null,
      due_date: mergedData.due_date ? new Date(mergedData.due_date) : null,
      bill_month: mergedData.bill_month || new Date().toISOString(),
      bill_amount: mergedData.bill_amount || mergedData.current_month_bill || 0,
      energy_charges: mergedData.energy_charges || 0,
      fixed_charges: mergedData.fixed_charges || 0,
      arrears: mergedData.arrears || 0,
      total_due: mergedData.total_due || mergedData.bill_amount || 0,
      payment_status: 'Pending',
    });

    if (insertError) throw insertError;

    await logSecurityAudit({
      functionName: 'fetch-tgspdcl-bill', userId: ctx.userId, companyId: ctx.companyId,
      action: 'fetch_and_store_bill', recordIds: [assetId],
      metadata: { uniqueServiceNumber, totalDue: mergedData.total_due }, req,
    });
  }

  return jsonSuccess({
    success: true, billData, data: billData,
    message: 'Bill fetched and stored successfully',
    payment_url: 'https://tgsouthernpower.org/paybillonline'
  });
}));

// ─── Bill fetching logic (unchanged from original) ───

interface BillData {
  consumer_name?: string; unique_service_number: string; service_number?: string;
  ero?: string; ero_name?: string; section_name?: string;
  consumer_address?: string; area?: string; direction?: string; location?: string; address?: string;
  units?: number; bill_date?: string; due_date?: string;
  bill_amount?: number; energy_charges?: number; fixed_charges?: number;
  current_month_bill?: number; acd_amount?: number; arrears?: number; total_due?: number;
  payment_link?: string; bill_month?: string;
}

async function fetchBillFromTGSPDCL(uniqueServiceNumber: string): Promise<{ billData: BillData | null; error?: string }> {
  try {
    const url = 'https://tgsouthernpower.org/paybillonline';
    const formBody = `usno=${encodeURIComponent(uniqueServiceNumber)}&submit=Get+Bill`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'Mozilla/5.0',
        'Origin': 'https://tgsouthernpower.org',
        'Referer': 'https://tgsouthernpower.org/paybillonline',
      },
      body: formBody, redirect: 'follow',
    });

    if (!response.ok) return { billData: null, error: `TGSPDCL portal returned status ${response.status}` };

    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      const jsonData = await response.json();
      const bd = parseJSONResponse(jsonData, uniqueServiceNumber);
      if (bd && ((bd.bill_amount || 0) > 0 || (bd.total_due || 0) > 0)) return { billData: bd };
    }

    const html = await response.text();
    const billData = parseHTMLForBillData(html, uniqueServiceNumber);
    if (billData && ((billData.bill_amount || 0) > 0 || (billData.total_due || 0) > 0)) return { billData };

    return { billData: null, error: 'Unable to fetch bill from TGSPDCL portal.' };
  } catch (error) {
    return { billData: null, error: `Failed to connect to TGSPDCL: ${error instanceof Error ? error.message : 'Unknown'}` };
  }
}

function parseJSONResponse(data: any, usn: string): BillData | null {
  try {
    const b = data.bill || data.data || data;
    if (!b) return null;
    return {
      consumer_name: b.consumerName || b.consumer_name || 'Unknown',
      service_number: b.serviceNumber || b.service_number || usn.substring(0, 10),
      unique_service_number: usn,
      section_name: b.section || b.section_name,
      ero: b.ero || b.ERO,
      address: b.address,
      units: b.units || b.unitsConsumed,
      bill_date: b.billDate || b.bill_date,
      due_date: b.dueDate || b.due_date,
      bill_amount: parseFloat(b.totalDue || b.total_due || b.billAmount || 0),
      current_month_bill: parseFloat(b.currentMonthBill || b.current_month_bill || 0),
      acd_amount: parseFloat(b.acdAmount || b.acd_amount || 0),
      arrears: parseFloat(b.arrears || 0),
      total_due: parseFloat(b.totalDue || b.total_due || 0),
    };
  } catch { return null; }
}

function parseHTMLForBillData(html: string, usn: string): BillData {
  const $ = cheerio.load(html);
  const bd: BillData = { unique_service_number: usn };
  const extractNumber = (t: string | null): number | undefined => {
    if (!t) return undefined;
    const n = parseFloat(t.replace(/[₹,\s]/g, ''));
    return isNaN(n) ? undefined : n;
  };

  // Simplified extraction — same logic as original
  $('td, th').each((_, elem) => {
    const text = $(elem).text().trim();
    const nextText = $(elem).next().text().trim();
    if (/Consumer\s*Name/i.test(text) && nextText.length > 3) bd.consumer_name = nextText;
    if (/Service\s*No/i.test(text) && /^[A-Z0-9]{6,}$/.test(nextText)) bd.service_number = nextText;
    if (/\bERO\b/i.test(text) && nextText.length > 2) { bd.ero = nextText; bd.ero_name = nextText; }
    if (/Section/i.test(text) && nextText.length > 2) bd.section_name = nextText;
    if (/Energy\s*Charge/i.test(text)) bd.energy_charges = extractNumber(nextText);
    if (/Fixed\s*Charge/i.test(text)) bd.fixed_charges = extractNumber(nextText);
    if (/Units?\s*Consumed/i.test(text)) { const n = parseInt(nextText); if (!isNaN(n)) bd.units = n; }
    if (/Current\s*Month\s*Bill/i.test(text)) { bd.current_month_bill = extractNumber(nextText); bd.bill_amount = bd.current_month_bill; }
    if (/Total\s*Due/i.test(text) || /Total\s*Amount/i.test(text)) bd.total_due = extractNumber(nextText);
    if (/Arrears/i.test(text)) bd.arrears = extractNumber(nextText);
    if (/ACD/i.test(text)) bd.acd_amount = extractNumber(nextText);
  });

  return bd;
}

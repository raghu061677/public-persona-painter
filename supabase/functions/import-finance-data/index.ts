// supabase/functions/import-finance-data/index.ts
// v2.0 - Phase-3 Security: User-scoped + role enforcement + audit logging

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { corsHeaders } from '../_shared/cors.ts';
import {
  getAuthContext,
  requireRole,
  logSecurityAudit,
  supabaseServiceClient,
  jsonError,
  jsonSuccess,
  withAuth,
} from '../_shared/auth.ts';

Deno.serve(withAuth(async (req) => {
  const ctx = await getAuthContext(req);
  requireRole(ctx, ['admin', 'finance']);

  const body = await req.json().catch(() => null);
  if (!body || !Array.isArray(body.invoices) || !Array.isArray(body.items)) {
    return jsonError('Invalid data format. Expected arrays for invoices and items.', 400);
  }

  const { invoices, items } = body;
  console.log(`Processing ${invoices.length} invoices and ${items.length} items`);

  // Service client needed for upsert (RLS may block bulk import)
  const serviceClient = supabaseServiceClient();

  let invoicesCreated = 0;
  let itemsCreated = 0;
  const errors: string[] = [];

  for (const invoice of invoices) {
    try {
      const invoiceData: any = {
        id: invoice.id || invoice.invoice_id,
        client_id: invoice.client_id,
        client_name: invoice.client_name,
        company_id: ctx.companyId, // ALWAYS from auth context
        invoice_date: invoice.invoice_date,
        due_date: invoice.due_date || null,
        sub_total: parseFloat(invoice.sub_total || 0),
        gst_amount: parseFloat(invoice.gst_amount || 0),
        gst_percent: parseFloat(invoice.gst_percent || 18),
        total_amount: parseFloat(invoice.total_amount || 0),
        balance_due: parseFloat(invoice.balance_due || invoice.total_amount || 0),
        payment_status: invoice.payment_status || 'Pending',
        notes: invoice.notes || null,
        created_by: ctx.userId,
      };

      const { error: invoiceError } = await serviceClient
        .from('invoices')
        .upsert(invoiceData, { onConflict: 'id' });

      if (invoiceError) {
        errors.push(`Invoice ${invoiceData.id}: ${invoiceError.message}`);
      } else {
        invoicesCreated++;
      }
    } catch (err: any) {
      errors.push(`Invoice ${invoice.id || 'unknown'}: ${err.message}`);
    }
  }

  for (const item of items) {
    try {
      const { error: itemError } = await serviceClient
        .from('invoice_items')
        .insert({
          invoice_id: item.invoice_id,
          description: item.description || '',
          quantity: parseFloat(item.quantity || 1),
          rate: parseFloat(item.rate || 0),
          amount: parseFloat(item.amount || 0),
          gst_amount: item.gst_amount ? parseFloat(item.gst_amount) : null,
        });

      if (itemError) {
        errors.push(`Item for invoice ${item.invoice_id}: ${itemError.message}`);
      } else {
        itemsCreated++;
      }
    } catch (err: any) {
      errors.push(`Item for invoice ${item.invoice_id || 'unknown'}: ${err.message}`);
    }
  }

  await logSecurityAudit({
    functionName: 'import-finance-data', userId: ctx.userId,
    companyId: ctx.companyId, action: 'bulk_import',
    status: errors.length > 0 ? 'error' : 'success',
    metadata: { invoicesCreated, itemsCreated, errorCount: errors.length }, req,
  });

  return jsonSuccess({
    success: true,
    invoices_created: invoicesCreated,
    items_created: itemsCreated,
    errors: errors.length > 0 ? errors : undefined,
  });
}));

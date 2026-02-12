// supabase/functions/generate-invoice-pdf/index.ts
// v2.0 - Phase-3 Security: User-scoped client + role enforcement + audit logging

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

Deno.serve(withAuth(async (req) => {
  const ctx = await getAuthContext(req);
  requireRole(ctx, ['admin', 'finance']);

  const body = await req.json().catch(() => null);
  const invoiceId = body?.invoiceId;

  if (!invoiceId || typeof invoiceId !== 'string') {
    return jsonError('invoiceId is required', 400);
  }

  console.log('Generating PDF for invoice:', invoiceId);

  const userClient = supabaseUserClient(req);

  // Fetch invoice via RLS (ensures company isolation)
  const { data: invoice, error: invoiceError } = await userClient
    .from('invoices')
    .select(`
      *,
      clients!inner(name, gstin, billing_address_line1, billing_city, billing_state, billing_pincode)
    `)
    .eq('id', invoiceId)
    .single();

  if (invoiceError || !invoice) {
    return jsonError('Invoice not found', 404);
  }

  requireCompanyMatch(ctx, invoice.company_id);

  // Fetch company details
  const { data: company, error: companyError } = await userClient
    .from('companies')
    .select('*')
    .eq('id', invoice.company_id)
    .single();

  if (companyError || !company) {
    return jsonError('Company not found', 500);
  }

  // Generate PDF using Lovable AI PDF generation
  const pdfResponse = await fetch(`${Deno.env.get('LOVABLE_API_URL')}/generate-pdf`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${Deno.env.get('LOVABLE_API_KEY')}`,
    },
    body: JSON.stringify({
      template: 'invoice',
      data: {
        invoice: {
          id: invoice.id,
          date: new Date(invoice.invoice_date).toLocaleDateString('en-IN'),
          dueDate: new Date(invoice.due_date).toLocaleDateString('en-IN'),
          status: invoice.status,
        },
        company: {
          name: company.name,
          gstin: company.gstin,
          address: `${company.address_line1 || ''}, ${company.city || ''}, ${company.state || ''} ${company.pincode || ''}`.trim(),
          phone: company.phone,
          email: company.email,
        },
        client: {
          name: invoice.clients.name,
          gstin: invoice.clients.gstin,
          address: `${invoice.clients.billing_address_line1 || ''}, ${invoice.clients.billing_city || ''}, ${invoice.clients.billing_state || ''} ${invoice.clients.billing_pincode || ''}`.trim(),
        },
        items: invoice.items || [],
        summary: {
          subTotal: invoice.sub_total,
          gstAmount: invoice.gst_amount,
          gstPercent: invoice.gst_percent,
          totalAmount: invoice.total_amount,
          balanceDue: invoice.balance_due,
        },
        notes: invoice.notes,
      },
    }),
  });

  if (!pdfResponse.ok) {
    return jsonError('Failed to generate PDF', 500);
  }

  const pdfBlob = await pdfResponse.blob();
  const pdfBuffer = await pdfBlob.arrayBuffer();

  // Upload to storage using service client (storage policies may differ)
  const serviceClient = supabaseServiceClient();
  const fileName = `invoice-${invoice.id}-${Date.now()}.pdf`;
  const { error: uploadError } = await serviceClient.storage
    .from('client-documents')
    .upload(fileName, pdfBuffer, { contentType: 'application/pdf', upsert: false });

  if (uploadError) {
    return jsonError(`Storage upload failed: ${uploadError.message}`, 500);
  }

  const { data: urlData } = await serviceClient.storage
    .from('client-documents')
    .createSignedUrl(fileName, 3600);

  await logSecurityAudit({
    functionName: 'generate-invoice-pdf', userId: ctx.userId,
    companyId: ctx.companyId, action: 'generate_pdf',
    recordIds: [invoiceId], req,
  });

  return jsonSuccess({ success: true, url: urlData?.signedUrl, fileName });
}));

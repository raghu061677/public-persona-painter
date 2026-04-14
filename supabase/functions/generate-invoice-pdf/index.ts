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

  // --- Phase 4D: Registration-aware address resolution ---
  // Helper to safely format JSONB address snapshots
  function formatSnapshotAddr(snapshot: any): { line1: string; line2: string; city: string; state: string; pincode: string } {
    if (!snapshot || typeof snapshot !== 'object') return { line1: '', line2: '', city: '', state: '', pincode: '' };
    return {
      line1: snapshot.line1 || '',
      line2: snapshot.line2 || '',
      city: [snapshot.city, snapshot.district].filter(Boolean).join(', '),
      state: snapshot.state || '',
      pincode: snapshot.pincode || '',
    };
  }

  const hasRegSnapshot = !!(invoice.registration_gstin_snapshot ||
    (invoice.registration_billing_address_snapshot && typeof invoice.registration_billing_address_snapshot === 'object' && Object.keys(invoice.registration_billing_address_snapshot).length > 0));

  let clientName: string;
  let clientGstin: string;
  let clientAddress: string;
  let shipToAddress: string;
  let placeOfSupply: string;

  if (hasRegSnapshot) {
    const regBilling = formatSnapshotAddr(invoice.registration_billing_address_snapshot);
    const regShipping = formatSnapshotAddr(invoice.registration_shipping_address_snapshot);
    clientName = invoice.registration_label_snapshot || invoice.clients.name;
    clientGstin = invoice.registration_gstin_snapshot || invoice.clients.gstin || '';
    clientAddress = [
      regBilling.line1 || invoice.clients.billing_address_line1 || '',
      regBilling.line2 || '',
      [regBilling.city || invoice.clients.billing_city || '', regBilling.state || invoice.registration_state_snapshot || invoice.clients.billing_state || ''].filter(Boolean).join(', '),
      regBilling.pincode || invoice.clients.billing_pincode || '',
    ].filter(Boolean).join(', ').trim();
    // Ship To: prefer registration shipping snapshot, fallback to billing
    const hasShipping = !!(regShipping.line1 || regShipping.city);
    shipToAddress = hasShipping
      ? [regShipping.line1, regShipping.line2, [regShipping.city, regShipping.state].filter(Boolean).join(', '), regShipping.pincode].filter(Boolean).join(', ').trim()
      : clientAddress;
    placeOfSupply = invoice.place_of_supply || invoice.registration_state_snapshot || invoice.clients.billing_state || '';
  } else {
    clientName = invoice.clients.name;
    clientGstin = invoice.clients.gstin || '';
    clientAddress = `${invoice.clients.billing_address_line1 || ''}, ${invoice.clients.billing_city || ''}, ${invoice.clients.billing_state || ''} ${invoice.clients.billing_pincode || ''}`.trim();
    shipToAddress = clientAddress;
    placeOfSupply = invoice.place_of_supply || invoice.clients.billing_state || '';
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
          name: clientName,
          gstin: clientGstin,
          address: clientAddress,
        },
        shipTo: {
          name: clientName,
          address: shipToAddress,
        },
        placeOfSupply,
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

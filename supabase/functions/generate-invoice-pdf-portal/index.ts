// supabase/functions/generate-invoice-pdf-portal/index.ts
// v2.0 - Phase-3 Security: Public portal endpoint but with strict validation
// This is a PUBLIC endpoint (verify_jwt = false) for client portal access.
// Security: validates invoice exists and uses sanitized output only.

import { corsHeaders } from '../_shared/cors.ts';
import { supabaseServiceClient, jsonError, jsonSuccess, logSecurityAudit } from '../_shared/auth.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json().catch(() => null);
    const invoice_id = body?.invoice_id;

    if (!invoice_id || typeof invoice_id !== 'string') {
      return jsonError('Invoice ID is required', 400);
    }

    // Validate invoice_id format (basic injection prevention)
    if (!/^[A-Za-z0-9\-]+$/.test(invoice_id)) {
      return jsonError('Invalid invoice ID format', 400);
    }

    const supabase = supabaseServiceClient();

    // Fetch invoice data
    const { data: invoice, error: invoiceError } = await supabase
      .from('invoices')
      .select(`
        id, invoice_date, due_date, status, client_name,
        sub_total, gst_amount, gst_percent, total_amount, balance_due,
        items, notes, company_id,
        clients (
          name, billing_address_line1, billing_city, billing_state,
          billing_pincode, gst_number
        )
      `)
      .eq('id', invoice_id)
      .single();

    if (invoiceError || !invoice) {
      return jsonError('Invoice not found', 404);
    }

    // Fetch company details (sanitized - no internal fields)
    const { data: company } = await supabase
      .from('companies')
      .select('name, gstin, address_line1, city, state, phone, email, logo_url')
      .eq('id', invoice.company_id)
      .single();

    // Generate sanitized PDF HTML (no internal costs, vendor details, etc.)
    const pdfHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <style>
            body { font-family: Arial, sans-serif; padding: 40px; }
            .header { text-align: center; margin-bottom: 30px; }
            .logo { max-width: 150px; margin-bottom: 20px; }
            .invoice-title { font-size: 28px; font-weight: bold; color: #1e40af; }
            .company-info, .client-info { margin: 20px 0; }
            .info-label { font-weight: bold; color: #666; }
            table { width: 100%; border-collapse: collapse; margin: 30px 0; }
            th, td { padding: 12px; text-align: left; border-bottom: 1px solid #ddd; }
            th { background-color: #f8f9fa; font-weight: bold; }
            .totals { text-align: right; margin-top: 20px; }
            .total-row { font-size: 18px; font-weight: bold; color: #1e40af; }
            .footer { margin-top: 50px; text-align: center; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="header">
            ${company?.logo_url ? `<img src="${company.logo_url}" alt="Logo" class="logo">` : ''}
            <div class="invoice-title">TAX INVOICE</div>
            <div>Invoice #${invoice.id}</div>
          </div>
          <div style="display: flex; justify-content: space-between;">
            <div class="company-info">
              <div class="info-label">From:</div>
              <div><strong>${company?.name || 'Company'}</strong></div>
              <div>${company?.address_line1 || ''}</div>
              <div>${company?.city || ''}, ${company?.state || ''}</div>
              <div>GSTIN: ${company?.gstin || 'N/A'}</div>
            </div>
            <div class="client-info">
              <div class="info-label">To:</div>
              <div><strong>${invoice.clients?.name || invoice.client_name}</strong></div>
              <div>${invoice.clients?.billing_address_line1 || ''}</div>
              <div>${invoice.clients?.billing_city || ''}, ${invoice.clients?.billing_state || ''}</div>
              <div>GSTIN: ${invoice.clients?.gst_number || 'N/A'}</div>
            </div>
          </div>
          <div style="margin: 30px 0;">
            <div><strong>Invoice Date:</strong> ${new Date(invoice.invoice_date).toLocaleDateString('en-IN')}</div>
            <div><strong>Due Date:</strong> ${new Date(invoice.due_date).toLocaleDateString('en-IN')}</div>
            <div><strong>Status:</strong> ${invoice.status}</div>
          </div>
          <table>
            <thead><tr><th>Description</th><th style="text-align: right;">Amount</th></tr></thead>
            <tbody>
              ${(invoice.items || []).map((item: any) => `
                <tr>
                  <td>${item.description || item.name || ''}</td>
                  <td style="text-align: right;">₹${(item.amount || 0).toLocaleString('en-IN')}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          <div class="totals">
            <div><strong>Sub Total:</strong> ₹${(invoice.sub_total || 0).toLocaleString('en-IN')}</div>
            <div><strong>GST (${invoice.gst_percent}%):</strong> ₹${(invoice.gst_amount || 0).toLocaleString('en-IN')}</div>
            <div class="total-row"><strong>Grand Total:</strong> ₹${(invoice.total_amount || 0).toLocaleString('en-IN')}</div>
            ${(invoice.balance_due || 0) > 0 ? `<div style="color: #ef4444; margin-top: 10px;"><strong>Balance Due:</strong> ₹${invoice.balance_due.toLocaleString('en-IN')}</div>` : ''}
          </div>
          ${invoice.notes ? `<div style="margin-top: 30px;"><strong>Notes:</strong><br>${invoice.notes}</div>` : ''}
          <div class="footer">
            <div>Thank you for your business!</div>
            <div>Generated via Go-Ads 360° | ${new Date().toLocaleDateString('en-IN')}</div>
          </div>
        </body>
      </html>
    `;

    await logSecurityAudit({
      functionName: 'generate-invoice-pdf-portal',
      action: 'portal_pdf_view',
      recordIds: [invoice_id],
      metadata: { portal: true },
    });

    return jsonSuccess({ success: true, html: pdfHtml, invoice_id: invoice.id });
  } catch (error) {
    console.error('Error generating portal invoice PDF:', error);
    return jsonError(error instanceof Error ? error.message : 'Failed to generate PDF', 500);
  }
});

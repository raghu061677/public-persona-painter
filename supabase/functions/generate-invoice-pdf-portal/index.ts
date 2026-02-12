// supabase/functions/generate-invoice-pdf-portal/index.ts
// v3.0 - Phase-3.1 Security: Share token validation (no direct invoice_id access)
// PUBLIC endpoint (verify_jwt = false) — secured via unguessable share tokens.

import { corsHeaders } from '../_shared/cors.ts';
import { supabaseServiceClient, jsonError, jsonSuccess, logSecurityAudit } from '../_shared/auth.ts';

// Simple in-memory rate limiter per IP
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_WINDOW_MS = 60_000; // 1 minute
const RATE_LIMIT_MAX = 10; // 10 requests per minute per IP

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return true;
  }
  entry.count++;
  return entry.count <= RATE_LIMIT_MAX;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const clientIp = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';

    // Rate limit check
    if (!checkRateLimit(clientIp)) {
      return jsonError('Too many requests. Please try again later.', 429);
    }

    const body = await req.json().catch(() => null);
    const share_token = body?.share_token;

    if (!share_token || typeof share_token !== 'string') {
      return jsonError('Share token is required', 400);
    }

    // Validate token format (hex string, 64 chars = 32 bytes)
    if (!/^[a-f0-9]{64}$/i.test(share_token)) {
      return jsonError('Invalid token format', 400);
    }

    const supabase = supabaseServiceClient();

    // Validate share token: exists, not revoked, not expired
    const { data: tokenRecord, error: tokenError } = await supabase
      .from('invoice_share_tokens')
      .select('invoice_id, company_id, is_revoked, expires_at, max_uses, use_count')
      .eq('token', share_token)
      .single();

    if (tokenError || !tokenRecord) {
      await logSecurityAudit({
        functionName: 'generate-invoice-pdf-portal',
        action: 'portal_pdf_invalid_token',
        status: 'denied',
        metadata: { ip: clientIp, token_prefix: share_token.substring(0, 8) },
      });
      return jsonError('Invalid or expired share link', 403);
    }

    if (tokenRecord.is_revoked) {
      await logSecurityAudit({
        functionName: 'generate-invoice-pdf-portal',
        action: 'portal_pdf_revoked_token',
        status: 'denied',
        metadata: { ip: clientIp, invoice_id: tokenRecord.invoice_id },
      });
      return jsonError('This share link has been revoked', 403);
    }

    if (new Date(tokenRecord.expires_at) < new Date()) {
      await logSecurityAudit({
        functionName: 'generate-invoice-pdf-portal',
        action: 'portal_pdf_expired_token',
        status: 'denied',
        metadata: { ip: clientIp, invoice_id: tokenRecord.invoice_id },
      });
      return jsonError('This share link has expired', 403);
    }

    if (tokenRecord.max_uses && tokenRecord.use_count >= tokenRecord.max_uses) {
      return jsonError('This share link has reached its usage limit', 403);
    }

    // Increment use count
    await supabase
      .from('invoice_share_tokens')
      .update({ use_count: (tokenRecord.use_count || 0) + 1 })
      .eq('token', share_token);

    // Fetch invoice — scoped to the token's company_id (prevents cross-company)
    const { data: invoice, error: invoiceError } = await supabase
      .from('invoices')
      .select(`
        id, invoice_date, due_date, status, client_name,
        sub_total, total_amount, balance_due,
        items, notes, company_id,
        clients (
          name, billing_address_line1, billing_city, billing_state,
          billing_pincode, gst_number
        )
      `)
      .eq('id', tokenRecord.invoice_id)
      .eq('company_id', tokenRecord.company_id) // Cross-company protection
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

    // SANITIZED output: No GST breakup, no payment method/reference, no bank details
    // Only show: items with description+amount, sub_total, total_amount, balance_due
    const sanitizedItems = (invoice.items || []).map((item: any) => ({
      description: item.description || item.name || '',
      amount: item.amount || item.total || 0,
    }));

    const pdfHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <style>
            body { font-family: Arial, sans-serif; padding: 40px; color: #333; }
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
            <thead><tr><th>Description</th><th style="text-align: right;">Amount (₹)</th></tr></thead>
            <tbody>
              ${sanitizedItems.map((item: any) => `
                <tr>
                  <td>${item.description}</td>
                  <td style="text-align: right;">₹${(item.amount || 0).toLocaleString('en-IN')}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          <div class="totals">
            <div><strong>Sub Total:</strong> ₹${(invoice.sub_total || 0).toLocaleString('en-IN')}</div>
            <div class="total-row"><strong>Total Amount:</strong> ₹${(invoice.total_amount || 0).toLocaleString('en-IN')}</div>
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
      action: 'portal_pdf_access',
      recordIds: [tokenRecord.invoice_id],
      metadata: { ip: clientIp, token_prefix: share_token.substring(0, 8) },
    });

    return jsonSuccess({ success: true, html: pdfHtml, invoice_id: invoice.id });
  } catch (error) {
    console.error('Error generating portal invoice PDF:', error);
    return jsonError(error instanceof Error ? error.message : 'Failed to generate PDF', 500);
  }
});

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { invoice_id } = await req.json();

    if (!invoice_id) {
      throw new Error('Invoice ID is required');
    }

    // Fetch invoice data
    const { data: invoice, error: invoiceError } = await supabaseClient
      .from('invoices')
      .select(`
        *,
        clients (
          name,
          billing_address_line1,
          billing_city,
          billing_state,
          billing_pincode,
          gst_number
        )
      `)
      .eq('id', invoice_id)
      .single();

    if (invoiceError || !invoice) {
      throw new Error('Invoice not found');
    }

    // Fetch company details
    const { data: company } = await supabaseClient
      .from('companies')
      .select('name, gstin, address_line1, city, state, phone, email, logo_url')
      .eq('id', invoice.company_id)
      .single();

    // Generate PDF content (simplified HTML for now)
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
              <div>Phone: ${company?.phone || ''}</div>
              <div>Email: ${company?.email || ''}</div>
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
            <div><strong>Status:</strong> ${invoice.status.toUpperCase()}</div>
          </div>

          <table>
            <thead>
              <tr>
                <th>Description</th>
                <th style="text-align: right;">Amount</th>
              </tr>
            </thead>
            <tbody>
              ${(invoice.items || []).map((item: any) => `
                <tr>
                  <td>${item.description || item.name}</td>
                  <td style="text-align: right;">₹${(item.amount || 0).toLocaleString('en-IN')}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>

          <div class="totals">
            <div><strong>Sub Total:</strong> ₹${invoice.sub_total.toLocaleString('en-IN')}</div>
            <div><strong>GST (${invoice.gst_percent}%):</strong> ₹${invoice.gst_amount.toLocaleString('en-IN')}</div>
            <div class="total-row"><strong>Grand Total:</strong> ₹${invoice.total_amount.toLocaleString('en-IN')}</div>
            ${invoice.balance_due > 0 ? `<div style="color: #ef4444; margin-top: 10px;"><strong>Balance Due:</strong> ₹${invoice.balance_due.toLocaleString('en-IN')}</div>` : ''}
          </div>

          ${invoice.notes ? `<div style="margin-top: 30px;"><strong>Notes:</strong><br>${invoice.notes}</div>` : ''}

          <div class="footer">
            <div>Thank you for your business!</div>
            <div>Generated via Go-Ads 360° | ${new Date().toLocaleDateString('en-IN')}</div>
          </div>
        </body>
      </html>
    `;

    // In a production environment, you would use a library like puppeteer or jsPDF
    // For now, we'll return the HTML and let the client handle PDF generation
    // or you can use a service like PDFShift, DocRaptor, etc.

    return new Response(
      JSON.stringify({
        success: true,
        html: pdfHtml,
        invoice_id: invoice.id,
        // In production: pdf_url would be a presigned URL from storage
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'An error occurred';
    console.error('Error generating invoice PDF:', error);
    
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});

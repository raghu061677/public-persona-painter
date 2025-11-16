import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RequestBody {
  invoiceId: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { invoiceId } = await req.json() as RequestBody;

    console.log('Generating PDF for invoice:', invoiceId);

    // Fetch invoice with related data
    const { data: invoice, error: invoiceError } = await supabase
      .from('invoices')
      .select(`
        *,
        clients!inner(name, gstin, billing_address_line1, billing_city, billing_state, billing_pincode)
      `)
      .eq('id', invoiceId)
      .single();

    if (invoiceError || !invoice) {
      throw new Error('Invoice not found');
    }

    // Fetch company details
    const { data: company, error: companyError } = await supabase
      .from('companies')
      .select('*')
      .eq('id', invoice.company_id)
      .single();

    if (companyError) {
      throw new Error('Company not found');
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
      throw new Error('Failed to generate PDF');
    }

    const pdfBlob = await pdfResponse.blob();
    const pdfBuffer = await pdfBlob.arrayBuffer();

    // Upload to storage
    const fileName = `invoice-${invoice.id}-${Date.now()}.pdf`;
    const { error: uploadError } = await supabase.storage
      .from('client-documents')
      .upload(fileName, pdfBuffer, {
        contentType: 'application/pdf',
        upsert: false,
      });

    if (uploadError) {
      throw uploadError;
    }

    // Get signed URL
    const { data: urlData } = await supabase.storage
      .from('client-documents')
      .createSignedUrl(fileName, 3600); // 1 hour expiry

    console.log('PDF generated successfully:', fileName);

    return new Response(
      JSON.stringify({
        success: true,
        url: urlData?.signedUrl,
        fileName,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error generating invoice PDF:', error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Failed to generate PDF',
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

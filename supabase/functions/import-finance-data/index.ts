import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface InvoiceRecord {
  id: string;
  client_id: string;
  client_name: string;
  invoice_date: string;
  due_date?: string;
  sub_total: number;
  gst_amount: number;
  gst_percent: number;
  total_amount: number;
  balance_due: number;
  payment_status: string;
  notes?: string;
}

interface InvoiceItemRecord {
  invoice_id: string;
  description: string;
  quantity: number;
  rate: number;
  amount: number;
  gst_amount?: number;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    const { invoices, items } = await req.json();

    if (!Array.isArray(invoices) || !Array.isArray(items)) {
      throw new Error('Invalid data format. Expected arrays for invoices and items.');
    }

    console.log(`Processing ${invoices.length} invoices and ${items.length} items`);

    let invoicesCreated = 0;
    let itemsCreated = 0;
    const errors: string[] = [];

    // Get auth user for created_by field
    const authHeader = req.headers.get('Authorization');
    let userId: string | null = null;

    if (authHeader) {
      const token = authHeader.replace('Bearer ', '');
      const { data: { user } } = await supabaseClient.auth.getUser(token);
      userId = user?.id || null;
    }

    // Process invoices
    for (const invoice of invoices) {
      try {
        const invoiceData: any = {
          id: invoice.id || invoice.invoice_id,
          client_id: invoice.client_id,
          client_name: invoice.client_name,
          invoice_date: invoice.invoice_date,
          due_date: invoice.due_date || null,
          sub_total: parseFloat(invoice.sub_total || 0),
          gst_amount: parseFloat(invoice.gst_amount || 0),
          gst_percent: parseFloat(invoice.gst_percent || 18),
          total_amount: parseFloat(invoice.total_amount || 0),
          balance_due: parseFloat(invoice.balance_due || invoice.total_amount || 0),
          payment_status: invoice.payment_status || 'Pending',
          notes: invoice.notes || null,
        };

        if (userId) {
          invoiceData.created_by = userId;
        }

        const { error: invoiceError } = await supabaseClient
          .from('invoices')
          .upsert(invoiceData, { onConflict: 'id' });

        if (invoiceError) {
          errors.push(`Invoice ${invoiceData.id}: ${invoiceError.message}`);
          console.error('Invoice insert error:', invoiceError);
        } else {
          invoicesCreated++;
        }
      } catch (err: any) {
        errors.push(`Invoice ${invoice.id || 'unknown'}: ${err.message}`);
        console.error('Invoice processing error:', err);
      }
    }

    // Process invoice items
    for (const item of items) {
      try {
        const itemData = {
          invoice_id: item.invoice_id,
          description: item.description || '',
          quantity: parseFloat(item.quantity || 1),
          rate: parseFloat(item.rate || 0),
          amount: parseFloat(item.amount || 0),
          gst_amount: item.gst_amount ? parseFloat(item.gst_amount) : null,
        };

        const { error: itemError } = await supabaseClient
          .from('invoice_items')
          .insert(itemData);

        if (itemError) {
          errors.push(`Item for invoice ${itemData.invoice_id}: ${itemError.message}`);
          console.error('Item insert error:', itemError);
        } else {
          itemsCreated++;
        }
      } catch (err: any) {
        errors.push(`Item for invoice ${item.invoice_id || 'unknown'}: ${err.message}`);
        console.error('Item processing error:', err);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        invoices_created: invoicesCreated,
        items_created: itemsCreated,
        errors: errors.length > 0 ? errors : undefined,
      }),
      { 
        headers: { 
          ...corsHeaders,
          'Content-Type': 'application/json' 
        },
        status: 200 
      }
    );

  } catch (error: any) {
    console.error('Import error:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message || 'An unexpected error occurred',
        details: error.toString()
      }),
      { 
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        },
        status: 500
      }
    );
  }
});

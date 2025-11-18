import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.76.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { service_no, bill_month, amount, bill_id, asset_id } = await req.json();

    if (!service_no || !bill_month || !amount || !bill_id) {
      throw new Error("Missing required parameters");
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // For now, we'll create a placeholder receipt URL
    // In production, you would use Puppeteer/Playwright to capture the actual receipt
    // This requires a more complex setup with browser automation
    
    // Generate a mock receipt URL (in production, this would be the actual screenshot)
    const receiptFileName = `receipts/${service_no}-${bill_month}.txt`;
    const receiptContent = `
TGSPDCL Payment Receipt
=======================
Service Number: ${service_no}
Bill Month: ${bill_month}
Amount Paid: ₹${amount}
Payment Date: ${new Date().toISOString()}

This is a placeholder receipt.
In production, this would be replaced with an actual screenshot
from the TGSPDCL payment portal using browser automation.
    `.trim();

    // Upload placeholder receipt to storage
    const { error: uploadError } = await supabase.storage
      .from('campaign-photos')
      .upload(receiptFileName, receiptContent, { 
        contentType: 'text/plain', 
        upsert: true 
      });

    if (uploadError) throw uploadError;

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('campaign-photos')
      .getPublicUrl(receiptFileName);

    // Update power bill as paid
    const { error: billUpdateError } = await supabase
      .from('asset_power_bills')
      .update({
        paid: true,
        payment_status: 'Paid',
        payment_date: new Date().toISOString().split('T')[0],
        paid_amount: amount,
        paid_receipt_url: publicUrl
      })
      .eq('id', bill_id);

    if (billUpdateError) throw billUpdateError;

    // Create expense record
    const { data: expenseData, error: expenseError } = await supabase
      .from('expenses')
      .insert({
        category: 'Electricity',
        vendor_name: 'TGSPDCL',
        amount: amount,
        gst_percent: 0,
        gst_amount: 0,
        total_amount: amount,
        payment_status: 'Paid',
        paid_date: new Date().toISOString().split('T')[0],
        notes: `Power bill payment for Service ${service_no}, ${bill_month}`,
        invoice_url: publicUrl,
        bill_id: bill_id,
        bill_month: bill_month,
        campaign_id: asset_id // Link to asset through campaign_id field
      })
      .select()
      .single();

    if (expenseError) throw expenseError;

    return new Response(
      JSON.stringify({ 
        status: 'success', 
        receipt: publicUrl,
        expense_id: expenseData.id,
        message: 'Payment recorded successfully. Receipt saved and expense created.'
      }), 
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error: any) {
    console.error('Error processing payment:', error);
    return new Response(
      JSON.stringify({ 
        status: 'error', 
        message: error.message 
      }), 
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});

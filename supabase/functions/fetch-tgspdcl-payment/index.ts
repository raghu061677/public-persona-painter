import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { uniqueServiceNumber, serviceNumber, assetId, billMonth } = await req.json();

    console.log('Fetching bill for:', { uniqueServiceNumber, assetId, billMonth });

    if (!uniqueServiceNumber || !assetId) {
      return new Response(
        JSON.stringify({ 
          success: false,
          error: "uniqueServiceNumber and assetId are required" 
        }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Fetch the TGSPDCL bill page
    const formData = new URLSearchParams({
      uniqueServiceNumber: uniqueServiceNumber,
      serviceNumber: serviceNumber || '',
      verifyCaptcha: 'no',
    });

    console.log('Calling TGSPDCL API with:', formData.toString());

    const tgspdclResponse = await fetch(
      "https://tgsouthernpower.org/paybillonline",
      {
        method: "POST",
        body: formData,
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          "User-Agent": "Mozilla/5.0",
        },
      }
    );

    if (!tgspdclResponse.ok) {
      console.error('TGSPDCL API error:', tgspdclResponse.status);
      return new Response(
        JSON.stringify({ 
          success: false,
          error: `TGSPDCL API error: ${tgspdclResponse.statusText}` 
        }),
        { 
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    const html = await tgspdclResponse.text();
    console.log('Received HTML response, length:', html.length);

    // Parse HTML to extract bill details
    const billData = parseHTMLBillDetails(html);

    if (!billData) {
      console.error('Failed to parse bill details from HTML');
      return new Response(
        JSON.stringify({ 
          success: false,
          error: "Could not parse bill details from TGSPDCL response. The bill might not be available or the format has changed." 
        }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    console.log('Parsed bill data:', billData);

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Prepare bill record
    const billRecord = {
      asset_id: assetId,
      bill_month: billMonth || billData.bill_date?.substring(0, 7), // YYYY-MM format
      bill_date: billData.bill_date,
      due_date: billData.due_date,
      units: billData.units,
      energy_charges: billData.energy_charges,
      fixed_charges: billData.fixed_charges,
      acd_amount: billData.customer_charges || 0,
      arrears: billData.arrears || 0,
      current_month_bill: billData.net_amount,
      total_due: billData.total_due,
      bill_amount: billData.total_due,
      payment_status: billData.payment_status?.toLowerCase().includes('paid') ? 'Paid' : 'Pending',
      payment_reference: billData.payment_reference,
      paid_receipt_url: billData.receipt_url,
      paid: billData.payment_status?.toLowerCase().includes('paid') || false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    console.log('Inserting bill record:', billRecord);

    // Insert into database
    const { data, error } = await supabase
      .from('asset_power_bills')
      .insert(billRecord)
      .select()
      .single();

    if (error) {
      console.error('Database insert error:', error);
      return new Response(
        JSON.stringify({ 
          success: false,
          error: `Failed to save bill: ${error.message}` 
        }),
        { 
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    console.log('Bill saved successfully:', data);

    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'Bill fetched and saved successfully',
        billData: data
      }),
      { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('Function error:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
    return new Response(
      JSON.stringify({ 
        success: false,
        error: errorMessage
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});

// Helper function to parse HTML and extract bill details
function parseHTMLBillDetails(html: string) {
  try {
    // Extract values using regex patterns
    const extractValue = (pattern: RegExp): string | null => {
      const match = html.match(pattern);
      return match ? match[1].trim() : null;
    };

    const extractNumber = (pattern: RegExp): number | null => {
      const value = extractValue(pattern);
      if (!value) return null;
      // Remove currency symbols, commas, and extract number
      const cleaned = value.replace(/[₹,\s]/g, '');
      const num = parseFloat(cleaned);
      return isNaN(num) ? null : num;
    };

    // Extract bill date
    const billDate = extractValue(/Bill\s+Date[:\s]*<\/td>\s*<td[^>]*>([\d\-\/]+)/i);
    
    // Extract due date
    const dueDate = extractValue(/Due\s+Date[:\s]*<\/td>\s*<td[^>]*>([\d\-\/]+)/i);
    
    // Extract units
    const unitsMatch = extractValue(/Units[:\s]*<\/td>\s*<td[^>]*>([\d\.]+)/i);
    const units = unitsMatch ? parseFloat(unitsMatch) : null;
    
    // Extract various charges
    const energyCharges = extractNumber(/Energy\s+Charges[:\s]*<\/td>\s*<td[^>]*>([₹\d\.,\s]+)/i);
    const fixedCharges = extractNumber(/Fixed\s+Charges[:\s]*<\/td>\s*<td[^>]*>([₹\d\.,\s]+)/i);
    const customerCharges = extractNumber(/Customer\s+Charges[:\s]*<\/td>\s*<td[^>]*>([₹\d\.,\s]+)/i);
    const arrears = extractNumber(/Arrears[:\s]*<\/td>\s*<td[^>]*>([₹\d\.,\s-]+)/i) || 0;
    const netAmount = extractNumber(/Net\s+Amount[:\s]*<\/td>\s*<td[^>]*>([₹\d\.,\s]+)/i);
    const totalDue = extractNumber(/Total\s+Amount.*?Payable[:\s]*<\/td>\s*<td[^>]*>([₹\d\.,\s]+)/i);
    
    // Extract payment status
    const paymentStatus = extractValue(/Payment\s+Status[:\s]*<\/td>\s*<td[^>]*>([^<]+)/i);
    
    // Extract payment reference
    const paymentReference = extractValue(/Payment\s+Reference[:\s]*<\/td>\s*<td[^>]*>([^<]+)/i);
    
    // Extract receipt URL if available
    const receiptUrlMatch = html.match(/href\s*=\s*["']([^"']*receipt[^"']*)["']/i);
    const receiptUrl = receiptUrlMatch ? receiptUrlMatch[1] : null;

    // Check if we got at least some data
    if (!billDate && !totalDue) {
      console.log('No bill data found in HTML');
      return null;
    }

    return {
      bill_date: billDate,
      due_date: dueDate,
      units: units,
      energy_charges: energyCharges,
      fixed_charges: fixedCharges,
      customer_charges: customerCharges,
      arrears: arrears,
      net_amount: netAmount,
      total_due: totalDue || netAmount, // Fallback to net_amount if total_due not found
      payment_status: paymentStatus,
      payment_reference: paymentReference,
      receipt_url: receiptUrl,
    };
  } catch (error) {
    console.error('Error parsing HTML:', error);
    return null;
  }
}

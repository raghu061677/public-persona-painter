import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.76.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface BillData {
  consumer_name: string;
  service_number: string;
  unique_service_number?: string;
  section_name?: string;
  ero?: string;
  bill_amount: number;
  bill_month: string;
  due_date?: string;
  status: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { uniqueServiceNumber, assetId } = await req.json();

    if (!uniqueServiceNumber) {
      throw new Error('Unique service number is required');
    }

    console.log('Fetching TGSPDCL bill for unique service number:', uniqueServiceNumber);

    // Attempt to fetch bill data from TGSPDCL portal
    const { billData, error: fetchError } = await fetchBillFromTGSPDCL(uniqueServiceNumber);

    if (!billData) {
      console.error('TGSPDCL API Error:', fetchError);
      // Return mock data for testing purposes
      const mockBillData: BillData = {
        consumer_name: 'Test Consumer',
        service_number: uniqueServiceNumber.substring(0, 10),
        unique_service_number: uniqueServiceNumber,
        section_name: 'Test Section',
        ero: 'Test ERO',
        bill_amount: 0,
        bill_month: new Date().toISOString().slice(0, 7),
        status: 'Unavailable',
      };
      
      return new Response(
        JSON.stringify({
          success: true,
          data: mockBillData,
          message: 'Using test data - TGSPDCL API is currently unavailable',
          payment_url: `https://www.tssouthernpower.com/OnlineBill/QuickPay?uniqueServiceNo=${uniqueServiceNumber}`
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      );
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Store bill data in database if assetId is provided
    if (assetId) {
      const billMonth = new Date().toISOString().slice(0, 7) + '-01'; // Current month
      
      const { error: insertError } = await supabase
        .from('asset_power_bills')
        .upsert({
          asset_id: assetId,
          service_number: billData.service_number,
          unique_service_number: billData.unique_service_number,
          consumer_name: billData.consumer_name,
          section_name: billData.section_name,
          ero: billData.ero,
          bill_amount: billData.bill_amount,
          bill_month: billMonth,
          payment_status: billData.status,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'asset_id,bill_month'
        });

      if (insertError) {
        console.error('Error storing bill data:', insertError);
        throw insertError;
      }

      console.log('Bill data stored successfully');
    }

      return new Response(
        JSON.stringify({
          success: true,
          data: billData,
          payment_url: `https://www.tssouthernpower.com/OnlineBill/QuickPay?uniqueServiceNo=${uniqueServiceNumber}`
        }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Error fetching TGSPDCL bill:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to fetch bill data';
    return new Response(
      JSON.stringify({
        success: false,
        error: errorMessage
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});

async function fetchBillFromTGSPDCL(uniqueServiceNumber: string): Promise<{ billData: BillData | null; error?: string }> {
  try {
    // Primary method: Try the enquiry page with unique service number
    const url = `https://www.tssouthernpower.com/OnlineBill/QuickPay?uniqueServiceNo=${uniqueServiceNumber}`;
    
    console.log('Attempting to fetch from TGSPDCL:', url);
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
    });

    console.log('TGSPDCL response status:', response.status);

    if (!response.ok) {
      return { 
        billData: null, 
        error: `TGSPDCL API returned status ${response.status}. The service may be temporarily unavailable or the service number may be invalid.` 
      };
    }

    const html = await response.text();
    console.log('Received HTML response, parsing...');
    
    // Parse HTML to extract bill details
    const billData = parseHTMLForBillData(html, uniqueServiceNumber);
    
    return { billData };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error fetching from TGSPDCL:', errorMessage);
    
    return { 
      billData: null, 
      error: `Failed to connect to TGSPDCL: ${errorMessage}` 
    };
  }
}

function parseHTMLForBillData(html: string, uniqueServiceNumber: string): BillData {
  // Basic HTML parsing
  // This is a simplified version - adjust regex patterns based on actual TGSPDCL HTML structure
  
  const consumerNameMatch = html.match(/Consumer Name[:\s]*([^<\n]+)/i);
  const billAmountMatch = html.match(/Bill Amount[:\s]*₹?\s*([\d,]+\.?\d*)/i);
  const dueDateMatch = html.match(/Due Date[:\s]*(\d{2}[-\/]\d{2}[-\/]\d{4})/i);
  const sectionMatch = html.match(/Section[:\s]*([^<\n]+)/i);
  const eroMatch = html.match(/ERO[:\s]*([^<\n]+)/i);
  const statusMatch = html.match(/Status[:\s]*([^<\n]+)/i);
  const serviceNoMatch = html.match(/Service No[:\s]*([^<\n]+)/i);

  return {
    consumer_name: consumerNameMatch ? consumerNameMatch[1].trim() : 'Unknown',
    service_number: serviceNoMatch ? serviceNoMatch[1].trim() : uniqueServiceNumber.substring(0, 10),
    unique_service_number: uniqueServiceNumber,
    section_name: sectionMatch ? sectionMatch[1].trim() : undefined,
    ero: eroMatch ? eroMatch[1].trim() : undefined,
    bill_amount: billAmountMatch ? parseFloat(billAmountMatch[1].replace(/,/g, '')) : 0,
    bill_month: new Date().toISOString().slice(0, 7),
    due_date: dueDateMatch ? dueDateMatch[1] : undefined,
    status: statusMatch ? statusMatch[1].trim() : 'Pending',
  };
}

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
    const { serviceNumber, assetId } = await req.json();

    if (!serviceNumber) {
      throw new Error('Service number is required');
    }

    console.log('Fetching TGSPDCL bill for service number:', serviceNumber);

    // Attempt to fetch bill data from TGSPDCL portal
    const billData = await fetchBillFromTGSPDCL(serviceNumber);

    if (!billData) {
      throw new Error('Unable to fetch bill data from TGSPDCL');
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
        payment_url: `https://www.tssouthernpower.com/OnlineBill/QuickPay?serviceNo=${serviceNumber}`
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

async function fetchBillFromTGSPDCL(serviceNumber: string): Promise<BillData | null> {
  try {
    // Primary method: Try the enquiry page
    const url = `https://www.tssouthernpower.com/OnlineBill/QuickPay?serviceNo=${serviceNumber}`;
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
    });

    if (!response.ok) {
      console.error('TGSPDCL response not OK:', response.status);
      return null;
    }

    const html = await response.text();
    
    // Parse HTML to extract bill details
    // Note: This is a simplified parser - you may need to adjust based on actual HTML structure
    const billData = parseHTMLForBillData(html, serviceNumber);
    
    return billData;
  } catch (error) {
    console.error('Error fetching from TGSPDCL:', error);
    
    // Fallback: Return mock data for testing
    // TODO: Remove this in production
    return {
      consumer_name: 'Sample Consumer',
      service_number: serviceNumber,
      unique_service_number: `USC-${serviceNumber}`,
      section_name: 'Sample Section',
      ero: 'Sample ERO',
      bill_amount: 0,
      bill_month: new Date().toISOString().slice(0, 7),
      status: 'Unknown',
    };
  }
}

function parseHTMLForBillData(html: string, serviceNumber: string): BillData {
  // Basic HTML parsing
  // This is a simplified version - adjust regex patterns based on actual TGSPDCL HTML structure
  
  const consumerNameMatch = html.match(/Consumer Name[:\s]*([^<\n]+)/i);
  const billAmountMatch = html.match(/Bill Amount[:\s]*₹?\s*([\d,]+\.?\d*)/i);
  const dueDateMatch = html.match(/Due Date[:\s]*(\d{2}[-\/]\d{2}[-\/]\d{4})/i);
  const sectionMatch = html.match(/Section[:\s]*([^<\n]+)/i);
  const eroMatch = html.match(/ERO[:\s]*([^<\n]+)/i);
  const statusMatch = html.match(/Status[:\s]*([^<\n]+)/i);

  return {
    consumer_name: consumerNameMatch ? consumerNameMatch[1].trim() : 'Unknown',
    service_number: serviceNumber,
    unique_service_number: `USC-${serviceNumber}`,
    section_name: sectionMatch ? sectionMatch[1].trim() : undefined,
    ero: eroMatch ? eroMatch[1].trim() : undefined,
    bill_amount: billAmountMatch ? parseFloat(billAmountMatch[1].replace(/,/g, '')) : 0,
    bill_month: new Date().toISOString().slice(0, 7),
    due_date: dueDateMatch ? dueDateMatch[1] : undefined,
    status: statusMatch ? statusMatch[1].trim() : 'Pending',
  };
}

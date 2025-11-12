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

    if (!billData || billData.bill_amount === 0) {
      console.warn('TGSPDCL fetch failed or returned no data:', fetchError);
      
      // Return error response prompting manual entry
      return new Response(
        JSON.stringify({
          success: false,
          error: fetchError || 'Unable to automatically fetch bill data',
          message: 'Please use the manual entry option to input bill details from the TGSPDCL portal',
          payment_url: `https://tgsouthernpower.org/paybillonline`,
          unique_service_number: uniqueServiceNumber
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

function parseJSONResponse(data: any, uniqueServiceNumber: string): BillData | null {
  try {
    // Handle different possible JSON structures from TGSPDCL API
    const billInfo = data.bill || data.data || data;
    
    if (!billInfo) return null;

    return {
      consumer_name: billInfo.consumerName || billInfo.consumer_name || 'Unknown',
      service_number: billInfo.serviceNumber || billInfo.service_number || uniqueServiceNumber.substring(0, 10),
      unique_service_number: uniqueServiceNumber,
      section_name: billInfo.section || billInfo.section_name,
      ero: billInfo.ero || billInfo.ERO,
      bill_amount: parseFloat(billInfo.totalDue || billInfo.total_due || billInfo.billAmount || 0),
      bill_month: billInfo.billMonth || billInfo.bill_month || new Date().toISOString().slice(0, 7),
      due_date: billInfo.dueDate || billInfo.due_date,
      status: billInfo.status || 'Pending',
    };
  } catch (error) {
    console.error('Error parsing JSON response:', error);
    return null;
  }
}

async function fetchBillFromTGSPDCL(uniqueServiceNumber: string): Promise<{ billData: BillData | null; error?: string }> {
  try {
    // Try multiple TGSPDCL endpoints
    const endpoints = [
      `https://tgsouthernpower.org/paybillonline/api/getBill?uniqueServiceNo=${uniqueServiceNumber}`,
      `https://www.tssouthernpower.com/OnlineBill/QuickPay?uniqueServiceNo=${uniqueServiceNumber}`,
      `https://tgspdcl.in/OnlineBill/QuickPay?uniqueServiceNo=${uniqueServiceNumber}`,
    ];

    console.log('Attempting to fetch bill for unique service number:', uniqueServiceNumber);

    for (const url of endpoints) {
      try {
        console.log('Trying endpoint:', url);
        
        const response = await fetch(url, {
          method: 'GET',
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.9',
            'Accept-Encoding': 'gzip, deflate, br',
            'Connection': 'keep-alive',
            'Referer': 'https://tgsouthernpower.org/',
            'Upgrade-Insecure-Requests': '1',
          },
        });

        console.log(`Response status from ${url}:`, response.status);

        if (response.ok) {
          const contentType = response.headers.get('content-type');
          let billData: BillData | null = null;

          // Check if response is JSON
          if (contentType?.includes('application/json')) {
            console.log('Parsing JSON response...');
            const jsonData = await response.json();
            billData = parseJSONResponse(jsonData, uniqueServiceNumber);
          } else {
            // Parse HTML response
            console.log('Parsing HTML response...');
            const html = await response.text();
            billData = parseHTMLForBillData(html, uniqueServiceNumber);
          }

          if (billData && billData.bill_amount > 0) {
            console.log('Successfully extracted bill data:', billData);
            return { billData };
          }
        }
      } catch (endpointError) {
        console.warn(`Failed to fetch from ${url}:`, endpointError);
        continue; // Try next endpoint
      }
    }

    // If all endpoints fail, return error
    return { 
      billData: null, 
      error: 'Unable to fetch bill from TGSPDCL portal. The service may be temporarily unavailable or the unique service number may be invalid.' 
    };

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
  // Enhanced HTML parsing with multiple pattern attempts
  console.log('Parsing HTML content (length:', html.length, 'chars)');
  
  // Try to extract data from various possible HTML structures
  
  // Pattern 1: Table-based data extraction
  const consumerNameMatch = html.match(/(?:Consumer Name|CONSUMER NAME)[\s:]*<\/?\w+>?[\s]*([^<\n]+)/i) ||
                           html.match(/name\s*[":=]+\s*["']?([^"'\n<>]+)["']?/i);
  
  const billAmountMatch = html.match(/(?:Total (?:Amount|Due)|Bill Amount|TOTAL DUE)[\s:]*<\/?\w+>?[\s]*₹?\s*([\d,]+\.?\d*)/i) ||
                         html.match(/total[_-]?(?:amount|due)\s*[":=]+\s*["']?([\d,]+\.?\d*)["']?/i);
  
  const currentBillMatch = html.match(/(?:Current Month Bill|CURRENT BILL)[\s:]*<\/?\w+>?[\s]*₹?\s*([\d,]+\.?\d*)/i);
  
  const arrearsMatch = html.match(/(?:Arrears|ARREARS)[\s:]*<\/?\w+>?[\s]*₹?\s*([\d,]+\.?\d*)/i);
  
  const acdMatch = html.match(/(?:ACD|Additional Charge)[\s:]*<\/?\w+>?[\s]*₹?\s*([\d,]+\.?\d*)/i);
  
  const unitsMatch = html.match(/(?:Units Consumed|UNITS)[\s:]*<\/?\w+>?[\s]*([\d,]+\.?\d*)/i);
  
  const dueDateMatch = html.match(/(?:Due Date|DUE DATE)[\s:]*<\/?\w+>?[\s]*(\d{1,2}[-\/]\w{3}[-\/]\d{2,4})/i) ||
                      html.match(/due[_-]?date\s*[":=]+\s*["']?(\d{1,2}[-\/]\d{1,2}[-\/]\d{2,4})["']?/i);
  
  const billDateMatch = html.match(/(?:Bill Date|BILL DATE)[\s:]*<\/?\w+>?[\s]*(\d{1,2}[-\/]\w{3}[-\/]\d{2,4})/i);
  
  const sectionMatch = html.match(/(?:Section|SECTION)[\s:]*<\/?\w+>?[\s]*([^<\n]+)/i);
  
  const eroMatch = html.match(/(?:ERO|E\.R\.O\.|Sub Division)[\s:]*<\/?\w+>?[\s]*([^<\n]+)/i);
  
  const serviceNoMatch = html.match(/(?:Service (?:No|Number)|SERVICE NO)[\s:]*<\/?\w+>?[\s]*([^<\n\s]+)/i);

  // Parse bill month from bill date
  let billMonth = new Date().toISOString().slice(0, 7);
  if (billDateMatch) {
    try {
      const dateStr = billDateMatch[1];
      const parts = dateStr.split(/[-\/]/);
      if (parts.length === 3) {
        const monthMap: Record<string, string> = {
          'Jan': '01', 'Feb': '02', 'Mar': '03', 'Apr': '04',
          'May': '05', 'Jun': '06', 'Jul': '07', 'Aug': '08',
          'Sep': '09', 'Oct': '10', 'Nov': '11', 'Dec': '12'
        };
        const month = monthMap[parts[1]] || parts[1].padStart(2, '0');
        let year = parts[2];
        if (year.length === 2) year = '20' + year;
        billMonth = `${year}-${month}`;
      }
    } catch (e) {
      console.error('Error parsing bill date:', e);
    }
  }

  const extractedData = {
    consumer_name: consumerNameMatch ? consumerNameMatch[1].trim().replace(/\s+/g, ' ') : 'Unknown',
    service_number: serviceNoMatch ? serviceNoMatch[1].trim() : uniqueServiceNumber.substring(0, 11),
    unique_service_number: uniqueServiceNumber,
    section_name: sectionMatch ? sectionMatch[1].trim() : undefined,
    ero: eroMatch ? eroMatch[1].trim() : undefined,
    bill_amount: billAmountMatch ? parseFloat(billAmountMatch[1].replace(/,/g, '')) : 0,
    bill_month: billMonth,
    due_date: dueDateMatch ? dueDateMatch[1] : undefined,
    status: 'Pending',
  };

  console.log('Extracted bill data:', extractedData);
  
  return extractedData;
}

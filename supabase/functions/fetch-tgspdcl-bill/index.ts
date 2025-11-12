import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import * as cheerio from 'https://esm.sh/cheerio@1.0.0-rc.12';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface BillData {
  consumer_name?: string;
  unique_service_number: string;
  service_number?: string;
  ero?: string;
  section_name?: string;
  area?: string;
  direction?: string;
  location?: string;
  address?: string;
  units?: number;
  bill_date?: string;
  due_date?: string;
  bill_amount?: number;
  current_month_bill?: number;
  acd_amount?: number;
  arrears?: number;
  total_due?: number;
  payment_link?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { uniqueServiceNumber, assetId } = await req.json();

    if (!uniqueServiceNumber) {
      throw new Error('Unique service number is required');
    }

    console.log('Fetching TGSPDCL bill for USN:', uniqueServiceNumber);

    const { billData, error: fetchError } = await fetchBillFromTGSPDCL(uniqueServiceNumber);

    if (!billData || (billData.bill_amount === 0 && billData.total_due === 0)) {
      console.warn('TGSPDCL fetch failed or returned no data:', fetchError);
      
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

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    if (assetId && billData) {
      // Fetch asset details to merge with bill data
      const { data: assetData, error: assetError } = await supabase
        .from('media_assets')
        .select('consumer_name, service_number, ero, section_name, area, direction, location')
        .eq('id', assetId)
        .single();

      if (assetError) {
        console.error('Error fetching asset details:', assetError);
      }

      const mergedData = {
        ...billData,
        consumer_name: billData.consumer_name || assetData?.consumer_name,
        service_number: billData.service_number || assetData?.service_number,
        ero: billData.ero || assetData?.ero,
        section_name: billData.section_name || assetData?.section_name,
        area: billData.area || assetData?.area,
        direction: billData.direction || assetData?.direction,
        location: billData.location || assetData?.location,
      };

      const { error: insertError } = await supabase
        .from('asset_power_bills')
        .upsert({
          asset_id: assetId,
          unique_service_number: mergedData.unique_service_number,
          consumer_name: mergedData.consumer_name,
          service_number: mergedData.service_number,
          ero: mergedData.ero,
          section_name: mergedData.section_name,
          area: mergedData.area,
          direction: mergedData.direction,
          location: mergedData.location,
          address: mergedData.address,
          bill_month: new Date(),
          bill_date: mergedData.bill_date ? new Date(mergedData.bill_date) : null,
          units: mergedData.units || 0,
          bill_amount: mergedData.bill_amount || mergedData.current_month_bill || 0,
          current_month_bill: mergedData.current_month_bill || 0,
          acd_amount: mergedData.acd_amount || 0,
          arrears: mergedData.arrears || 0,
          total_due: mergedData.total_due || 0,
          due_date: mergedData.due_date ? new Date(mergedData.due_date) : null,
          payment_link: mergedData.payment_link || null,
          payment_status: 'Pending',
          paid: false,
        }, {
          onConflict: 'asset_id,bill_month',
        });

      if (insertError) {
        console.error('Error inserting bill data:', insertError);
        throw insertError;
      }

      console.log('Bill data stored successfully');
    }

    return new Response(
      JSON.stringify({
        success: true,
        data: billData,
        message: 'Bill fetched and stored successfully',
        payment_url: `https://tgsouthernpower.org/paybillonline`
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Error in fetch-tgspdcl-bill:', error);
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
    const billInfo = data.bill || data.data || data;
    
    if (!billInfo) return null;

    return {
      consumer_name: billInfo.consumerName || billInfo.consumer_name || 'Unknown',
      service_number: billInfo.serviceNumber || billInfo.service_number || uniqueServiceNumber.substring(0, 10),
      unique_service_number: uniqueServiceNumber,
      section_name: billInfo.section || billInfo.section_name,
      ero: billInfo.ero || billInfo.ERO,
      address: billInfo.address,
      units: billInfo.units || billInfo.unitsConsumed,
      bill_date: billInfo.billDate || billInfo.bill_date,
      due_date: billInfo.dueDate || billInfo.due_date,
      bill_amount: parseFloat(billInfo.totalDue || billInfo.total_due || billInfo.billAmount || 0),
      current_month_bill: parseFloat(billInfo.currentMonthBill || billInfo.current_month_bill || 0),
      acd_amount: parseFloat(billInfo.acdAmount || billInfo.acd_amount || 0),
      arrears: parseFloat(billInfo.arrears || 0),
      total_due: parseFloat(billInfo.totalDue || billInfo.total_due || 0),
    };
  } catch (error) {
    console.error('Error parsing JSON response:', error);
    return null;
  }
}

async function fetchBillFromTGSPDCL(uniqueServiceNumber: string): Promise<{ billData: BillData | null; error?: string }> {
  try {
    const endpoints = [
      `https://tgsouthernpower.org/paybillonline`,
      `https://www.tssouthernpower.com/OnlineBill/QuickPay?uniqueServiceNo=${uniqueServiceNumber}`,
      `https://tgspdcl.in/OnlineBill/QuickPay?uniqueServiceNo=${uniqueServiceNumber}`,
    ];

    console.log('Attempting to fetch bill for USN:', uniqueServiceNumber);

    for (const url of endpoints) {
      try {
        console.log('Trying endpoint:', url);
        
        // POST request for the main portal
        const isMainPortal = url.includes('paybillonline');
        const response = await fetch(url, {
          method: isMainPortal ? 'POST' : 'GET',
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.9',
            'Content-Type': isMainPortal ? 'application/x-www-form-urlencoded' : undefined,
            'Referer': 'https://tgsouthernpower.org/',
          },
          body: isMainPortal ? `usno=${uniqueServiceNumber}` : undefined,
        });

        console.log(`Response status from ${url}:`, response.status);

        if (response.ok) {
          const contentType = response.headers.get('content-type');
          let billData: BillData | null = null;

          if (contentType?.includes('application/json')) {
            console.log('Parsing JSON response...');
            const jsonData = await response.json();
            billData = parseJSONResponse(jsonData, uniqueServiceNumber);
          } else {
            console.log('Parsing HTML response...');
            const html = await response.text();
            billData = parseHTMLForBillData(html, uniqueServiceNumber);
          }

          if (billData && (billData.bill_amount! > 0 || billData.total_due! > 0)) {
            console.log('Successfully extracted bill data:', billData);
            return { billData };
          }
        }
      } catch (endpointError) {
        console.warn(`Failed to fetch from ${url}:`, endpointError);
        continue;
      }
    }

    return { 
      billData: null, 
      error: 'Unable to fetch bill from TGSPDCL portal. Service may be unavailable.' 
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
  console.log('Parsing HTML content (length:', html.length, 'chars)');
  
  const $ = cheerio.load(html);
  const billData: BillData = {
    unique_service_number: uniqueServiceNumber,
  };

  const extractNumber = (text: string | null): number | undefined => {
    if (!text) return undefined;
    const cleaned = text.replace(/[₹,\s]/g, '');
    const num = parseFloat(cleaned);
    return isNaN(num) ? undefined : num;
  };

  const parseDate = (dateStr: string | null): string | undefined => {
    if (!dateStr) return undefined;
    
    const monthMap: { [key: string]: string } = {
      'Jan': '01', 'Feb': '02', 'Mar': '03', 'Apr': '04',
      'May': '05', 'Jun': '06', 'Jul': '07', 'Aug': '08',
      'Sep': '09', 'Oct': '10', 'Nov': '11', 'Dec': '12'
    };
    
    const match = dateStr.match(/(\d{1,2})[-\/](\w{3})[-\/](\d{2,4})/);
    if (!match) return undefined;
    
    const day = match[1].padStart(2, '0');
    const month = monthMap[match[2]];
    let year = match[3];
    
    if (year.length === 2) {
      year = parseInt(year) > 50 ? '19' + year : '20' + year;
    }
    
    return month ? `${year}-${month}-${day}` : undefined;
  };

  // Extract bill details from table rows and divs
  $('tr, div, td').each((_, elem) => {
    const text = $(elem).text().trim();
    
    if (/Consumer\s*Name/i.test(text) && !billData.consumer_name) {
      const match = text.match(/Consumer\s*Name\s*[:\-]?\s*([A-Z\s&.,()]+)/i);
      if (match) billData.consumer_name = match[1].trim();
    }
    
    if (/Service\s*No/i.test(text) && !billData.service_number) {
      const match = text.match(/Service\s*No\.?\s*[:\-]?\s*([A-Z0-9]+)/i);
      if (match) billData.service_number = match[1].trim();
    }
    
    if (/ERO/i.test(text) && !billData.ero) {
      const match = text.match(/ERO\s*[:\-]?\s*([^<\n]+?)(?:\s{2,}|$)/i);
      if (match) billData.ero = match[1].trim();
    }
    
    if (/Section/i.test(text) && !billData.section_name) {
      const match = text.match(/Section\s*[:\-]?\s*([^<\n]+?)(?:\s{2,}|$)/i);
      if (match) billData.section_name = match[1].trim();
    }
    
    if (/Address/i.test(text) && !billData.address) {
      const match = text.match(/Address\s*[:\-]?\s*(.+?)(?:\s{2,}|$)/i);
      if (match) billData.address = match[1].trim();
    }
    
    if (/Units?/i.test(text) && !billData.units) {
      const match = text.match(/Units?\s*[:\-]?\s*(\d+)/i);
      if (match) billData.units = parseInt(match[1]);
    }
    
    if (/Bill\s*Date\s*\/\s*Due\s*Date/i.test(text)) {
      const match = text.match(/(\d{1,2}[-\/]\w{3}[-\/]\d{2,4})\s*\/\s*(\d{1,2}[-\/]\w{3}[-\/]\d{2,4})/i);
      if (match) {
        billData.bill_date = parseDate(match[1]);
        billData.due_date = parseDate(match[2]);
      }
    }
    
    if (/Current\s*Month\s*Bill/i.test(text) && !billData.current_month_bill) {
      const match = text.match(/Current\s*Month\s*Bill\s*[:\-]?\s*₹?\s*([\d,]+\.?\d*)/i);
      if (match) {
        billData.current_month_bill = extractNumber(match[1]);
        billData.bill_amount = billData.current_month_bill;
      }
    }
    
    if (/ACD\s*Amount/i.test(text) && billData.acd_amount === undefined) {
      const match = text.match(/ACD\s*Amount\s*[:\-]?\s*₹?\s*([\d,]+\.?\d*)/i);
      if (match) billData.acd_amount = extractNumber(match[1]);
    }
    
    if (/Arrears?/i.test(text) && billData.arrears === undefined) {
      const match = text.match(/Arrears?\s*[:\-]?\s*₹?\s*([\d,]+\.?\d*)/i);
      if (match) billData.arrears = extractNumber(match[1]);
    }
    
    if (/Total\s*Amount\s*to\s*be\s*Paid/i.test(text) && !billData.total_due) {
      const match = text.match(/Total\s*Amount\s*to\s*be\s*Paid\s*[:\-]?\s*₹?\s*([\d,]+\.?\d*)/i);
      if (match) billData.total_due = extractNumber(match[1]);
    }
  });

  // Fallback: Try regex patterns on raw HTML
  if (!billData.current_month_bill) {
    const billMatch = html.match(/Current\s*Month\s*Bill\s*[:\-]?\s*₹?\s*([\d,]+\.?\d*)/i);
    if (billMatch) {
      billData.current_month_bill = extractNumber(billMatch[1]);
      billData.bill_amount = billData.current_month_bill;
    }
  }

  if (!billData.total_due) {
    const totalMatch = html.match(/Total\s*Amount\s*to\s*be\s*Paid\s*[:\-]?\s*₹?\s*([\d,]+\.?\d*)/i);
    if (totalMatch) billData.total_due = extractNumber(totalMatch[1]);
  }

  console.log('Extracted bill data:', billData);
  
  return billData;
}

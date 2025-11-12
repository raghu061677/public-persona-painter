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
    console.log('Attempting to fetch bill for USN:', uniqueServiceNumber);

    // Primary endpoint - TGSPDCL main portal
    const url = 'https://tgsouthernpower.org/paybillonline';
    
    const headers = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.9',
      'Accept-Encoding': 'gzip, deflate, br',
      'Content-Type': 'application/x-www-form-urlencoded',
      'Origin': 'https://tgsouthernpower.org',
      'Referer': 'https://tgsouthernpower.org/paybillonline',
      'Connection': 'keep-alive',
      'Upgrade-Insecure-Requests': '1',
    };

    console.log('Fetching from TGSPDCL portal:', url);
    
    const formBody = `usno=${uniqueServiceNumber}&submit=Get+Bill`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: formBody,
      redirect: 'follow',
    });

    console.log('Response status:', response.status);
    console.log('Response headers:', Object.fromEntries(response.headers.entries()));

    if (!response.ok) {
      console.error('Response not OK:', response.status, response.statusText);
      return {
        billData: null,
        error: `TGSPDCL portal returned status ${response.status}. Please try again later.`
      };
    }

    const contentType = response.headers.get('content-type') || '';
    console.log('Content-Type:', contentType);

    // Try JSON first
    if (contentType.includes('application/json')) {
      console.log('Parsing JSON response...');
      try {
        const jsonData = await response.json();
        console.log('JSON data received:', JSON.stringify(jsonData).substring(0, 200));
        const billData = parseJSONResponse(jsonData, uniqueServiceNumber);
        
        if (billData && (billData.bill_amount! > 0 || billData.total_due! > 0)) {
          console.log('✓ Successfully extracted bill data from JSON');
          return { billData };
        }
      } catch (jsonError) {
        console.warn('JSON parsing failed, trying HTML:', jsonError);
      }
    }

    // Parse HTML response
    console.log('Parsing HTML response...');
    const html = await response.text();
    console.log('HTML content length:', html.length, 'chars');
    
    // Save first 1000 chars for debugging
    console.log('HTML preview:', html.substring(0, 1000));
    
    const billData = parseHTMLForBillData(html, uniqueServiceNumber);
    
    if (billData && (billData.bill_amount! > 0 || billData.total_due! > 0)) {
      console.log('✓ Successfully extracted bill data from HTML');
      return { billData };
    }

    console.warn('No valid bill data found in response');
    return {
      billData: null,
      error: 'Unable to fetch bill from TGSPDCL portal. The service may be temporarily unavailable or the unique service number may be invalid.'
    };

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error fetching from TGSPDCL:', errorMessage);
    console.error('Full error:', error);
    
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

  // Look for specific table/div patterns used by TGSPDCL
  const tables = $('table');
  console.log(`Found ${tables.length} tables in HTML`);

  // Strategy 1: Look in table cells (td, th)
  $('td, th, div.bill-detail, div.info-row, span.value, p').each((_, elem) => {
    const $elem = $(elem);
    const text = $elem.text().trim();
    const html = $elem.html() || '';
    
    // Consumer Name
    if (/Consumer\s*Name/i.test(text) && !billData.consumer_name) {
      const nextText = $elem.next().text().trim();
      if (nextText && nextText.length > 3) {
        billData.consumer_name = nextText;
      } else {
        const match = text.match(/Consumer\s*Name\s*[:\-]?\s*(.+?)(?:\n|$)/i);
        if (match) billData.consumer_name = match[1].trim();
      }
    }
    
    // Service Number
    if (/Service\s*No/i.test(text) && !billData.service_number) {
      const nextText = $elem.next().text().trim();
      if (nextText && /^[A-Z0-9]{6,}$/.test(nextText)) {
        billData.service_number = nextText;
      } else {
        const match = text.match(/Service\s*No\.?\s*[:\-]?\s*([A-Z0-9]+)/i);
        if (match) billData.service_number = match[1].trim();
      }
    }
    
    // ERO
    if (/\bERO\b/i.test(text) && !billData.ero) {
      const nextText = $elem.next().text().trim();
      if (nextText && nextText.length > 2) {
        billData.ero = nextText;
      } else {
        const match = text.match(/ERO\s*[:\-]?\s*(.+?)(?:\n|$)/i);
        if (match) billData.ero = match[1].trim();
      }
    }
    
    // Section
    if (/Section/i.test(text) && !billData.section_name) {
      const nextText = $elem.next().text().trim();
      if (nextText && nextText.length > 2) {
        billData.section_name = nextText;
      } else {
        const match = text.match(/Section\s*[:\-]?\s*(.+?)(?:\n|$)/i);
        if (match) billData.section_name = match[1].trim();
      }
    }
    
    // Address
    if (/Address/i.test(text) && !billData.address) {
      const nextText = $elem.next().text().trim();
      if (nextText && nextText.length > 5) {
        billData.address = nextText;
      } else {
        const match = text.match(/Address\s*[:\-]?\s*(.+?)(?:\n|$)/i);
        if (match) billData.address = match[1].trim();
      }
    }
    
    // Units
    if (/Units?\s*Consumed/i.test(text) && !billData.units) {
      const nextText = $elem.next().text().trim();
      const nextNum = parseInt(nextText);
      if (!isNaN(nextNum)) {
        billData.units = nextNum;
      } else {
        const match = text.match(/Units?\s*(?:Consumed)?\s*[:\-]?\s*(\d+)/i);
        if (match) billData.units = parseInt(match[1]);
      }
    }
    
    // Bill Date / Due Date
    if (/Bill\s*Date.*Due\s*Date/i.test(text) || /Bill.*Due/i.test(text)) {
      const dateMatch = text.match(/(\d{1,2}[-\/]\w{3}[-\/]\d{2,4})\s*[\/\-]\s*(\d{1,2}[-\/]\w{3}[-\/]\d{2,4})/i);
      if (dateMatch) {
        billData.bill_date = parseDate(dateMatch[1]);
        billData.due_date = parseDate(dateMatch[2]);
      }
    }
    
    // Current Month Bill
    if (/Current\s*Month\s*Bill/i.test(text) && !billData.current_month_bill) {
      const nextText = $elem.next().text().trim();
      const nextNum = extractNumber(nextText);
      if (nextNum && nextNum > 0) {
        billData.current_month_bill = nextNum;
        billData.bill_amount = nextNum;
      } else {
        const match = text.match(/Current\s*Month\s*Bill\s*[:\-]?\s*₹?\s*([\d,]+\.?\d*)/i);
        if (match) {
          billData.current_month_bill = extractNumber(match[1]);
          billData.bill_amount = billData.current_month_bill;
        }
      }
    }
    
    // ACD Amount
    if (/ACD\s*Amount/i.test(text) && billData.acd_amount === undefined) {
      const nextText = $elem.next().text().trim();
      const nextNum = extractNumber(nextText);
      if (nextNum !== undefined) {
        billData.acd_amount = nextNum;
      } else {
        const match = text.match(/ACD\s*Amount\s*[:\-]?\s*₹?\s*([\d,]+\.?\d*)/i);
        if (match) billData.acd_amount = extractNumber(match[1]);
      }
    }
    
    // Arrears
    if (/Arrears?/i.test(text) && billData.arrears === undefined && !/ACD/.test(text)) {
      const nextText = $elem.next().text().trim();
      const nextNum = extractNumber(nextText);
      if (nextNum !== undefined) {
        billData.arrears = nextNum;
      } else {
        const match = text.match(/Arrears?\s*[:\-]?\s*₹?\s*([\d,]+\.?\d*)/i);
        if (match) billData.arrears = extractNumber(match[1]);
      }
    }
    
    // Total Amount to be Paid
    if (/Total\s*(?:Amount)?\s*to\s*be\s*Paid/i.test(text) && !billData.total_due) {
      const nextText = $elem.next().text().trim();
      const nextNum = extractNumber(nextText);
      if (nextNum && nextNum > 0) {
        billData.total_due = nextNum;
      } else {
        const match = text.match(/Total\s*(?:Amount)?\s*to\s*be\s*Paid\s*[:\-]?\s*₹?\s*([\d,]+\.?\d*)/i);
        if (match) billData.total_due = extractNumber(match[1]);
      }
    }
  });

  // Fallback: Aggressive regex on entire HTML
  if (!billData.consumer_name) {
    const match = html.match(/Consumer\s*Name\s*[:\-]?\s*<[^>]*>([^<]+)/i);
    if (match) billData.consumer_name = match[1].trim();
  }
  
  if (!billData.service_number) {
    const match = html.match(/Service\s*No[\.:]?\s*<[^>]*>([A-Z0-9]+)/i);
    if (match) billData.service_number = match[1].trim();
  }

  if (!billData.current_month_bill) {
    const billMatch = html.match(/Current\s*Month\s*Bill\s*[:\-]?\s*<[^>]*>₹?\s*([\d,]+\.?\d*)/i);
    if (billMatch) {
      billData.current_month_bill = extractNumber(billMatch[1]);
      billData.bill_amount = billData.current_month_bill;
    }
  }

  if (!billData.total_due) {
    const totalMatch = html.match(/Total\s*(?:Amount)?\s*to\s*be\s*Paid\s*[:\-]?\s*<[^>]*>₹?\s*([\d,]+\.?\d*)/i);
    if (totalMatch) billData.total_due = extractNumber(totalMatch[1]);
  }

  if (!billData.units) {
    const unitsMatch = html.match(/Units?\s*(?:Consumed)?\s*[:\-]?\s*<[^>]*>(\d+)/i);
    if (unitsMatch) billData.units = parseInt(unitsMatch[1]);
  }

  console.log('✓ Extracted bill data:', JSON.stringify(billData, null, 2));
  
  return billData;
}

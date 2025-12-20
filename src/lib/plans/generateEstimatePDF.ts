import { supabase } from '@/integrations/supabase/client';
import { generateStandardizedPDF, formatDateToDDMMYYYY } from '@/lib/pdf/standardPDFTemplate';
import { 
  getPrimaryContactName, 
  getClientDisplayName, 
  getClientAddress, 
  getClientCity, 
  getClientState, 
  getClientPincode 
} from '@/lib/pdf/pdfHelpers';

// Calculate duration display
function getDurationDisplay(days: number): string {
  if (days <= 0) return '-';
  if (days >= 28 && days <= 31) return '1 Month';
  if (days > 31) {
    const months = Math.round(days / 30);
    return `${months} Month${months > 1 ? 's' : ''}`;
  }
  return `${days} Days`;
}

export async function generateEstimatePDF(planId: string): Promise<Blob> {
  // Fetch plan details
  const { data: plan, error: planError } = await supabase
    .from('plans')
    .select('*')
    .eq('id', planId)
    .single();

  if (planError || !plan) throw new Error('Plan not found');

  // Fetch company details (SELLER - for footer)
  const { data: companyData } = await supabase
    .from('companies')
    .select('*')
    .eq('id', plan.company_id)
    .single();

  // Fetch client details
  const { data: client, error: clientError } = await supabase
    .from('clients')
    .select('*')
    .eq('id', plan.client_id)
    .single();

  if (clientError || !client) throw new Error('Client not found');

  // Fetch client contacts for point of contact
  const { data: clientContacts } = await supabase
    .from('client_contacts')
    .select('*')
    .eq('client_id', plan.client_id)
    .order('is_primary', { ascending: false });

  // Merge contacts into client object for helper function
  const clientWithContacts = {
    ...client,
    contacts: clientContacts?.map(c => ({
      name: c.first_name ? `${c.first_name} ${c.last_name || ''}`.trim() : null,
      first_name: c.first_name,
      last_name: c.last_name
    })) || []
  };

  // Fetch plan items with asset details
  const { data: planItems, error: itemsError } = await supabase
    .from('plan_items')
    .select('*, media_assets(*)')
    .eq('plan_id', planId);

  if (itemsError) throw new Error('Failed to fetch plan items');

  // Get Point of Contact from client contacts (NOT current user)
  const pointOfContact = getPrimaryContactName(clientWithContacts);

  // Calculate days between plan dates
  const startDate = new Date(plan.start_date);
  const endDate = new Date(plan.end_date);
  const days = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));

  // Build line items with new 098-style structure
  const items = planItems?.map((item: any, index: number) => {
    const asset = item.media_assets;
    const unitPrice = item.sales_price || item.card_rate || asset?.card_rate || 0;
    const subtotal = unitPrice - (item.discount_amount || 0);
    
    return {
      sno: index + 1,
      locationCode: asset?.id || item.asset_id || '-',
      area: asset?.area || '-',
      mediaType: asset?.media_type || 'Display',
      route: asset?.direction || asset?.route || '-',
      illumination: asset?.illumination_type || 'Non-Lit',
      dimension: asset?.dimensions || asset?.dimension || '-',
      totalSqft: asset?.total_sqft || 0,
      fromDate: formatDateToDDMMYYYY(plan.start_date),
      toDate: formatDateToDDMMYYYY(plan.end_date),
      duration: getDurationDisplay(days),
      unitPrice,
      subtotal,
    };
  }) || [];

  // Calculate totals
  const displayCost = planItems?.reduce((sum, item) => {
    const cost = (item.sales_price || item.card_rate || item.media_assets?.card_rate || 0) - (item.discount_amount || 0);
    return sum + cost;
  }, 0) || 0;

  const totalPrinting = planItems?.reduce((sum, item) => sum + (item.printing_charges || item.printing_cost || 0), 0) || 0;
  const totalInstallation = planItems?.reduce((sum, item) => sum + (item.mounting_charges || item.installation_cost || 0), 0) || 0;

  const untaxedAmount = displayCost + totalPrinting + totalInstallation;
  const cgst = untaxedAmount * 0.09;
  const sgst = untaxedAmount * 0.09;
  const totalInr = untaxedAmount + cgst + sgst;

  return generateStandardizedPDF({
    documentType: 'ESTIMATE',
    documentNumber: `EST-${planId}`,
    documentDate: new Date().toLocaleDateString('en-IN'),
    displayName: plan.plan_name || planId,
    pointOfContact: pointOfContact,
    
    // Client details (TO section)
    clientName: getClientDisplayName(client),
    clientAddress: getClientAddress(client),
    clientCity: getClientCity(client),
    clientState: getClientState(client),
    clientPincode: getClientPincode(client),
    clientGSTIN: client.gst_number,
    
    // Company/Seller details (FOR section - footer)
    companyName: companyData?.name || 'Matrix Network Solutions',
    companyGSTIN: companyData?.gstin || '36AATFM4107H2Z3',
    companyPAN: companyData?.pan || 'AATFM4107H',
    
    items,
    untaxedAmount,
    cgst,
    sgst,
    totalInr,
  });
}

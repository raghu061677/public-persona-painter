import { generateStandardizedPDF, formatDateToDDMMYYYY } from '@/lib/pdf/standardPDFTemplate';

interface ProformaInvoiceData {
  proforma_number: string;
  proforma_date: string;
  reference_plan_id?: string;
  client_name: string;
  client_gstin?: string;
  client_address?: string;
  client_city?: string;
  client_state?: string;
  client_pincode?: string;
  plan_name?: string;
  campaign_start_date?: string;
  campaign_end_date?: string;
  items: any[];
  subtotal: number;
  printing_total: number;
  mounting_total: number;
  taxable_amount: number;
  cgst_amount: number;
  sgst_amount: number;
  grand_total: number;
}

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

export const generateProformaPDF = async (data: ProformaInvoiceData): Promise<Blob> => {
  // Calculate days if campaign dates exist
  let days = 30; // default
  if (data.campaign_start_date && data.campaign_end_date) {
    const startDate = new Date(data.campaign_start_date);
    const endDate = new Date(data.campaign_end_date);
    days = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
  }

  // Build line items with 098-style structure
  const items = data.items.map((item: any, index: number) => ({
    sno: index + 1,
    locationCode: item.asset_id || item.display_name || '-',
    area: item.area || '-',
    mediaType: item.media_type || 'Display',
    route: item.direction || item.route || '-',
    illumination: item.illumination_type === 'Lit' ? 'BackLit' : 'Non-Lit',
    dimension: item.dimensions || item.dimension || '-',
    totalSqft: item.total_sqft || item.sqft || 0,
    fromDate: data.campaign_start_date ? formatDateToDDMMYYYY(data.campaign_start_date) : '-',
    toDate: data.campaign_end_date ? formatDateToDDMMYYYY(data.campaign_end_date) : '-',
    duration: getDurationDisplay(days),
    unitPrice: item.negotiated_rate || item.card_rate || 0,
    subtotal: item.line_total || item.total_price || 0,
  }));

  const untaxedAmount = data.taxable_amount;
  const cgst = data.cgst_amount;
  const sgst = data.sgst_amount;

  return await generateStandardizedPDF({
    documentType: 'PROFORMA INVOICE',
    documentNumber: data.proforma_number,
    documentDate: new Date(data.proforma_date).toLocaleDateString('en-IN'),
    displayName: data.plan_name || data.reference_plan_id || 'Campaign',
    pointOfContact: 'Sales Team',

    clientName: data.client_name,
    clientAddress: data.client_address || '',
    clientCity: data.client_city || '',
    clientState: data.client_state || '',
    clientPincode: data.client_pincode || '',
    clientGSTIN: data.client_gstin,

    companyName: 'Matrix Network Solutions',
    companyGSTIN: '36AATFM4107H2Z3',
    companyPAN: 'AATFM4107H',

    items,
    untaxedAmount,
    cgst,
    sgst,
    totalInr: data.grand_total,
  });
};

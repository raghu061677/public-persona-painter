import { supabase } from '@/integrations/supabase/client';
import { generateStandardizedPDF, formatDateToDDMonYY } from '@/lib/pdf/standardPDFTemplate';

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

export const generateProformaPDF = async (data: ProformaInvoiceData): Promise<Blob> => {
  // Calculate days if campaign dates exist
  let days = 30; // default
  if (data.campaign_start_date && data.campaign_end_date) {
    const startDate = new Date(data.campaign_start_date);
    const endDate = new Date(data.campaign_end_date);
    days = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
  }

  // Build line items with dimension, sqft, illumination type
  const items = data.items.map((item: any) => ({
    description: item.display_name || item.location || `${item.area || ''} - ${item.media_type || ''}`,
    dimension: item.dimensions || item.dimension || '',
    sqft: item.total_sqft || item.sqft || 0,
    illuminationType: item.illumination_type === 'Lit' ? 'Lit' : 'Non-Lit',
    startDate: data.campaign_start_date ? formatDateToDDMonYY(data.campaign_start_date) : '',
    endDate: data.campaign_end_date ? formatDateToDDMonYY(data.campaign_end_date) : '',
    days: days,
    monthlyRate: item.negotiated_rate || item.card_rate || 0,
    cost: item.line_total || item.total_price || 0,
  }));

  // Add printing row if exists
  if (data.printing_total > 0) {
    items.push({
      description: 'Printing Charges',
      dimension: '',
      sqft: 0,
      illuminationType: '',
      startDate: '',
      endDate: '',
      days: 0,
      monthlyRate: 0,
      cost: data.printing_total,
    });
  }

  // Add mounting row if exists
  if (data.mounting_total > 0) {
    items.push({
      description: 'Installation Charges',
      dimension: '',
      sqft: 0,
      illuminationType: '',
      startDate: '',
      endDate: '',
      days: 0,
      monthlyRate: 0,
      cost: data.mounting_total,
    });
  }

  const displayCost = data.subtotal;
  const gst = data.cgst_amount + data.sgst_amount;

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
    displayCost,
    installationCost: data.mounting_total,
    gst,
    totalInr: data.grand_total,
  });
};

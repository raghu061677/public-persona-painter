export interface ProformaInvoice {
  id: string;
  proforma_number: string;
  proforma_date: string;
  reference_plan_id?: string;
  client_name: string;
  client_gstin?: string;
  client_address?: string;
  client_state?: string;
  plan_name?: string;
  campaign_start_date?: string;
  campaign_end_date?: string;
  subtotal: number;
  printing_total: number;
  mounting_total: number;
  discount_total: number;
  taxable_amount: number;
  cgst_amount: number;
  sgst_amount: number;
  total_tax: number;
  grand_total: number;
  status: string;
  additional_notes?: string;
  created_at?: string;
  updated_at?: string;
}

export interface ProformaInvoiceItem {
  id: string;
  proforma_invoice_id: string;
  asset_id: string;
  display_name: string;
  area: string;
  location: string;
  direction: string;
  dimension_width: number;
  dimension_height: number;
  total_sqft: number;
  illumination_type: string;
  negotiated_rate: number;
  discount: number;
  printing_charge: number;
  mounting_charge: number;
  line_total: number;
  created_at?: string;
}

// Receipt PDF Template System - Types
import jsPDF from 'jspdf';

export interface ReceiptData {
  receipt: {
    id: string;
    receipt_no: string;
    receipt_date: string;
    amount_received: number;
    payment_method: string;
    reference_no?: string;
    notes?: string;
  };
  invoice: {
    id: string;
    invoice_no?: string;
    invoice_date: string;
    total_amount: number;
    balance_due: number;
  };
  client: {
    id: string;
    name: string;
    gst_number?: string;
    billing_address_line1?: string;
    billing_city?: string;
    billing_state?: string;
    billing_pincode?: string;
  };
  company: {
    name: string;
    gstin?: string;
    owner_name?: string;
  };
  orgSettings?: {
    organization_name?: string;
    gstin?: string;
  };
  logoBase64?: string;
}

export interface ReceiptTemplateConfig {
  key: string;
  name: string;
  description: string;
}

export type ReceiptTemplateRenderer = (data: ReceiptData) => Promise<Blob>;

// PDF-safe currency formatter (avoids Unicode issues with jsPDF)
export function formatCurrency(amount: number | null | undefined): string {
  if (amount == null || isNaN(amount)) return 'Rs. 0';
  const formatted = new Intl.NumberFormat('en-IN', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
  return `Rs. ${formatted}`;
}

export function formatDate(dateStr: string | Date | null): string {
  if (!dateStr) return '-';
  try {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  } catch {
    return '-';
  }
}

export function numberToWords(amount: number): string {
  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
    'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  if (amount === 0) return 'Zero';
  if (amount < 0) return 'Negative ' + numberToWords(Math.abs(amount));
  
  const wholeAmount = Math.floor(amount);
  
  if (wholeAmount >= 10000000) {
    const crores = Math.floor(wholeAmount / 10000000);
    const remainder = wholeAmount % 10000000;
    return numberToWords(crores) + ' Crore' + (remainder > 0 ? ' ' + numberToWords(remainder) : '');
  }
  if (wholeAmount >= 100000) {
    const lakhs = Math.floor(wholeAmount / 100000);
    const remainder = wholeAmount % 100000;
    return numberToWords(lakhs) + ' Lakh' + (remainder > 0 ? ' ' + numberToWords(remainder) : '');
  }
  if (wholeAmount >= 1000) {
    const thousands = Math.floor(wholeAmount / 1000);
    const remainder = wholeAmount % 1000;
    return numberToWords(thousands) + ' Thousand' + (remainder > 0 ? ' ' + numberToWords(remainder) : '');
  }
  if (wholeAmount >= 100) {
    const hundreds = Math.floor(wholeAmount / 100);
    const remainder = wholeAmount % 100;
    return ones[hundreds] + ' Hundred' + (remainder > 0 ? ' and ' + numberToWords(remainder) : '');
  }
  if (wholeAmount >= 20) {
    const ten = Math.floor(wholeAmount / 10);
    const one = wholeAmount % 10;
    return tens[ten] + (one > 0 ? ' ' + ones[one] : '');
  }
  return ones[wholeAmount];
}

// Default company address (used across all templates)
export const COMPANY_ADDRESS = {
  line1: 'H.No: 7-1-19/5/201, Jyothi Bhopal Apartments,',
  line2: 'Near Begumpet Metro Station, Opp Country Club, Begumpet,',
  cityLine: 'Hyderabad, Telangana 500016',
  country: 'India',
  phone: '+91-9666444888',
  email: 'raghu@matrix-networksolutions.com',
  website: 'www.matrixnetworksolutions.com',
};

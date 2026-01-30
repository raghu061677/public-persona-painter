// Invoice PDF Template System - Types
import jsPDF from 'jspdf';

export interface InvoiceData {
  invoice: any;
  client: any;
  campaign: any;
  items: any[];
  company: any;
  orgSettings?: any;
  logoBase64?: string;
}

export interface TemplateConfig {
  key: string;
  name: string;
  description: string;
  version: number;
}

export type TemplateRenderer = (data: InvoiceData) => Promise<Blob>;

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
  if (amount >= 10000000) {
    const crores = Math.floor(amount / 10000000);
    const remainder = amount % 10000000;
    return numberToWords(crores) + ' Crore' + (remainder > 0 ? ' ' + numberToWords(remainder) : '');
  }
  if (amount >= 100000) {
    const lakhs = Math.floor(amount / 100000);
    const remainder = amount % 100000;
    return numberToWords(lakhs) + ' Lakh' + (remainder > 0 ? ' ' + numberToWords(remainder) : '');
  }
  if (amount >= 1000) {
    const thousands = Math.floor(amount / 1000);
    const remainder = amount % 1000;
    return numberToWords(thousands) + ' Thousand' + (remainder > 0 ? ' ' + numberToWords(remainder) : '');
  }
  if (amount >= 100) {
    const hundreds = Math.floor(amount / 100);
    const remainder = amount % 100;
    return ones[hundreds] + ' Hundred' + (remainder > 0 ? ' and ' + numberToWords(remainder) : '');
  }
  if (amount >= 20) {
    const ten = Math.floor(amount / 10);
    const one = amount % 10;
    return tens[ten] + (one > 0 ? ' ' + ones[one] : '');
  }
  return ones[amount];
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

export const HSN_SAC_CODE = '998361';

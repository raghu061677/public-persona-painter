import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { formatCurrencyForPDF } from './pdfHelpers';
import { 
  renderLogoHeader, 
  renderBillShipGrid, 
  renderDetailsGrid,
  createPageHeaderRenderer 
} from './sections/logoHeader';
import { renderSellerFooterWithSignatory } from './sections/authorizedSignatory';
import { ensurePdfUnicodeFont } from './fontLoader';

// ============= INTERFACES =============

export interface PDFDocumentData {
  documentType: 'WORK ORDER' | 'ESTIMATE' | 'QUOTATION' | 'PROFORMA INVOICE';
  documentNumber: string;
  documentDate: string;
  displayName: string;
  pointOfContact: string;

  // Client details (Bill To / Ship To)
  clientName: string;
  clientAddress: string;
  clientCity: string;
  clientState: string;
  clientPincode: string;
  clientGSTIN?: string;

  // Company/Seller details
  companyName: string;
  companyGSTIN: string;
  companyPAN: string;
  companyLogoBase64?: string;

  // Other details (Zoho style)
  placeOfSupply?: string;
  stateCode?: string;
  salesPerson?: string;
  validity?: string;

  // Line items (098-style)
  items: PDFLineItem[];

  // Totals
  untaxedAmount: number;
  cgst: number;
  sgst: number;
  totalInr: number;

  // Optional overrides
  terms?: string[];
  paymentTerms?: string;
}

export interface PDFLineItem {
  sno: number;
  // LOCATION & DESCRIPTION column content
  locationCode: string;    // e.g., "[A4-36] Abids beside Chermas"
  area: string;            // e.g., "Abids" (Zone/Area)
  mediaType: string;       // e.g., "Bus Shelter"
  route: string;           // e.g., "Towards GPO" (direction)
  illumination: string;    // e.g., "BackLit"
  
  // SIZE column
  dimension: string;       // e.g., "20X5-9.5X3"
  totalSqft: number;       // e.g., 161
  
  // BOOKING column
  fromDate: string;        // e.g., "27/09/2025"
  toDate: string;          // e.g., "26/10/2025"
  duration: string;        // e.g., "1 Month" or "30 Days"
  
  // Pricing
  unitPrice: number;       // Monthly rate
  subtotal: number;        // Final amount for this item
}

// ============= UTILITY FUNCTIONS =============

// Format date to DD/MM/YYYY
export function formatDateToDDMMYYYY(dateString: string): string {
  if (!dateString) return '-';
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '-';
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  } catch {
    return '-';
  }
}

// Format date to DDMonYY (e.g., "15Aug25")
export function formatDateToDDMonYY(dateString: string): string {
  if (!dateString) return '-';
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '-';
    const day = date.getDate().toString().padStart(2, '0');
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const month = months[date.getMonth()];
    const year = date.getFullYear().toString().slice(-2);
    return `${day}${month}${year}`;
  } catch {
    return '-';
  }
}

// Convert number to words (Indian style)
function numberToWords(num: number): string {
  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
    'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  if (num === 0) return 'Zero';
  if (num < 0) return 'Minus ' + numberToWords(Math.abs(num));

  let words = '';
  const crore = Math.floor(num / 10000000);
  num %= 10000000;
  const lakh = Math.floor(num / 100000);
  num %= 100000;
  const thousand = Math.floor(num / 1000);
  num %= 1000;
  const hundred = Math.floor(num / 100);
  num %= 100;

  if (crore > 0) words += numberToWords(crore) + ' Crore ';
  if (lakh > 0) words += numberToWords(lakh) + ' Lakh ';
  if (thousand > 0) words += numberToWords(thousand) + ' Thousand ';
  if (hundred > 0) words += ones[hundred] + ' Hundred ';
  
  if (num > 0) {
    if (words !== '') words += 'And ';
    if (num < 20) {
      words += ones[num];
    } else {
      words += tens[Math.floor(num / 10)];
      if (num % 10 > 0) words += '-' + ones[num % 10];
    }
  }

  return words.trim();
}

function amountToWords(amount: number): string {
  const rupees = Math.floor(amount);
  const paise = Math.round((amount - rupees) * 100);
  
  let words = numberToWords(rupees) + ' Rupees';
  if (paise > 0) {
    words += ' And ' + numberToWords(paise) + ' Paise';
  }
  return words + ' Only';
}

// ============= CONSTANTS =============

const BANK_DETAILS = {
  bankName: 'HDFC Bank Limited',
  branch: 'Karkhana Road, Secunderabad – 500009',
  accountNo: '50200010727301',
  ifsc: 'HDFC0001555',
  micr: '500240026',
};

const PAGE_MARGINS = {
  top: 20,
  left: 14,
  right: 14,
  bottom: 15, // Reduced from 20 for better space usage
};

// Minimum space needed for footer section (terms + signatory)
const FOOTER_RESERVE = 80;

// ============= MAIN PDF GENERATOR =============

export async function generateStandardizedPDF(data: PDFDocumentData): Promise<Blob> {
  const doc = new jsPDF('p', 'mm', 'a4');
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const leftMargin = PAGE_MARGINS.left;
  const rightMargin = PAGE_MARGINS.right;

  // Ensure ₹ is supported
  await ensurePdfUnicodeFont(doc);

  // Create reusable page header renderers (full for page 1, compact for page 2+)
  const headerRenderers = createPageHeaderRenderer(
    { name: data.companyName, gstin: data.companyGSTIN, pan: data.companyPAN },
    data.documentType,
    data.companyLogoBase64
  );

  // ========== 1. LOGO HEADER (Zoho Style, Page 1) ==========
  let yPos = headerRenderers.full(doc);

  yPos += 2;

  // ========== 2. BILL TO / SHIP TO GRID ==========
  yPos = renderBillShipGrid(
    doc,
    {
      name: data.clientName,
      address: data.clientAddress,
      city: data.clientCity,
      state: data.clientState,
      pincode: data.clientPincode,
      gstin: data.clientGSTIN,
    },
    yPos
  );

  yPos += 2;

  // ========== 3. DOCUMENT DETAILS / OTHER DETAILS GRID ==========
  yPos = renderDetailsGrid(
    doc,
    {
      documentType: data.documentType,
      documentNumber: data.documentNumber,
      documentDate: data.documentDate,
      displayName: data.displayName,
      placeOfSupply: data.placeOfSupply || data.clientState,
      stateCode: data.stateCode || getStateCode(data.clientState),
      salesPerson: data.salesPerson || data.pointOfContact,
      validity: data.validity || (data.documentType === 'ESTIMATE' || data.documentType === 'QUOTATION' ? '15 Days' : undefined),
    },
    yPos
  );

  yPos += 5;

  // ========== 4. OOH LINE ITEMS TABLE (098 Style) ==========
  // Table must always start below the header area.
  const tableStartY = Math.max(yPos, 90);

  const tableBody = data.items.map((item) => {
    // LOCATION & DESCRIPTION cell (multi-line)
    const locationDesc = [
      item.locationCode,
      `Area: ${item.area}`,
      `Media: ${item.mediaType}`,
      item.route ? `Route: ${item.route}` : null,
      item.illumination ? `Lit: ${item.illumination}` : null,
    ].filter(Boolean).join('\n');

    // SIZE cell
    const sizeCell = `Dimension: ${item.dimension}\nTotal Sqft: ${item.totalSqft}`;

    // BOOKING cell
    const bookingCell = `From: ${item.fromDate}\nTo: ${item.toDate}\nDuration: ${item.duration}`;

    return [
      item.sno.toString(),
      locationDesc,
      sizeCell,
      bookingCell,
      formatCurrencyForPDF(item.unitPrice),
      formatCurrencyForPDF(item.subtotal),
    ];
  });

  // Track page count for header rendering
  let currentPageCount = 1;
  
  autoTable(doc, {
    startY: tableStartY,
    head: [['#', 'LOCATION & DESCRIPTION', 'SIZE', 'BOOKING', 'UNIT PRICE', 'SUBTOTAL']],
    body: tableBody,
    theme: 'grid',
    styles: {
      font: 'NotoSans',
      fontSize: 8,
      textColor: [0, 0, 0],
      cellPadding: 2.5,
      overflow: 'linebreak',
      lineWidth: 0.2,
      lineColor: [200, 200, 200],
      valign: 'top',
    },
    headStyles: {
      fillColor: [240, 240, 240],
      textColor: [0, 0, 0],
      fontStyle: 'bold',
      fontSize: 8,
      halign: 'center',
      valign: 'middle',
    },
    columnStyles: {
      0: { cellWidth: 10, halign: 'center', valign: 'middle' },
      1: { cellWidth: 65 },
      2: { cellWidth: 30, halign: 'left' },
      3: { cellWidth: 35, halign: 'left' },
      4: { cellWidth: 25, halign: 'right' },
      5: { cellWidth: 25, halign: 'right' },
    },
    // CRITICAL: Reserve safe header area on EVERY page (35mm for compact header)
    // Page 1 already has header rendered, but page 2+ needs margin.top to leave room
    margin: { top: 35, left: leftMargin, right: rightMargin, bottom: PAGE_MARGINS.bottom },
    tableWidth: pageWidth - leftMargin - rightMargin,
    // CRITICAL: Prevent row splitting across pages
    rowPageBreak: 'avoid',
    // Handle page breaks properly
    didDrawPage: (hookData) => {
      // Page 2+ should ONLY have compact header (no title/address/GST)
      // Render compact header at fixed position, BEFORE table content
      if (hookData.pageNumber > 1) {
        // Clear the header area first to prevent any overlap
        doc.setFillColor(255, 255, 255);
        doc.rect(0, 0, pageWidth, 34, 'F');
        // Render compact header
        headerRenderers.compact(doc);
      }
      currentPageCount = hookData.pageNumber;
    },
  });

  // @ts-ignore - jspdf-autotable adds lastAutoTable
  yPos = doc.lastAutoTable.finalY + 10;

  // ========== 5. SUMMARY & BANK DETAILS (Side by Side, Zoho Style) ==========
  // Calculate required space dynamically based on actual content
  // Bank details: ~25mm, Summary table: ~25mm, Payment terms: ~8mm, Signatory: ~25mm
  // Terms: varies based on count (~4mm per term after wrapping)
  const termsCount = (data.terms?.length || 8);
  const estimatedTermsSpace = termsCount * 5 + 10; // ~5mm per term + header
  const requiredSpace = 25 + 25 + 8 + 25 + estimatedTermsSpace; // ~83mm for default 8 terms
  const availableSpace = pageHeight - yPos - PAGE_MARGINS.bottom;
  
  // Only add new page if absolutely necessary (less than minimum required)
  if (availableSpace < Math.min(requiredSpace, 75)) {
    doc.addPage();
    // Clear header area and render compact header
    doc.setFillColor(255, 255, 255);
    doc.rect(0, 0, pageWidth, 34, 'F');
    yPos = headerRenderers.compact(doc) + 10;
  }

  const contentWidth = pageWidth - leftMargin - rightMargin;
  const leftColWidth = contentWidth * 0.55;
  const rightColWidth = contentWidth * 0.45;
  const summaryStartX = leftMargin + leftColWidth + 5;

  // ----- LEFT SIDE: Bank Details -----
  let bankY = yPos;
  
  doc.setFontSize(10);
  doc.setFont('NotoSans', 'bold');
  doc.setTextColor(0, 0, 0);
  doc.text('Bank Details', leftMargin, bankY);
  
  bankY += 6;
  doc.setFont('NotoSans', 'normal');
  doc.setFontSize(8);
  
  doc.setFont('NotoSans', 'bold');
  doc.text(BANK_DETAILS.bankName, leftMargin, bankY);
  bankY += 4;
  
  doc.setFont('NotoSans', 'normal');
  doc.text(`Branch: ${BANK_DETAILS.branch}`, leftMargin, bankY);
  bankY += 4;
  doc.text(`Account No: ${BANK_DETAILS.accountNo}`, leftMargin, bankY);
  bankY += 4;
  doc.text(`IFSC Code: ${BANK_DETAILS.ifsc}`, leftMargin, bankY);
  bankY += 4;
  doc.text(`MICR: ${BANK_DETAILS.micr}`, leftMargin, bankY);

  // ----- RIGHT SIDE: Summary Table -----
  const summaryData = [
    ['Sub Total', formatCurrencyForPDF(data.untaxedAmount)],
    ['CGST @ 9%', formatCurrencyForPDF(data.cgst)],
    ['SGST @ 9%', formatCurrencyForPDF(data.sgst)],
  ];

  autoTable(doc, {
    startY: yPos,
    body: summaryData,
    theme: 'plain',
    styles: {
      font: 'NotoSans',
      fontSize: 9,
      cellPadding: 2,
    },
    columnStyles: {
      0: { cellWidth: 35, halign: 'left' },
      1: { cellWidth: 35, halign: 'right' },
    },
    margin: { left: summaryStartX },
    tableWidth: rightColWidth - 5,
  });

  // @ts-ignore
  let summaryEndY = doc.lastAutoTable.finalY;

  // Total row (emphasized)
  doc.setDrawColor(100, 100, 100);
  doc.setLineWidth(0.5);
  doc.line(summaryStartX, summaryEndY + 1, pageWidth - rightMargin, summaryEndY + 1);
  
  summaryEndY += 6;
  doc.setFont('NotoSans', 'bold');
  doc.setFontSize(11);
  doc.text('Total', summaryStartX, summaryEndY);
  doc.text(formatCurrencyForPDF(data.totalInr), pageWidth - rightMargin, summaryEndY, { align: 'right' });

  // Total in words
  summaryEndY += 6;
  doc.setFont('NotoSans', 'normal');
  doc.setFontSize(8);
  const totalWords = amountToWords(data.totalInr);
  // Calculate available width for amount in words (from summaryStartX to right margin)
  const amountWordsWidth = pageWidth - summaryStartX - rightMargin;
  const amountWordsText = `Total (In Words): ${totalWords}`;
  const wrappedAmountWords = doc.splitTextToSize(amountWordsText, amountWordsWidth);
  wrappedAmountWords.forEach((line: string) => {
    doc.text(line, summaryStartX, summaryEndY);
    summaryEndY += 4;
  });

  yPos = Math.max(bankY, summaryEndY) + 8;

  // ========== 6. PAYMENT TERMS ==========
  doc.setFontSize(9);
  doc.setFont('NotoSans', 'normal');
  doc.text(`Payment Terms: ${data.paymentTerms || '30 Net Days'}`, leftMargin, yPos);
  yPos += 8;

  // ========== 7. TERMS & CONDITIONS ==========
  // Calculate space needed for terms and signatory
  const termsToUse = data.terms?.length
    ? data.terms
    : [
        'Advance Payment & Purchase Order is Mandatory to start the campaign.',
        'Printing & Mounting will be extra & GST @ 18% will be applicable extra.',
        'Site available date may change in case of present display Renewal.',
        'Site Availability changes every minute, please double check site available dates when you confirm the sites.',
        'Campaign Execution takes 2 days in city and 4 days in upcountry. Please plan your campaign accordingly.',
        'Kindly ensure that your artwork is ready before confirming the sites. In case Design or Flex is undelivered within 5 days of confirmation, we will release the site.',
        'In case flex / vinyl / display material is damaged, torn or vandalised, it will be your responsibility to provide us with new flex.',
        'Renewal of site will only be entertained before 10 days of site expiry. Last moment renewal is not possible.',
      ];

  // Estimate space needed for terms (approximately 4mm per term with line breaks)
  const estimatedTermsHeight = termsToUse.length * 8 + 40; // terms + header + signatory
  const spaceForTerms = pageHeight - yPos - PAGE_MARGINS.bottom;
  
  // If not enough space for terms + signatory, add new page
  if (spaceForTerms < estimatedTermsHeight) {
    doc.addPage();
    doc.setFillColor(255, 255, 255);
    doc.rect(0, 0, pageWidth, 34, 'F');
    yPos = headerRenderers.compact(doc) + 10;
  }

  doc.setFontSize(9);
  doc.setFont('NotoSans', 'bold');
  doc.text('Terms & Conditions:', leftMargin, yPos);
  
  yPos += 6;
  doc.setFont('NotoSans', 'normal');
  doc.setFontSize(7.5);
  
  termsToUse.forEach((term, idx) => {
    // Check if we need a page break mid-terms
    if (yPos + 10 > pageHeight - PAGE_MARGINS.bottom - 30) {
      doc.addPage();
      doc.setFillColor(255, 255, 255);
      doc.rect(0, 0, pageWidth, 34, 'F');
      yPos = headerRenderers.compact(doc) + 10;
    }
    const termText = `${idx + 1}. ${term}`;
    const lines = doc.splitTextToSize(termText, pageWidth - leftMargin - rightMargin);
    lines.forEach((line: string) => {
      doc.text(line, leftMargin, yPos);
      yPos += 3.8;
    });
    yPos += 1.5;
  });

  yPos += 10;

  // ========== 8. FOOTER: AUTHORIZED SIGNATORY (RIGHT) ==========
  // Ensure minimum space for signatory block (25mm)
  if (yPos + 28 > pageHeight - PAGE_MARGINS.bottom) {
    doc.addPage();
    doc.setFillColor(255, 255, 255);
    doc.rect(0, 0, pageWidth, 34, 'F');
    yPos = headerRenderers.compact(doc) + 10;
  }

  renderSellerFooterWithSignatory(doc, { name: data.companyName, gstin: data.companyGSTIN }, yPos);

  return doc.output('blob');
}

// ============= HELPER FUNCTIONS =============

// Get state code from state name (for Place of Supply)
function getStateCode(state?: string): string {
  if (!state) return '';
  
  const stateCodes: Record<string, string> = {
    'Andhra Pradesh': '37',
    'Telangana': '36',
    'Karnataka': '29',
    'Tamil Nadu': '33',
    'Maharashtra': '27',
    'Gujarat': '24',
    'Delhi': '07',
    'Uttar Pradesh': '09',
    'West Bengal': '19',
    'Rajasthan': '08',
    'Kerala': '32',
    'Odisha': '21',
    'Bihar': '10',
    'Punjab': '03',
    'Haryana': '06',
    'Madhya Pradesh': '23',
    'Jharkhand': '20',
    'Chhattisgarh': '22',
    'Assam': '18',
    'Goa': '30',
    'Himachal Pradesh': '02',
    'Uttarakhand': '05',
    'Jammu and Kashmir': '01',
    'Chandigarh': '04',
    'Puducherry': '34',
  };
  
  return stateCodes[state] || '';
}

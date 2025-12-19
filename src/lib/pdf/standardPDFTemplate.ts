import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { formatCurrencyForPDF } from './pdfHelpers';
import { renderLogoHeader, createPageHeaderRenderer } from './sections/logoHeader';
import { renderSellerFooterWithSignatory } from './sections/authorizedSignatory';
import { ensurePdfUnicodeFont } from './fontLoader';

interface PDFDocumentData {
  documentType: 'WORK ORDER' | 'ESTIMATE' | 'QUOTATION' | 'PROFORMA INVOICE';
  documentNumber: string;
  documentDate: string;
  displayName: string;
  pointOfContact: string;

  // Client details (TO section)
  clientName: string;
  clientAddress: string;
  clientCity: string;
  clientState: string;
  clientPincode: string;
  clientGSTIN?: string;

  // Company/Seller details (FOR section - footer)
  companyName: string;
  companyGSTIN: string;
  companyPAN: string;
  companyLogoBase64?: string;

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

interface PDFLineItem {
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

// Bank details constant
const BANK_DETAILS = {
  bankName: 'HDFC Bank Limited',
  branch: 'KARKHANA ROAD, SECUNDERABAD 500009',
  accountNo: '50200010727301',
  ifsc: 'HDFC0001555',
  micr: '500240026',
};

export async function generateStandardizedPDF(data: PDFDocumentData): Promise<Blob> {
  const doc = new jsPDF('p', 'mm', 'a4');
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  // Ensure ₹ is supported
  await ensurePdfUnicodeFont(doc);

  // Re-usable page header (for multipage tables)
  const headerRenderer = createPageHeaderRenderer(
    { name: data.companyName, gstin: data.companyGSTIN, pan: data.companyPAN },
    data.documentType,
    data.companyLogoBase64
  );

  // ========== LOGO HEADER SECTION ==========
  let yPos = renderLogoHeader(
    doc,
    { name: data.companyName, gstin: data.companyGSTIN, pan: data.companyPAN },
    data.documentType,
    data.companyLogoBase64
  );

  yPos += 3;

  // ========== TWO-COLUMN SECTION: BILL TO (Left) | DOC DETAILS (Right) ==========
  const leftX = 14;
  const rightX = pageWidth - 14;
  const colMidX = pageWidth / 2;

  // Bill To Section (Left)
  doc.setFontSize(10);
  doc.setFont('NotoSans', 'bold');
  doc.text('Bill To', leftX, yPos);
  
  let billToY = yPos + 5;
  doc.setFont('NotoSans', 'normal');
  doc.setFontSize(9);
  
  doc.text(data.clientName, leftX, billToY);
  billToY += 4;
  
  if (data.clientAddress) {
    const addressLines = doc.splitTextToSize(data.clientAddress, colMidX - leftX - 10);
    addressLines.forEach((line: string) => {
      doc.text(line, leftX, billToY);
      billToY += 4;
    });
  }
  
  const cityStatePin = [data.clientCity, data.clientState, data.clientPincode]
    .filter(Boolean)
    .join(', ');
  if (cityStatePin) {
    doc.text(cityStatePin, leftX, billToY);
    billToY += 4;
  }
  
  if (data.clientGSTIN) {
    doc.setFont('NotoSans', 'bold');
    doc.text(`GSTIN: ${data.clientGSTIN}`, leftX, billToY);
    billToY += 4;
  }

  // Document Details Section (Right)
  let detailsY = yPos;
  doc.setFont('NotoSans', 'bold');
  doc.setFontSize(10);
  doc.text('Invoice Details', colMidX + 10, detailsY);
  
  detailsY += 5;
  doc.setFont('NotoSans', 'normal');
  doc.setFontSize(9);

  // Document Number Label
  let docLabel = '';
  switch (data.documentType) {
    case 'WORK ORDER': docLabel = 'WO No'; break;
    case 'ESTIMATE': docLabel = 'Estimate No'; break;
    case 'QUOTATION': docLabel = 'Quotation No'; break;
    case 'PROFORMA INVOICE': docLabel = 'PI No'; break;
  }
  doc.text(`${docLabel}: ${data.documentNumber}`, colMidX + 10, detailsY);
  detailsY += 4;

  // Date Label
  let dateLabel = '';
  switch (data.documentType) {
    case 'WORK ORDER': dateLabel = 'WO Date'; break;
    case 'ESTIMATE': dateLabel = 'Estimate Date'; break;
    case 'QUOTATION': dateLabel = 'Quotation Date'; break;
    case 'PROFORMA INVOICE': dateLabel = 'PI Date'; break;
  }
  doc.text(`${dateLabel}: ${data.documentDate}`, colMidX + 10, detailsY);
  detailsY += 4;

  doc.text(`Campaign: ${data.displayName}`, colMidX + 10, detailsY);
  detailsY += 4;
  
  if (data.pointOfContact && data.pointOfContact !== 'N/A') {
    doc.text(`Point of Contact: ${data.pointOfContact}`, colMidX + 10, detailsY);
    detailsY += 4;
  }

  yPos = Math.max(billToY, detailsY) + 8;

  // ========== 098-STYLE TABLE ==========
  // Columns: # | LOCATION & DESCRIPTION | SIZE | BOOKING | UNIT PRICE | SUBTOTAL
  const tableBody = data.items.map((item) => {
    // LOCATION & DESCRIPTION cell (multi-line)
    const locationDesc = [
      item.locationCode,
      `Area: ${item.area}`,
      `Media: ${item.mediaType}`,
      `Route: ${item.route}`,
      `Lit: ${item.illumination}`,
    ].filter(Boolean).join('\n');

    // SIZE cell
    const sizeCell = `${item.dimension}\nArea(Sft): ${item.totalSqft}`;

    // BOOKING cell
    const bookingCell = `From: ${item.fromDate}\nTo: ${item.toDate}\n${item.duration}`;

    return [
      item.sno.toString(),
      locationDesc,
      sizeCell,
      bookingCell,
      formatCurrencyForPDF(item.unitPrice).replace('₹', ''),
      formatCurrencyForPDF(item.subtotal).replace('₹', ''),
    ];
  });

  autoTable(doc, {
    startY: yPos,
    head: [['#', 'LOCATION & DESCRIPTION', 'SIZE', 'BOOKING', 'UNIT PRICE', 'SUBTOTAL']],
    body: tableBody,
    theme: 'grid',
    styles: {
      font: 'NotoSans',
      fontSize: 8,
      textColor: [0, 0, 0],
      cellPadding: 2,
      overflow: 'linebreak',
      lineWidth: 0.2,
      lineColor: [180, 180, 180],
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
      1: { cellWidth: 70 },
      2: { cellWidth: 28, halign: 'center' },
      3: { cellWidth: 35, halign: 'left' },
      4: { cellWidth: 25, halign: 'right' },
      5: { cellWidth: 25, halign: 'right' },
    },
    margin: { left: 8, right: 8 },
    didDrawPage: () => {
      headerRenderer(doc);
    },
  });

  // @ts-ignore
  yPos = doc.lastAutoTable.finalY + 8;

  // ========== PAYMENT TERMS & SUMMARY (two columns) ==========
  // Check if we need a new page
  if (yPos + 80 > pageHeight - 40) {
    doc.addPage();
    headerRenderer(doc);
    yPos = 50;
  }

  // Payment terms (left side)
  doc.setFontSize(9);
  doc.setFont('NotoSans', 'normal');
  doc.text(`Payment terms: ${data.paymentTerms || '30 Net Days'}`, leftX, yPos);
  doc.text('Looking forward for your business.', leftX, yPos + 5);

  // ========== SUMMARY (right side) ==========
  const summaryX = pageWidth - 80;
  let summaryY = yPos;

  doc.setFontSize(10);
  doc.setFont('NotoSans', 'bold');
  doc.text('Summary:', summaryX, summaryY);
  
  summaryY += 6;
  doc.setFont('NotoSans', 'normal');
  doc.setFontSize(9);
  
  doc.text('Untaxed Amount:', summaryX, summaryY);
  doc.text(formatCurrencyForPDF(data.untaxedAmount), rightX, summaryY, { align: 'right' });
  
  summaryY += 5;
  doc.text('CGST @ 9%:', summaryX, summaryY);
  doc.text(formatCurrencyForPDF(data.cgst), rightX, summaryY, { align: 'right' });
  
  summaryY += 5;
  doc.text('SGST @ 9%:', summaryX, summaryY);
  doc.text(formatCurrencyForPDF(data.sgst), rightX, summaryY, { align: 'right' });
  
  summaryY += 2;
  doc.setDrawColor(180, 180, 180);
  doc.line(summaryX, summaryY, rightX, summaryY);
  
  summaryY += 5;
  doc.setFont('NotoSans', 'bold');
  doc.setFontSize(10);
  doc.text('Total:', summaryX, summaryY);
  doc.text(formatCurrencyForPDF(data.totalInr), rightX, summaryY, { align: 'right' });
  
  summaryY += 6;
  doc.setFont('NotoSans', 'normal');
  doc.setFontSize(8);
  const totalWords = amountToWords(data.totalInr);
  const wordsLines = doc.splitTextToSize(`Total (In Words): ${totalWords}`, rightX - summaryX + 5);
  wordsLines.forEach((line: string) => {
    doc.text(line, summaryX, summaryY);
    summaryY += 4;
  });

  yPos = Math.max(yPos + 25, summaryY) + 10;

  // ========== BANK DETAILS ==========
  if (yPos + 40 > pageHeight - 50) {
    doc.addPage();
    headerRenderer(doc);
    yPos = 50;
  }

  doc.setFontSize(10);
  doc.setFont('NotoSans', 'bold');
  doc.text('Bankers Information:', leftX, yPos);
  
  yPos += 5;
  doc.setFont('NotoSans', 'normal');
  doc.setFontSize(9);
  
  doc.text(BANK_DETAILS.bankName, leftX, yPos);
  yPos += 4;
  doc.text(`Account Branch: ${BANK_DETAILS.branch}`, leftX, yPos);
  yPos += 4;
  doc.text(`Account No: ${BANK_DETAILS.accountNo}`, leftX, yPos);
  yPos += 4;
  doc.text(`RTGS/NEFT IFSC: ${BANK_DETAILS.ifsc}`, leftX, yPos);
  yPos += 4;
  doc.text(`MICR: ${BANK_DETAILS.micr}`, leftX, yPos);

  yPos += 15;

  // ========== TERMS & CONDITIONS ==========
  if (yPos + 50 > pageHeight - 40) {
    doc.addPage();
    headerRenderer(doc);
    yPos = 50;
  }

  const terms = data.terms?.length
    ? data.terms
    : [
        'Blocking of media stands for 24 hrs, post which it becomes subject to availability.',
        'Advance Payment & Purchase Order is Mandatory to start the campaign.',
        'Printing & Mounting will be extra & GST @ 18% will be applicable extra.',
        'Site available date may change in case of present display Renewal.',
        'Campaign Execution takes 2 days in city and 4 days in upcountry.',
        'In case flex/vinyl/display material is damaged, torn or vandalised, it will be your responsibility.',
        'Renewal of site will only be entertained before 10 days of site expiry.',
      ];

  doc.setFontSize(9);
  doc.setFont('NotoSans', 'bold');
  doc.text('Terms & Conditions:', leftX, yPos);
  
  yPos += 5;
  doc.setFont('NotoSans', 'normal');
  doc.setFontSize(8);
  
  terms.forEach((term, idx) => {
    if (yPos + 8 > pageHeight - 40) {
      doc.addPage();
      headerRenderer(doc);
      yPos = 50;
    }
    const termText = `${String.fromCharCode(105 + idx)}) ${term}`;
    const lines = doc.splitTextToSize(termText, pageWidth - 28);
    lines.forEach((line: string) => {
      doc.text(line, leftX, yPos);
      yPos += 4;
    });
  });

  yPos += 10;

  // ========== FOOTER: AUTHORIZED SIGNATORY (RIGHT) ==========
  if (yPos + 35 > pageHeight - 10) {
    doc.addPage();
    headerRenderer(doc);
    yPos = 50;
  }

  renderSellerFooterWithSignatory(doc, { name: data.companyName, gstin: data.companyGSTIN }, yPos);

  return doc.output('blob');
}

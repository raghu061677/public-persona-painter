import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { ensurePdfUnicodeFont } from '@/lib/pdf/fontLoader';
import { formatCurrencyForPDF } from '@/lib/pdf/pdfHelpers';
import stampImageUrl from '@/assets/branding/stamp_matrix.png';

// ============= INTERFACES =============

export interface ROData {
  planId: string;
  planName: string;
  createdAt: string;
  startDate: string;
  endDate: string;
  city?: string;

  // Client (Issued By)
  clientName: string;
  clientAddress: string;
  clientCity: string;
  clientState: string;
  clientPincode: string;
  clientGSTIN?: string;
  clientContactPerson: string;
  clientPhone?: string;
  clientEmail?: string;

  // Company (Service Provider)
  companyName: string;
  companyAddress: string;
  companyGSTIN: string;
  companyLogoBase64?: string;

  // Line items
  items: ROLineItem[];

  // Totals
  subTotal: number;
  totalPrinting: number;
  totalMounting: number;
  cgst: number;
  sgst: number;
  grandTotal: number;

  // Terms
  terms?: string[];

  // Stamp image as base64 data URL
  stampImageBase64?: string;
}

export interface ROLineItem {
  sno: number;
  assetCode: string;
  location: string;
  area: string;
  mediaType: string;
  dimension: string;
  startDate: string;
  endDate: string;
  duration: string;
  rate: number;
  amount: number;
  printingCost: number;
  mountingCost: number;
}

// ============= CONSTANTS =============

const MARGINS = { top: 15, left: 14, right: 14, bottom: 15 };

const SERVICE_PROVIDER = {
  name: 'Matrix Network Solutions',
  address: [
    'H.No: 7-1-19/5/201',
    'Jyothi Bhopal Apartments',
    'Near Begumpet Metro Station',
    'Opp Country Club, Begumpet',
    'Hyderabad – 500016',
  ],
  gstin: '36AATFM4107H2Z3',
};

const DEFAULT_RO_TERMS = [
  'Advance Payment & Purchase Order is Mandatory to start the campaign.',
  'Printing & Mounting will be extra & GST @ 18% will be applicable extra.',
  'Site available date may change in case of present display Renewal.',
  'Site Availability changes every minute, please double check site available dates when you confirm the sites.',
  'Campaign Execution takes 2 days in city and 4 days in upcountry.',
  'Artwork must be ready before confirming the sites. Undelivered flex within 5 days will result in site release.',
  'Damaged flex/vinyl is the client\'s responsibility to replace.',
  'Renewal requests must be made at least 10 days before site expiry.',
];

// ============= HELPERS =============

function formatDateDD_MM_YYYY(dateString: string): string {
  if (!dateString) return '-';
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return '-';
    return `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getFullYear()}`;
  } catch {
    return '-';
  }
}

function getDurationDisplay(days: number): string {
  if (days <= 0) return '-';
  if (days >= 28 && days <= 31) return '1 Month';
  if (days > 31) {
    const months = Math.round(days / 30);
    return `${months} Month${months > 1 ? 's' : ''}`;
  }
  return `${days} Days`;
}

function numberToWords(num: number): string {
  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
    'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
  if (num === 0) return 'Zero';
  if (num < 0) return 'Minus ' + numberToWords(Math.abs(num));
  let words = '';
  const crore = Math.floor(num / 10000000); num %= 10000000;
  const lakh = Math.floor(num / 100000); num %= 100000;
  const thousand = Math.floor(num / 1000); num %= 1000;
  const hundred = Math.floor(num / 100); num %= 100;
  if (crore > 0) words += numberToWords(crore) + ' Crore ';
  if (lakh > 0) words += numberToWords(lakh) + ' Lakh ';
  if (thousand > 0) words += numberToWords(thousand) + ' Thousand ';
  if (hundred > 0) words += ones[hundred] + ' Hundred ';
  if (num > 0) {
    if (words !== '') words += 'And ';
    if (num < 20) words += ones[num];
    else { words += tens[Math.floor(num / 10)]; if (num % 10 > 0) words += '-' + ones[num % 10]; }
  }
  return words.trim();
}

async function loadImageAsBase64(url: string): Promise<string | undefined> {
  try {
    const res = await fetch(url);
    if (!res.ok) return undefined;
    const blob = await res.blob();
    return await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch {
    return undefined;
  }
}

// ============= MAIN GENERATOR =============

export async function generateReleaseOrderPDF(data: ROData): Promise<Blob> {
  const doc = new jsPDF('p', 'mm', 'a4');
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const contentWidth = pageWidth - MARGINS.left - MARGINS.right;

  await ensurePdfUnicodeFont(doc);

  // Load stamp image
  let stampBase64 = data.stampImageBase64;
  if (!stampBase64) {
    stampBase64 = await loadImageAsBase64(stampImageUrl);
  }

  let yPos = MARGINS.top;

  // ========== HEADER ==========
  yPos = renderROHeader(doc, data, pageWidth, yPos);

  // ========== SECTION 1: ISSUED BY (CLIENT) ==========
  yPos = renderIssuedBySection(doc, data, pageWidth, yPos);

  // ========== SECTION 2: SERVICE PROVIDER ==========
  yPos = renderServiceProviderSection(doc, data, pageWidth, yPos);

  // ========== SECTION 3: CAMPAIGN ASSET TABLE ==========
  yPos = renderAssetTable(doc, data, pageWidth, yPos);

  // ========== SECTION 4: COMMERCIAL SUMMARY ==========
  yPos = renderCommercialSummary(doc, data, pageWidth, yPos);

  // ========== SECTION 5: TERMS & CONDITIONS ==========
  yPos = renderTermsSection(doc, data, pageWidth, pageHeight, yPos);

  // ========== SECTION 6: AUTHORIZATION ==========
  renderAuthorizationSection(doc, data, pageWidth, pageHeight, yPos, stampBase64);

  return doc.output('blob');
}

// ============= SECTION RENDERERS =============

function renderROHeader(doc: jsPDF, data: ROData, pageWidth: number, yPos: number): number {
  const leftMargin = MARGINS.left;
  const rightEdge = pageWidth - MARGINS.right;

  // Company logo (if available)
  if (data.companyLogoBase64) {
    try {
      doc.addImage(data.companyLogoBase64, 'PNG', leftMargin, yPos, 25, 25);
    } catch { /* ignore */ }
  }

  const headerX = data.companyLogoBase64 ? leftMargin + 30 : leftMargin;

  // Title
  doc.setFont('NotoSans', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(30, 64, 175); // Deep Blue
  doc.text('RELEASE ORDER (RO)', headerX, yPos + 8);

  // Horizontal line
  yPos += 14;
  doc.setDrawColor(30, 64, 175);
  doc.setLineWidth(0.8);
  doc.line(leftMargin, yPos, rightEdge, yPos);
  yPos += 6;

  // Document details row
  doc.setFontSize(9);
  doc.setTextColor(0, 0, 0);
  doc.setFont('NotoSans', 'bold');

  const detailsCol1X = leftMargin;
  const detailsCol2X = leftMargin + 70;
  const detailsCol3X = leftMargin + 130;

  doc.text('Release Order No:', detailsCol1X, yPos);
  doc.setFont('NotoSans', 'normal');
  doc.text(`RO-${data.planId}`, detailsCol1X + 35, yPos);

  doc.setFont('NotoSans', 'bold');
  doc.text('Date:', detailsCol2X, yPos);
  doc.setFont('NotoSans', 'normal');
  doc.text(formatDateDD_MM_YYYY(data.createdAt), detailsCol2X + 12, yPos);

  doc.setFont('NotoSans', 'bold');
  doc.text('City:', detailsCol3X, yPos);
  doc.setFont('NotoSans', 'normal');
  doc.text(data.city || '-', detailsCol3X + 12, yPos);

  yPos += 5;

  doc.setFont('NotoSans', 'bold');
  doc.text('Campaign:', detailsCol1X, yPos);
  doc.setFont('NotoSans', 'normal');
  const campaignName = data.planName || data.planId;
  doc.text(campaignName.substring(0, 50), detailsCol1X + 22, yPos);

  doc.setFont('NotoSans', 'bold');
  doc.text('Period:', detailsCol2X, yPos);
  doc.setFont('NotoSans', 'normal');
  doc.text(`${formatDateDD_MM_YYYY(data.startDate)} to ${formatDateDD_MM_YYYY(data.endDate)}`, detailsCol2X + 15, yPos);

  yPos += 8;
  return yPos;
}

function renderIssuedBySection(doc: jsPDF, data: ROData, pageWidth: number, yPos: number): number {
  const leftMargin = MARGINS.left;
  const rightEdge = pageWidth - MARGINS.right;
  const boxWidth = (rightEdge - leftMargin);

  // Section header
  doc.setFillColor(240, 245, 255); // Light blue background
  doc.rect(leftMargin, yPos, boxWidth, 7, 'F');
  doc.setFont('NotoSans', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(30, 64, 175);
  doc.text('SECTION 1: ISSUED BY (CLIENT / AGENCY)', leftMargin + 3, yPos + 5);
  yPos += 10;

  // Client details in a bordered box
  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.3);
  const boxStartY = yPos;
  
  doc.setFont('NotoSans', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(0, 0, 0);

  const labelX = leftMargin + 3;
  const valueX = leftMargin + 40;

  const drawField = (label: string, value: string) => {
    doc.setFont('NotoSans', 'bold');
    doc.text(label, labelX, yPos);
    doc.setFont('NotoSans', 'normal');
    doc.text(value || '-', valueX, yPos);
    yPos += 5;
  };

  drawField('Company:', data.clientName);
  
  const fullAddress = [data.clientAddress, data.clientCity, data.clientState, data.clientPincode].filter(Boolean).join(', ');
  drawField('Address:', fullAddress.substring(0, 80));
  if (fullAddress.length > 80) {
    doc.text(fullAddress.substring(80), valueX, yPos);
    yPos += 5;
  }
  
  drawField('GSTIN:', data.clientGSTIN || 'N/A');
  drawField('Contact:', data.clientContactPerson);
  
  if (data.clientPhone) drawField('Mobile:', data.clientPhone);
  if (data.clientEmail) drawField('Email:', data.clientEmail);

  // Draw box
  doc.rect(leftMargin, boxStartY - 3, boxWidth, yPos - boxStartY + 5, 'S');
  yPos += 5;
  return yPos;
}

function renderServiceProviderSection(doc: jsPDF, data: ROData, pageWidth: number, yPos: number): number {
  const leftMargin = MARGINS.left;
  const rightEdge = pageWidth - MARGINS.right;
  const boxWidth = rightEdge - leftMargin;

  // Section header
  doc.setFillColor(240, 255, 245); // Light green background
  doc.rect(leftMargin, yPos, boxWidth, 7, 'F');
  doc.setFont('NotoSans', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(16, 185, 129); // Emerald
  doc.text('SECTION 2: SERVICE PROVIDER (MEDIA OWNER)', leftMargin + 3, yPos + 5);
  yPos += 10;

  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.3);
  const boxStartY = yPos;

  doc.setFontSize(9);
  doc.setTextColor(0, 0, 0);

  const labelX = leftMargin + 3;
  const valueX = leftMargin + 40;

  doc.setFont('NotoSans', 'bold');
  doc.text('Company:', labelX, yPos);
  doc.setFont('NotoSans', 'normal');
  doc.text(data.companyName || SERVICE_PROVIDER.name, valueX, yPos);
  yPos += 5;

  doc.setFont('NotoSans', 'bold');
  doc.text('Address:', labelX, yPos);
  doc.setFont('NotoSans', 'normal');
  
  const address = data.companyAddress || SERVICE_PROVIDER.address.join(', ');
  const addressLines = doc.splitTextToSize(address, pageWidth - valueX - MARGINS.right);
  addressLines.forEach((line: string) => {
    doc.text(line, valueX, yPos);
    yPos += 4.5;
  });

  doc.setFont('NotoSans', 'bold');
  doc.text('GSTIN:', labelX, yPos);
  doc.setFont('NotoSans', 'normal');
  doc.text(data.companyGSTIN || SERVICE_PROVIDER.gstin, valueX, yPos);
  yPos += 5;

  doc.rect(leftMargin, boxStartY - 3, boxWidth, yPos - boxStartY + 3, 'S');
  yPos += 5;
  return yPos;
}

function renderAssetTable(doc: jsPDF, data: ROData, pageWidth: number, yPos: number): number {
  const leftMargin = MARGINS.left;
  const rightEdge = pageWidth - MARGINS.right;

  // Section header
  doc.setFillColor(245, 245, 250);
  doc.rect(leftMargin, yPos, rightEdge - leftMargin, 7, 'F');
  doc.setFont('NotoSans', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(30, 64, 175);
  doc.text('SECTION 3: MEDIA RELEASE DETAILS', leftMargin + 3, yPos + 5);
  yPos += 10;

  const tableBody = data.items.map(item => [
    String(item.sno),
    item.assetCode,
    `${item.location}\n${item.area}`,
    item.mediaType,
    item.dimension,
    item.startDate,
    item.endDate,
    item.duration,
    formatCurrencyForPDF(item.rate),
    formatCurrencyForPDF(item.amount),
  ]);

  autoTable(doc, {
    startY: yPos,
    head: [[
      'S.No', 'Site Code', 'Location', 'Media Type', 'Size',
      'From', 'To', 'Duration', 'Rate', 'Amount',
    ]],
    body: tableBody,
    theme: 'grid',
    styles: {
      font: 'NotoSans',
      fontSize: 7.5,
      cellPadding: 2,
      lineColor: [200, 200, 200],
      lineWidth: 0.3,
    },
    headStyles: {
      fillColor: [30, 64, 175],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 7.5,
      halign: 'center',
    },
    columnStyles: {
      0: { cellWidth: 10, halign: 'center' },
      1: { cellWidth: 20, halign: 'center' },
      2: { cellWidth: 42 },
      3: { cellWidth: 20 },
      4: { cellWidth: 18, halign: 'center' },
      5: { cellWidth: 20, halign: 'center' },
      6: { cellWidth: 20, halign: 'center' },
      7: { cellWidth: 16, halign: 'center' },
      8: { cellWidth: 18, halign: 'right' },
      9: { cellWidth: 18, halign: 'right' },
    },
    margin: { left: leftMargin, right: MARGINS.right },
  });

  // @ts-ignore
  yPos = doc.lastAutoTable.finalY + 5;
  return yPos;
}

function renderCommercialSummary(doc: jsPDF, data: ROData, pageWidth: number, yPos: number): number {
  const leftMargin = MARGINS.left;
  const rightEdge = pageWidth - MARGINS.right;

  // Section header
  doc.setFillColor(255, 248, 240);
  doc.rect(leftMargin, yPos, rightEdge - leftMargin, 7, 'F');
  doc.setFont('NotoSans', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(180, 100, 0);
  doc.text('SECTION 4: COMMERCIAL SUMMARY', leftMargin + 3, yPos + 5);
  yPos += 12;

  const summaryX = pageWidth - MARGINS.right - 80;
  const labelX = summaryX;
  const valueX = pageWidth - MARGINS.right;

  const drawSummaryLine = (label: string, value: number, bold = false) => {
    doc.setFont('NotoSans', bold ? 'bold' : 'normal');
    doc.setFontSize(9);
    doc.text(label, labelX, yPos);
    doc.text(formatCurrencyForPDF(value), valueX, yPos, { align: 'right' });
    yPos += 5.5;
  };

  drawSummaryLine('Sub Total (Rent):', data.subTotal);
  drawSummaryLine('Printing Charges:', data.totalPrinting);
  drawSummaryLine('Mounting Charges:', data.totalMounting);
  
  // Separator
  doc.setDrawColor(150, 150, 150);
  doc.setLineWidth(0.3);
  doc.line(labelX, yPos - 2, valueX, yPos - 2);
  
  const taxableAmount = data.subTotal + data.totalPrinting + data.totalMounting;
  drawSummaryLine('Taxable Amount:', taxableAmount);
  drawSummaryLine('CGST @ 9%:', data.cgst);
  drawSummaryLine('SGST @ 9%:', data.sgst);

  // Grand Total separator
  doc.setDrawColor(30, 64, 175);
  doc.setLineWidth(0.5);
  doc.line(labelX, yPos - 2, valueX, yPos - 2);

  doc.setFontSize(11);
  drawSummaryLine('GRAND TOTAL:', data.grandTotal, true);

  // Total in words
  yPos += 2;
  doc.setFont('NotoSans', 'normal');
  doc.setFontSize(8);
  const totalWords = `${numberToWords(Math.floor(data.grandTotal))} Rupees Only`;
  doc.text(`Amount in Words: ${totalWords}`, leftMargin, yPos);

  yPos += 8;
  return yPos;
}

function renderTermsSection(doc: jsPDF, data: ROData, pageWidth: number, pageHeight: number, yPos: number): number {
  const leftMargin = MARGINS.left;
  const terms = data.terms?.length ? data.terms : DEFAULT_RO_TERMS;

  // Check page space
  const estimatedHeight = terms.length * 8 + 60;
  if (yPos + estimatedHeight > pageHeight - MARGINS.bottom) {
    doc.addPage();
    yPos = MARGINS.top;
  }

  doc.setFont('NotoSans', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(0, 0, 0);
  doc.text('Terms & Conditions:', leftMargin, yPos);
  yPos += 6;

  doc.setFont('NotoSans', 'normal');
  doc.setFontSize(7.5);

  terms.forEach((term, idx) => {
    if (yPos + 10 > pageHeight - MARGINS.bottom - 40) {
      doc.addPage();
      yPos = MARGINS.top;
    }
    const termText = `${idx + 1}. ${term}`;
    const lines = doc.splitTextToSize(termText, pageWidth - leftMargin - MARGINS.right);
    lines.forEach((line: string) => {
      doc.text(line, leftMargin, yPos);
      yPos += 3.8;
    });
    yPos += 1.5;
  });

  yPos += 8;
  return yPos;
}

function renderAuthorizationSection(
  doc: jsPDF,
  data: ROData,
  pageWidth: number,
  pageHeight: number,
  yPos: number,
  stampBase64?: string,
): void {
  const leftMargin = MARGINS.left;
  const rightEdge = pageWidth - MARGINS.right;
  const contentWidth = rightEdge - leftMargin;

  // Need at least 60mm for authorization section
  if (yPos + 60 > pageHeight - MARGINS.bottom) {
    doc.addPage();
    yPos = MARGINS.top;
  }

  // Divider
  doc.setDrawColor(30, 64, 175);
  doc.setLineWidth(0.5);
  doc.line(leftMargin, yPos, rightEdge, yPos);
  yPos += 5;

  const halfWidth = contentWidth / 2 - 5;
  const leftBoxX = leftMargin;
  const rightBoxX = leftMargin + halfWidth + 10;
  const boxHeight = 55;

  // ---- LEFT BOX: Issued By (Client) ----
  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.3);
  doc.rect(leftBoxX, yPos, halfWidth, boxHeight, 'S');

  doc.setFont('NotoSans', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(0, 0, 0);
  doc.text('Issued By (Client)', leftBoxX + 3, yPos + 6);

  doc.setFont('NotoSans', 'normal');
  doc.setFontSize(8);
  doc.text(data.clientName, leftBoxX + 3, yPos + 13);

  // Signature line
  doc.setDrawColor(150, 150, 150);
  doc.line(leftBoxX + 3, yPos + 35, leftBoxX + halfWidth - 3, yPos + 35);
  
  doc.setFontSize(7.5);
  doc.text('Signature & Company Seal', leftBoxX + 3, yPos + 40);
  doc.text('Date: _______________', leftBoxX + 3, yPos + 48);

  // ---- RIGHT BOX: Accepted By (Media Owner) ----
  doc.rect(rightBoxX, yPos, halfWidth, boxHeight, 'S');

  doc.setFont('NotoSans', 'bold');
  doc.setFontSize(9);
  doc.text('Accepted By (Media Owner)', rightBoxX + 3, yPos + 6);

  doc.setFont('NotoSans', 'normal');
  doc.setFontSize(8);
  doc.text(data.companyName || SERVICE_PROVIDER.name, rightBoxX + 3, yPos + 13);

  // Stamp image in right box
  if (stampBase64) {
    try {
      const stampSize = 28;
      const stampX = rightBoxX + halfWidth - stampSize - 5;
      const stampY = yPos + 15;
      doc.addImage(stampBase64, 'PNG', stampX, stampY, stampSize, stampSize);
    } catch (e) {
      console.warn('Failed to embed stamp image:', e);
    }
  }

  // Signature line (right box)
  doc.setDrawColor(150, 150, 150);
  doc.line(rightBoxX + 3, yPos + 35, rightBoxX + halfWidth - 35, yPos + 35);
  
  doc.setFontSize(7.5);
  doc.text('Authorized Signatory', rightBoxX + 3, yPos + 40);
  doc.text('Date: _______________', rightBoxX + 3, yPos + 48);
}
